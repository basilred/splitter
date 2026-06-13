import { eq } from 'drizzle-orm';
import { db } from '../db';
import { venues, type Venue, type NewVenue } from '../db/schema';
import { z } from 'zod';

// Валидация входных данных
const CreateVenueSchema = z.object({
  name: z.string().min(1).max(100),
  currency: z.string().length(3).default('RUB'),
  tipPresets: z.array(z.number().int().nonnegative()).default([0, 5, 10, 15]),
  posConfig: z.record(z.any()).optional(),
});

const UpdateVenueSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currency: z.string().length(3).optional(),
  tipPresets: z.array(z.number().int().nonnegative()).optional(),
  posConfig: z.record(z.any()).optional(),
});

type CreateVenueInput = z.infer<typeof CreateVenueSchema>;
type UpdateVenueInput = z.infer<typeof UpdateVenueSchema>;

export function VenueService() {
  return {
    // Создание заведения
    async create(input: CreateVenueInput): Promise<Venue> {
      const validated = CreateVenueSchema.parse(input);
      const [venue] = await db.insert(venues).values({
        id: crypto.randomUUID(),
        name: validated.name,
        currency: validated.currency,
        tipPresets: JSON.stringify(validated.tipPresets),
        posConfig: validated.posConfig ? JSON.stringify(validated.posConfig) : null,
      }).returning();
      return venue;
    },

    // Обновление заведения
    async update(id: string, input: UpdateVenueInput): Promise<Venue | null> {
      const validated = UpdateVenueSchema.parse(input);
      const updateData: any = {
        updatedAt: new Date(),
      };
      if (validated.name !== undefined) updateData.name = validated.name;
      if (validated.currency !== undefined) updateData.currency = validated.currency;
      if (validated.tipPresets !== undefined) updateData.tipPresets = JSON.stringify(validated.tipPresets);
      if (validated.posConfig !== undefined) {
        updateData.posConfig = validated.posConfig ? JSON.stringify(validated.posConfig) : null;
      }
      const [updated] = await db.update(venues)
        .set(updateData)
        .where(eq(venues.id, id))
        .returning();
      return updated || null;
    },

    // Получение заведения по ID
    async getById(id: string): Promise<Venue | null> {
      const [venue] = await db.select().from(venues).where(eq(venues.id, id));
      return venue || null;
    },

    // Получение всех заведений
    async list(): Promise<Venue[]> {
      return db.select().from(venues);
    },

    // Удаление заведения (каскадное через БД)
    async delete(id: string): Promise<boolean> {
      await db.delete(venues).where(eq(venues.id, id));
      return true;
    },

    // Получение конфигурации POS
    async getPosConfig(id: string): Promise<Record<string, any> | null> {
      const venue = await this.getById(id);
      if (!venue || !venue.posConfig) return null;
      try {
        return JSON.parse(venue.posConfig as string);
      } catch {
        return null;
      }
    },

    // Обновление конфигурации POS
    async updatePosConfig(id: string, config: Record<string, any>): Promise<Venue | null> {
      const [updated] = await db.update(venues)
        .set({
          posConfig: JSON.stringify(config),
          updatedAt: new Date(),
        })
        .where(eq(venues.id, id))
        .returning();
      return updated || null;
    },
  };
}

export type VenueServiceType = ReturnType<typeof VenueService>;
