import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Типы статусов для использования в нескольких таблицах
export const billStatusEnum = ['open', 'closed'] as const;
export const billItemStatusEnum = ['unpaid', 'paid'] as const;
export const paymentStatusEnum = ['pending', 'succeeded', 'failed', 'refunded'] as const;
export const integrationEventTypeEnum = [
  'bill_created',
  'item_added',
  'item_updated',
  'item_removed',
  'payment_succeeded',
  'payment_failed',
  'payment_refunded',
  'table_updated',
  'venue_updated',
] as const;
export const userRoleEnum = ['owner', 'manager', 'staff'] as const;

// Категория меню
export const menuCategories = sqliteTable('menu_categories', {
  id: text('id').primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (table) => [
  index('menu_categories_venue_id_idx').on(table.venueId),
]);

// Позиция меню
export const menuItems = sqliteTable('menu_items', {
  id: text('id').primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').references(() => menuCategories.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  unitPrice: integer('unit_price').notNull(), // в копейках
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (table) => [
  index('menu_items_venue_id_idx').on(table.venueId),
  index('menu_items_category_id_idx').on(table.categoryId),
]);

// Заведение
export const venues = sqliteTable('venues', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  currency: text('currency').notNull().default('RUB'),
  tipPresets: text('tip_presets', { mode: 'json' }).notNull().default(JSON.stringify([0, 5, 10, 15])),
  posConfig: text('pos_config', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
});

// Столик
export const tables = sqliteTable('tables', {
  id: text('id').primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  tableToken: text('table_token').notNull().unique(),
  externalId: text('external_id'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (table) => [
  index('tables_table_token_idx').on(table.tableToken),
  index('tables_venue_id_idx').on(table.venueId),
]);

// Счет
export const bills = sqliteTable('bills', {
  id: text('id').primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  tableId: text('table_id').notNull().references(() => tables.id, { onDelete: 'cascade' }),
  status: text('status', { enum: billStatusEnum }).notNull().default('open'),
  externalId: text('external_id'),
  openedAt: integer('opened_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  closedAt: integer('closed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (table) => [
  index('bills_table_id_idx').on(table.tableId),
  index('bills_status_idx').on(table.status),
]);

// Позиция счета
export const billItems = sqliteTable('bill_items', {
  id: text('id').primaryKey(),
  billId: text('bill_id').notNull().references(() => bills.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  unitPrice: integer('unit_price').notNull(), // в копейках/центах
  quantity: integer('quantity').notNull().default(1),
  status: text('status', { enum: billItemStatusEnum }).notNull().default('unpaid'),
  externalId: text('external_id'),
  paidAt: integer('paid_at', { mode: 'timestamp' }),
  paidByGuestName: text('paid_by_guest_name'),
  paidByTelegramId: integer('paid_by_telegram_id', { mode: 'number' }),
  paymentId: text('payment_id').references(() => payments.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (table) => [
  index('bill_items_bill_id_status_idx').on(table.billId, table.status),
  index('bill_items_payment_id_idx').on(table.paymentId),
]);

// Платеж
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  billId: text('bill_id').notNull().references(() => bills.id, { onDelete: 'cascade' }),
  status: text('status', { enum: paymentStatusEnum }).notNull().default('pending'),
  itemSubtotal: integer('item_subtotal').notNull(), // сумма выбранных позиций (копейки)
  tipAmount: integer('tip_amount').notNull().default(0), // чаевые (копейки)
  totalAmount: integer('total_amount').notNull(), // итого (копейки)
  telegramUserId: integer('telegram_user_id', { mode: 'number' }),
  guestName: text('guest_name'),
  paymentMethod: text('payment_method'), // card, apple_pay, google_pay, etc.
  paymentProvider: text('payment_provider'), // yookassa, stripe, etc.
  providerPaymentId: text('provider_payment_id'), // идентификатор платежа в шлюзе
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (table) => [
  index('payments_bill_id_idx').on(table.billId),
  index('payments_status_idx').on(table.status),
]);

// Связь платежа и позиций (многие-ко-многим)
export const paymentItems = sqliteTable('payment_items', {
  paymentId: text('payment_id').notNull().references(() => payments.id, { onDelete: 'cascade' }),
  billItemId: text('bill_item_id').notNull().references(() => billItems.id, { onDelete: 'cascade' }),
  amountAtPayment: integer('amount_at_payment').notNull(), // цена на момент оплаты (копейки)
}, (table) => [
  primaryKey({ columns: [table.paymentId, table.billItemId] }),
]);

// События интеграции (лог для отладки и синхронизации)
export const integrationEvents = sqliteTable('integration_events', {
  id: text('id').primaryKey(),
  venueId: text('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  type: text('type', { enum: integrationEventTypeEnum }).notNull(),
  payload: text('payload', { mode: 'json' }).notNull(),
  processed: integer('processed', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (table) => [
  index('integration_events_venue_id_processed_idx').on(table.venueId, table.processed),
  index('integration_events_created_at_idx').on(table.createdAt),
]);

// Пользователи (администраторы заведений)
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  telegramId: integer('telegram_id', { mode: 'number' }).unique(),
  email: text('email').unique(),
  name: text('name').notNull(),
  venueId: text('venue_id').references(() => venues.id, { onDelete: 'set null' }),
  role: text('role', { enum: userRoleEnum }).notNull().default('staff'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (table) => [
  index('users_venue_id_idx').on(table.venueId),
]);

// Сессии (для админ-панели)
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
}, (table) => [
  index('sessions_user_id_idx').on(table.userId),
]);

// Экспорт типов для использования в сервисах
export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
export type Table = typeof tables.$inferSelect;
export type NewTable = typeof tables.$inferInsert;
export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;
export type BillItem = typeof billItems.$inferSelect;
export type NewBillItem = typeof billItems.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type PaymentItem = typeof paymentItems.$inferSelect;
export type NewPaymentItem = typeof paymentItems.$inferInsert;
export type IntegrationEvent = typeof integrationEvents.$inferSelect;
export type NewIntegrationEvent = typeof integrationEvents.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type MenuCategory = typeof menuCategories.$inferSelect;
export type NewMenuCategory = typeof menuCategories.$inferInsert;
export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
