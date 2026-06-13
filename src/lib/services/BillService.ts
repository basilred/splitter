import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { bills, billItems, type Bill, type NewBill, type BillItem, type NewBillItem } from '../db/schema';
import { z } from 'zod';

// Валидация входных данных
const CreateBillSchema = z.object({
  venueId: z.string().uuid(),
  tableId: z.string().uuid(),
  externalId: z.string().optional(),
});

const UpdateBillSchema = z.object({
  status: z.enum(['open', 'closed']).optional(),
  externalId: z.string().optional(),
});

const AddBillItemSchema = z.object({
  name: z.string().min(1).max(200),
  unitPrice: z.number().int().nonnegative(), // в копейках/центах
  quantity: z.number().int().positive().default(1),
  externalId: z.string().optional(),
});

type CreateBillInput = z.infer<typeof CreateBillSchema>;
type UpdateBillInput = z.infer<typeof UpdateBillSchema>;
type AddBillItemInput = z.infer<typeof AddBillItemSchema>;

export function BillService() {
  return {
    // Создание счета
    async create(input: CreateBillInput): Promise<Bill> {
      const validated = CreateBillSchema.parse(input);
      const [bill] = await db.insert(bills).values({
        id: crypto.randomUUID(),
        venueId: validated.venueId,
        tableId: validated.tableId,
        externalId: validated.externalId,
      }).returning();
      return bill;
    },

    // Обновление счета
    async update(id: string, input: UpdateBillInput): Promise<Bill | null> {
      const validated = UpdateBillSchema.parse(input);
      const [updated] = await db.update(bills)
        .set({
          ...validated,
          updatedAt: new Date(),
        })
        .where(eq(bills.id, id))
        .returning();
      return updated || null;
    },

    // Получение счета по ID
    async getById(id: string): Promise<Bill | null> {
      const [bill] = await db.select().from(bills).where(eq(bills.id, id));
      return bill || null;
    },

    // Получение счета с позициями
    async getWithItems(id: string): Promise<{ bill: Bill; items: BillItem[] } | null> {
      const bill = await this.getById(id);
      if (!bill) return null;
      const items = await db.select().from(billItems).where(eq(billItems.billId, id));
      return { bill, items };
    },

    // Получение открытого счета для столика
    async getOpenBillForTable(tableId: string): Promise<Bill | null> {
      const [bill] = await db.select().from(bills)
        .where(and(eq(bills.tableId, tableId), eq(bills.status, 'open')))
        .orderBy(desc(bills.openedAt))
        .limit(1);
      return bill || null;
    },

    // Закрытие счета
    async close(id: string): Promise<Bill | null> {
      const [updated] = await db.update(bills)
        .set({
          status: 'closed',
          closedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bills.id, id))
        .returning();
      return updated || null;
    },

    // Добавление позиции в счет
    async addItem(billId: string, input: AddBillItemInput): Promise<BillItem> {
      const validated = AddBillItemSchema.parse(input);
      const [item] = await db.insert(billItems).values({
        id: crypto.randomUUID(),
        billId,
        name: validated.name,
        unitPrice: validated.unitPrice,
        quantity: validated.quantity,
        externalId: validated.externalId,
      }).returning();
      return item;
    },

    // Обновление позиции
    async updateItem(itemId: string, data: Partial<AddBillItemInput>): Promise<BillItem | null> {
      const [updated] = await db.update(billItems)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(billItems.id, itemId))
        .returning();
      return updated || null;
    },

    // Удаление позиции
    async deleteItem(itemId: string): Promise<boolean> {
      await db.delete(billItems).where(eq(billItems.id, itemId));
      return true;
    },

    // Получение позиций счета
    async listItems(billId: string, status?: 'unpaid' | 'paid'): Promise<BillItem[]> {
      const conditions = [eq(billItems.billId, billId)];
      if (status) {
        conditions.push(eq(billItems.status, status));
      }
      return db.select().from(billItems).where(and(...conditions));
    },

    // Расчет общей суммы неоплаченных позиций
    async calculateUnpaidTotal(billId: string): Promise<number> {
      const result = await db.select({
        total: sql<number>`sum(${billItems.unitPrice} * ${billItems.quantity})`,
      }).from(billItems)
        .where(and(eq(billItems.billId, billId), eq(billItems.status, 'unpaid')));
      return result[0]?.total || 0;
    },

    // Пометить позиции как оплаченные
    async markItemsAsPaid(itemIds: string[], paymentId: string, guestName?: string, telegramId?: number): Promise<number> {
      const [result] = await db.update(billItems)
        .set({
          status: 'paid',
          paidAt: new Date(),
          paymentId,
          paidByGuestName: guestName,
          paidByTelegramId: telegramId,
          updatedAt: new Date(),
        })
        .where(and(
          eq(billItems.status, 'unpaid'),
          sql`${billItems.id} IN ${itemIds}`
        ))
        .returning({ count: sql<number>`count(*)` });
      return result?.count || 0;
    },
  };
}

export type BillServiceType = ReturnType<typeof BillService>;
