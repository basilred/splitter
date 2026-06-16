## 1. Database Schema

- [x] 1.1 Add `menu_categories` table to schema (venue_id FK, name, sort_order)
- [x] 1.2 Add `menu_items` table to schema (venue_id FK, category_id FK nullable, name, unit_price, is_active)
- [x] 1.3 Add relations and indexes in Drizzle schema
- [x] 1.4 Write and run migration
- [x] 1.5 Export new types (MenuCategory, MenuItem, NewMenuCategory, NewMenuItem)

## 2. MenuService

- [x] 2.1 Create `MenuItemService` with CRUD for categories (create, list, rename, reorder, delete)
- [x] 2.2 Create `MenuItemService` with CRUD for items (create, list by category, update, deactivate, delete)
- [x] 2.3 Add Zod validation schemas for menu inputs
- [x] 2.4 Write unit tests for MenuItemService

## 3. PaymentService — Statistics

- [x] 3.1 Add `getStats(venueId, period)` method with date range aggregation
- [x] 3.2 Add `getTopItems(venueId, period, limit)` method for item ranking
- [x] 3.3 Add `getPaymentMethodBreakdown(venueId, period)` method
- [x] 3.4 Update existing unit tests for PaymentService

## 4. Bot Session & Router

- [x] 4.1 Create `session.ts` with extended SessionData types and state machine helpers
- [x] 4.2 Create `router.ts` with callback_data parser (namespace:action:payload) and dispatcher
- [x] 4.3 Add Zod validation for incoming callback_data payloads
- [x] 4.4 Integrate router into bot middleware chain

## 5. Inline Keyboards

- [x] 5.1 Create `keyboards.ts` with factory functions:
  - mainMenuKeyboard (Мои столики, Статистика, Заведение)
  - tableListKeyboard(tables) with per-table buttons
  - tableDetailKeyboard(table, hasOpenBill)
  - billViewKeyboard(billId) with action buttons
  - addItemMethodKeyboard (Из меню / Своё название)
  - menuManagementKeyboard
  - statsPeriodKeyboard (Сегодня / Неделя / Месяц)
  - backKeyboard(label) for back navigation
  - confirmCancelKeyboard for dialogs

## 6. Bot Handlers

- [x] 6.1 Create `handlers/main.ts` — /start, /help, main menu, back to main
- [x] 6.2 Create `handlers/tables.ts` — list tables, show table detail, create table dialog, deactivate table, rename table
- [x] 6.3 Create `handlers/bills.ts` — open bill, show bill, add item from menu dialog, add custom item dialog, remove item with confirmation, edit quantity dialog, close bill, show payment history
- [x] 6.4 Create `handlers/menu.ts` — list categories, create/edit/delete category, list items in category, create/edit/deactivate item
- [x] 6.5 Create `handlers/stats.ts` — show stats for period, payment method breakdown, top items

## 7. Refactor Bot Entry Point

- [x] 7.1 Rewrite `index.ts` — register all handlers, router, existing middleware
- [x] 7.2 Keep existing middleware.ts and qr.ts unchanged
- [x] 7.3 Keep webhook route (`/api/telegram-webhook`) working
- [x] 7.4 Verify polling mode still works for local dev
- [x] 7.5 Remove old flat command handlers from index.ts

## 8. Notifications

- [x] 8.1 Create `src/lib/telegram-bot/notifications.ts` with helper functions:
  - notifyPaymentSucceeded(billId, paymentId, tableLabel, amount, guestName)
  - notifyBillClosed(billId, tableLabel)
- [x] 8.2 Integrate notifications into `/api/payments` route (or wherever payment status is updated)
- [x] 8.3 Notifications include [📋 Показать счёт] inline button

## 9. Integration & Cleanup

- [x] 9.1 Update smoke-test.ts if needed
- [x] 9.2 Run `npm run lint` and fix any issues
- [x] 9.3 Run `npm run typecheck` and fix any issues
- [x] 9.4 Run full test suite (vitest + smoke-test)
