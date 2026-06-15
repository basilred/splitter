import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { integrationEvents, type IntegrationEvent, type NewIntegrationEvent } from '../db/schema';
import { z } from 'zod';
import type { POSAdapter } from '../integrations/POSAdapter';

// Валидация входных данных
const CreateEventSchema = z.object({
  venueId: z.string().uuid(),
  type: z.enum([
    'bill_created',
    'item_added',
    'item_updated',
    'item_removed',
    'payment_succeeded',
    'payment_failed',
    'payment_refunded',
    'table_updated',
    'venue_updated',
  ]),
  payload: z.record(z.any()),
});

type CreateEventInput = z.infer<typeof CreateEventSchema>;

export function IntegrationService(posAdapter?: POSAdapter) {
  return {
    // Создание события интеграции
    async createEvent(input: CreateEventInput): Promise<IntegrationEvent> {
      const validated = CreateEventSchema.parse(input);
      const [event] = await db.insert(integrationEvents).values({
        id: crypto.randomUUID(),
        venueId: validated.venueId,
        type: validated.type,
        payload: JSON.stringify(validated.payload),
      }).returning();
      return event;
    },

    // Получение события по ID
    async getEventById(id: string): Promise<IntegrationEvent | null> {
      const [event] = await db.select().from(integrationEvents).where(eq(integrationEvents.id, id));
      return event || null;
    },

    // Получение необработанных событий для заведения
    async getUnprocessedEvents(venueId: string, limit = 100): Promise<IntegrationEvent[]> {
      return db.select().from(integrationEvents)
        .where(and(
          eq(integrationEvents.venueId, venueId),
          eq(integrationEvents.processed, false)
        ))
        .orderBy(desc(integrationEvents.createdAt))
        .limit(limit);
    },

    // Пометить событие как обработанное
    async markAsProcessed(id: string): Promise<IntegrationEvent | null> {
      const [updated] = await db.update(integrationEvents)
        .set({
          processed: true,
        })
        .where(eq(integrationEvents.id, id))
        .returning();
      return updated || null;
    },

    // Обработка событий через POS-адаптер
    async processEvents(venueId: string): Promise<{ processed: number; errors: string[] }> {
      const events = await this.getUnprocessedEvents(venueId);
      if (!posAdapter) {
        throw new Error('POS adapter not configured');
      }
      const errors: string[] = [];
      let processed = 0;
      for (const event of events) {
        try {
          // В зависимости от типа события вызываем соответствующий метод адаптера
          const payload = JSON.parse(event.payload as string);
          switch (event.type) {
            case 'bill_created':
              await posAdapter.syncBill(payload);
              break;
            case 'item_added':
              await posAdapter.syncItem(payload);
              break;
            case 'payment_succeeded':
              await posAdapter.syncPayment(payload);
              break;
            // Остальные типы можно добавить позже
            default:
              // Пропускаем неизвестные типы
              break;
          }
          await this.markAsProcessed(event.id);
          processed++;
        } catch (err) {
          errors.push(`Event ${event.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      return { processed, errors };
    },

    // Создание события и немедленная обработка (если адаптер доступен)
    async createAndProcess(input: CreateEventInput): Promise<IntegrationEvent> {
      const event = await this.createEvent(input);
      if (posAdapter) {
        try {
          await this.processEvents(input.venueId);
        } catch {
          // Игнорируем ошибки обработки, событие останется необработанным
        }
      }
      return event;
    },

    // Удаление старых обработанных событий (очистка)
    async cleanupOldEvents(olderThanDays: number = 30): Promise<number> {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - olderThanDays);
      const result = await db.delete(integrationEvents)
        .where(and(
          eq(integrationEvents.processed, true),
          sql`${integrationEvents.createdAt} < ${cutoff.getTime() / 1000}`
        ));
      // В better-sqlite3 нет rowsAffected, возвращаем приблизительное количество
      return 0;
    },
  };
}

export type IntegrationServiceType = ReturnType<typeof IntegrationService>;
