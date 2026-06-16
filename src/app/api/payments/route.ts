import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/services/PaymentService';
import { BillService } from '@/lib/services/BillService';
import { TableService } from '@/lib/services/TableService';
import { IntegrationService } from '@/lib/services/IntegrationService';
import { createPOSAdapter } from '@/lib/integrations/POSAdapter';
import { notifyPaymentSucceeded, notifyBillClosed } from '@/lib/telegram-bot/notifications';
import { z } from 'zod';

const paymentService = PaymentService();
const billService = BillService();

// Схема валидации создания платежа
const CreatePaymentSchema = z.object({
  billId: z.string().uuid(),
  itemIds: z.array(z.string().uuid()).min(1),
  tipAmount: z.number().int().nonnegative().default(0),
  guestName: z.string().optional(),
  telegramUserId: z.number().optional(),
  paymentMethod: z.string().optional(),
  paymentProvider: z.string().optional(),
  providerPaymentId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// POST /api/payments - создание платежа (гостевой поток)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreatePaymentSchema.parse(body);

    // Получаем счет и проверяем его существование
    const bill = await billService.getById(validated.billId);
    if (!bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    // Проверяем, что счет открыт
    if (bill.status !== 'open') {
      return NextResponse.json(
        { error: 'Bill is not open' },
        { status: 400 }
      );
    }

    // Получаем позиции счета
    const items = await billService.listItems(bill.id, 'unpaid');
    const selectedItems = items.filter(item => validated.itemIds.includes(item.id));
    if (selectedItems.length !== validated.itemIds.length) {
      return NextResponse.json(
        { error: 'Some items not found or already paid' },
        { status: 400 }
      );
    }

    // Рассчитываем сумму позиций
    const itemSubtotal = selectedItems.reduce(
      (sum, item) => sum + (item.unitPrice * item.quantity),
      0
    );
    const totalAmount = itemSubtotal + validated.tipAmount;

    // Создаем платеж
    const payment = await paymentService.create({
      billId: validated.billId,
      itemSubtotal,
      tipAmount: validated.tipAmount,
      totalAmount,
      telegramUserId: validated.telegramUserId,
      guestName: validated.guestName,
      paymentMethod: validated.paymentMethod,
      paymentProvider: validated.paymentProvider,
      providerPaymentId: validated.providerPaymentId,
      metadata: validated.metadata,
    }, selectedItems.map(item => ({
      billItemId: item.id,
      amountAtPayment: item.unitPrice,
    })));

    // Помечаем позиции как оплаченные
    await billService.markItemsAsPaid(
      selectedItems.map(item => item.id),
      payment.id,
      validated.guestName,
      validated.telegramUserId
    );

    // Создаем событие интеграции для синхронизации с POS
    const integrationService = IntegrationService(createPOSAdapter('stub', {}));
    await integrationService.createEvent({
      venueId: bill.venueId,
      type: 'payment_succeeded',
      payload: {
        paymentId: payment.id,
        billId: bill.id,
        tableId: bill.tableId,
        amount: totalAmount,
        items: selectedItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
    });

    // Уведомление администратора
    const tableService = TableService();
    const table = await tableService.getById(bill.tableId);
    const tableLabel = table?.label || bill.tableId;

    await notifyPaymentSucceeded(bill.id, payment.id, tableLabel, totalAmount, validated.guestName);

    // Если все позиции оплачены — уведомляем о закрытии счёта
    const remainingUnpaid = await billService.listItems(bill.id, 'unpaid');
    if (remainingUnpaid.length === 0) {
      await notifyBillClosed(bill.id, tableLabel, totalAmount);
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/payments?billId=... - получение платежей по счету
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('billId');
    if (!billId) {
      return NextResponse.json(
        { error: 'billId query parameter is required' },
        { status: 400 }
      );
    }

    const payments = await paymentService.listByBill(billId);
    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
