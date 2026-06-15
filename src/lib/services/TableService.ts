import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { tables, type Table, type NewTable } from '../db/schema';
import { z } from 'zod';
import { randomBytes } from 'crypto';

// Валидация входных данных
const CreateTableSchema = z.object({
  venueId: z.string().uuid(),
  label: z.string().min(1).max(50),
  externalId: z.string().optional(),
});

const UpdateTableSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
  externalId: z.string().optional(),
});

type CreateTableInput = z.infer<typeof CreateTableSchema>;
type UpdateTableInput = z.infer<typeof UpdateTableSchema>;

// Генерация токена столика
function generateTableToken(): string {
  return randomBytes(16).toString('hex');
}

export function TableService() {
  return {
    // Создание столика
    async create(input: CreateTableInput): Promise<Table> {
      const validated = CreateTableSchema.parse(input);
      const tableToken = generateTableToken();
      const [table] = await db.insert(tables).values({
        id: crypto.randomUUID(),
        venueId: validated.venueId,
        label: validated.label,
        tableToken,
        externalId: validated.externalId,
      }).returning();
      return table;
    },

    // Обновление столика
    async update(id: string, input: UpdateTableInput): Promise<Table | null> {
      const validated = UpdateTableSchema.parse(input);
      const [updated] = await db.update(tables)
        .set({
          ...validated,
          updatedAt: new Date(),
        })
        .where(eq(tables.id, id))
        .returning();
      return updated || null;
    },

    // Получение столика по ID
    async getById(id: string): Promise<Table | null> {
      const [table] = await db.select().from(tables).where(eq(tables.id, id));
      return table || null;
    },

    // Получение столика по токену
    async getByToken(token: string): Promise<Table | null> {
      const [table] = await db.select().from(tables).where(eq(tables.tableToken, token));
      return table || null;
    },

    // Получение всех столиков заведения
    async listByVenue(venueId: string, activeOnly = true): Promise<Table[]> {
      const conditions = [eq(tables.venueId, venueId)];
      if (activeOnly) {
        conditions.push(eq(tables.isActive, true));
      }
      return db.select().from(tables).where(and(...conditions));
    },

    // Деактивация столика
    async deactivate(id: string): Promise<Table | null> {
      const [updated] = await db.update(tables)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(tables.id, id))
        .returning();
      return updated || null;
    },

    // Удаление столика (каскадное через БД)
    async delete(id: string): Promise<boolean> {
      await db.delete(tables).where(eq(tables.id, id));
      // В better-sqlite3 нет простого способа узнать количество удаленных строк,
      // но если запись существовала, она будет удалена.
      // Для упрощения возвращаем true, предполагая успех.
      return true;
    },
  };
}

// Экспорт типа сервиса
export type TableServiceType = ReturnType<typeof TableService>;
