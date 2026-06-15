import { NextRequest, NextResponse } from 'next/server';
import { BillService } from '@/lib/services/BillService';
import { z } from 'zod';

const billService = BillService();

// Схема валидации создания счета
const CreateBillSchema = z.object({
  venueId: z.string().uuid(),
  tableId: z.string().uuid(),
  externalId: z.string().optional(),
});

// Схема валидации обновления счета
const UpdateBillSchema = z.object({
  status: z.enum(['open', 'closed']).optional(),
  externalId: z.string().optional(),
});

// Схема валидации добавления позиции
const AddBillItemSchema = z.object({
  name: z.string().min(1).max(200),
  unitPrice: z.number().int().nonnegative(),
  quantity: z.number().int().positive().default(1),
  externalId: z.string().optional(),
});

// GET /api/bills?tableId=...&venueId=...&status=... - получение счетов
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get('tableId');
    const venueId = searchParams.get('venueId');
    const status = searchParams.get('status');

    // В реальной реализации здесь был бы сложный запрос с фильтрами
    // Для упрощения возвращаем только открытый счет для столика, если указан tableId
    if (tableId) {
      const bill = await billService.getOpenBillForTable(tableId);
      if (!bill) {
        return NextResponse.json({ bill: null });
      }
      const result = await billService.getWithItems(bill.id);
      return NextResponse.json({ bill: result });
    }

    // Если venueId, возвращаем все счета заведения (упрощенно)
    if (venueId) {
      // В реальности нужен метод listByVenue, но для MVP пропустим
      return NextResponse.json({ bills: [] });
    }

    return NextResponse.json(
      { error: 'Provide tableId or venueId' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching bills:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/bills - создание нового счета
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateBillSchema.parse(body);
    const bill = await billService.create(validated);
    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating bill:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

