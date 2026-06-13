import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { payments, paymentItems, type Payment, type NewPayment, type PaymentItem, type NewPaymentItem } from '../db/schema';
import { z } from 'zod';

// Валидация входных данных
const CreatePaymentSchema = z.object({
  billId: z.string().uuid(),
  itemSubtotal: z.number().int().nonnegative(),
  tipAmount: z.number().int().nonnegative().default(0),
  totalAmount: z.number().int().positive(),
  telegramUserId: z.number().optional(),
  guestName: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentProvider: z.string().optional(),
  providerPaymentId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const UpdatePaymentSchema = z.object({
  status: z.enum(['pending', 'succeeded', 'failed', 'refunded']).optional(),
  providerPaymentId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const AddPaymentItemsSchema = z.array(z.object({
  billItemId: z.string().uuid(),
  amountAtPayment: z.number().int().positive(),
}));

type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
type UpdatePaymentInput = z.infer<typeof UpdatePaymentSchema>;
type AddPaymentItemsInput = z.infer<typeof AddPaymentItemsSchema>;

export function PaymentService() {
  return {
    // Создание платежа
    async create(input: CreatePaymentInput, items?: AddPaymentItemsInput): Promise<Payment> {
      const validated = CreatePaymentSchema.parse(input);
      const [payment] = await db.insert(payments).values({
        id: crypto.randomUUID(),
        ...validated,
      }).returning();

      // Добавление связей с позициями, если переданы
      if (items && items.length > 0) {
        const validatedItems = AddPaymentItemsSchema.parse(items);
        await db.insert(paymentItems).values(
          validatedItems.map(item => ({
            paymentId: payment.id,
            billItemId: item.billItemId,
            amountAtPayment: item.amountAtPayment,
          }))
        );
      }

      return payment;
    },

    // Обновление платежа
    async update(id: string, input: UpdatePaymentInput): Promise<Payment | null> {
      const validated = UpdatePaymentSchema.parse(input);
      const [updated] = await db.update(payments)
        .set({
          ...validated,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, id))
        .returning();
      return updated || null;
    },

    // Получение платежа по ID
    async getById(id: string): Promise<Payment | null> {
      const [payment] = await db.select().from(payments).where(eq(payments.id, id));
      return payment || null;
    },

    // Получение платежа с позициями
    async getWithItems(id: string): Promise<{ payment: Payment; items: PaymentItem[] } | null> {
      const payment = await this.getById(id);
      if (!payment) return null;
      const items = await db.select().from(paymentItems).where(eq(paymentItems.paymentId, id));
      return { payment, items };
    },

    // Получение платежей по счету
    async listByBill(billId: string): Promise<Payment[]> {
      return db.select().from(payments)
        .where(eq(payments.billId, billId))
        .orderBy(desc(payments.createdAt));
    },

    // Обновление статуса платежа
    async setStatus(id: string, status: 'pending' | 'succeeded' | 'failed' | 'refunded'): Promise<Payment | null> {
      const [updated] = await db.update(payments)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, id))
        .returning();
      return updated || null;
    },

    // Добавление позиций к платежу
    async addItems(paymentId: string, items: AddPaymentItemsInput): Promise<number> {
      const validated = AddPaymentItemsSchema.parse(items);
      const values = validated.map(item => ({
        paymentId,
        billItemId: item.billItemId,
        amountAtPayment: item.amountAtPayment,
      }));
      await db.insert(paymentItems).values(values);
      return values.length;
    },

    // Удаление позиций платежа
    async removeItems(paymentId: string, billItemIds: string[]): Promise<number> {
      if (billItemIds.length === 0) return 0;
      await db.delete(paymentItems)
        .where(and(
          eq(paymentItems.paymentId, paymentId),
          sql`${paymentItems.billItemId} IN ${billItemIds}`
        ));
      return billItemIds.length;
    },

    // Расчет статистики по платежам для счета
    async getBillSummary(billId: string): Promise<{
      totalPaid: number;
      totalTips: number;
      paymentCount: number;
    }> {
      const result = await db.select({
        totalPaid: sql<number>`sum(${payments.totalAmount})`,
        totalTips: sql<number>`sum(${payments.tipAmount})`,
        paymentCount: sql<number>`count(*)`,
      }).from(payments)
        .where(and(
          eq(payments.billId, billId),
          eq(payments.status, 'succeeded')
        ));
      return {
        totalPaid: result[0]?.totalPaid || 0,
        totalTips: result[0]?.totalTips || 0,
        paymentCount: result[0]?.paymentCount || 0,
      };
    },

    // Проверка, можно ли вернуть платеж (только успешные платежи)
    async canRefund(paymentId: string): Promise<boolean> {
      const payment = await this.getById(paymentId);
      return payment?.status === 'succeeded';
    },

    // Возврат платежа
    async refund(paymentId: string): Promise<Payment | null> {
      const canRefund = await this.canRefund(paymentId);
      if (!canRefund) return null;
      const [updated] = await db.update(payments)
        .set({
          status: 'refunded',
          updatedAt: new Date(),
        })
        .where(eq(payments.id, paymentId))
        .returning();
      return updated || null;
    },
  };
}

export type PaymentServiceType = ReturnType<typeof PaymentService>;
