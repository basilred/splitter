import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db';
import {
  menuCategories,
  menuItems,
  type MenuCategory,
  type NewMenuCategory,
  type MenuItem,
  type NewMenuItem,
} from '../db/schema';
import { z } from 'zod';

const CreateCategorySchema = z.object({
  venueId: z.string().uuid(),
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().nonnegative().optional(),
});

const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

const CreateMenuItemSchema = z.object({
  venueId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(200),
  unitPrice: z.number().int().nonnegative(), // в копейках
});

const UpdateMenuItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  unitPrice: z.number().int().nonnegative().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
type CreateMenuItemInput = z.infer<typeof CreateMenuItemSchema>;
type UpdateMenuItemInput = z.infer<typeof UpdateMenuItemSchema>;

export function MenuItemService() {
  return {
    // ── Categories ──

    async createCategory(input: CreateCategoryInput): Promise<MenuCategory> {
      const validated = CreateCategorySchema.parse(input);
      const maxOrder = await this.getMaxSortOrder(validated.venueId);
      const [category] = await db.insert(menuCategories).values({
        id: crypto.randomUUID(),
        venueId: validated.venueId,
        name: validated.name,
        sortOrder: validated.sortOrder ?? maxOrder + 1,
      }).returning();
      return category;
    },

    async listCategories(venueId: string): Promise<MenuCategory[]> {
      return db.select().from(menuCategories)
        .where(eq(menuCategories.venueId, venueId))
        .orderBy(menuCategories.sortOrder);
    },

    async getCategoryById(id: string): Promise<MenuCategory | null> {
      const [category] = await db.select().from(menuCategories).where(eq(menuCategories.id, id));
      return category || null;
    },

    async updateCategory(id: string, input: UpdateCategoryInput): Promise<MenuCategory | null> {
      const validated = UpdateCategorySchema.parse(input);
      const [updated] = await db.update(menuCategories)
        .set({ ...validated, updatedAt: new Date() })
        .where(eq(menuCategories.id, id))
        .returning();
      return updated || null;
    },

    async reorderCategories(venueId: string, orderedIds: string[]): Promise<void> {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.update(menuCategories)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(and(eq(menuCategories.id, orderedIds[i]), eq(menuCategories.venueId, venueId)));
      }
    },

    async deleteCategory(id: string): Promise<void> {
      await db.delete(menuCategories).where(eq(menuCategories.id, id));
    },

    // ── Items ──

    async createItem(input: CreateMenuItemInput): Promise<MenuItem> {
      const validated = CreateMenuItemSchema.parse(input);
      const [item] = await db.insert(menuItems).values({
        id: crypto.randomUUID(),
        venueId: validated.venueId,
        categoryId: validated.categoryId ?? null,
        name: validated.name,
        unitPrice: validated.unitPrice,
      }).returning();
      return item;
    },

    async listItems(venueId: string, categoryId?: string, activeOnly = true): Promise<MenuItem[]> {
      const conditions = [eq(menuItems.venueId, venueId)];
      if (categoryId) {
        conditions.push(eq(menuItems.categoryId, categoryId));
      }
      if (activeOnly) {
        conditions.push(eq(menuItems.isActive, true));
      }
      return db.select().from(menuItems).where(and(...conditions));
    },

    async listItemsByCategory(venueId: string): Promise<{ category: MenuCategory | null; items: MenuItem[] }[]> {
      const categories = await this.listCategories(venueId);
      const uncategorizedItems = await db.select().from(menuItems)
        .where(and(
          eq(menuItems.venueId, venueId),
          sql`${menuItems.categoryId} IS NULL`,
          eq(menuItems.isActive, true),
        ));
      const result = categories.map(async (cat) => ({
        category: cat,
        items: await db.select().from(menuItems)
          .where(and(
            eq(menuItems.venueId, venueId),
            eq(menuItems.categoryId, cat.id),
            eq(menuItems.isActive, true),
          )),
      }));
      const grouped = await Promise.all(result);
      if (uncategorizedItems.length > 0) {
        grouped.push({ category: null as unknown as MenuCategory, items: uncategorizedItems });
      }
      return grouped;
    },

    async getItemById(id: string): Promise<MenuItem | null> {
      const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
      return item || null;
    },

    async updateItem(id: string, input: UpdateMenuItemInput): Promise<MenuItem | null> {
      const validated = UpdateMenuItemSchema.parse(input);
      const [updated] = await db.update(menuItems)
        .set({ ...validated, updatedAt: new Date() })
        .where(eq(menuItems.id, id))
        .returning();
      return updated || null;
    },

    async deactivateItem(id: string): Promise<MenuItem | null> {
      const [updated] = await db.update(menuItems)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(menuItems.id, id))
        .returning();
      return updated || null;
    },

    async deleteItem(id: string): Promise<void> {
      await db.delete(menuItems).where(eq(menuItems.id, id));
    },

    // ── Helpers ──

    async getMaxSortOrder(venueId: string): Promise<number> {
      const [result] = await db.select({
        max: sql<number>`coalesce(max(${menuCategories.sortOrder}), -1)`,
      }).from(menuCategories).where(eq(menuCategories.venueId, venueId));
      return result?.max ?? -1;
    },
  };
}

export type MenuItemServiceType = ReturnType<typeof MenuItemService>;
