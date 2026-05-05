# Telegram Mini App Split Bill MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working Telegram Mini App MVP where a guest opens a table QR link, selects unpaid bill items, adds tips, completes mock checkout, and staff manages tables and bills from an admin screen.

**Architecture:** Use one Next.js App Router project with server-owned domain logic. SQLite stores venues, tables, bills, items, payments, and integration events. UI components call server actions that delegate to focused services and a mock `POSAdapter`.

**Tech Stack:** Next.js, TypeScript, React, SQLite, Drizzle ORM, Vitest, Testing Library, Playwright, qrcode.react, lucide-react.

---

## File Structure

Create the project root files:

- `package.json`: scripts and dependencies.
- `tsconfig.json`: strict TypeScript config.
- `next.config.ts`: Next.js config.
- `vitest.config.ts`: unit and integration test config.
- `playwright.config.ts`: browser test config.
- `.gitignore`: ignored local artifacts.
- `.env.example`: documented local environment variables.
- `README.md`: local setup and demo flow.

Create app routes:

- `src/app/layout.tsx`: shared HTML shell.
- `src/app/globals.css`: global styles and responsive layout primitives.
- `src/app/page.tsx`: redirect/help page pointing to admin for local MVP.
- `src/app/admin/page.tsx`: staff dashboard route.
- `src/app/t/[tableToken]/page.tsx`: guest table route.
- `src/app/t/[tableToken]/checkout/page.tsx`: mock checkout route.
- `src/app/t/[tableToken]/success/page.tsx`: successful payment route.

Create server actions:

- `src/app/admin/actions.ts`: admin mutations for venue/table/bill/item operations.
- `src/app/t/[tableToken]/actions.ts`: guest payment mutations.

Create admin UI:

- `src/features/admin/AdminDashboard.tsx`: admin page composition.
- `src/features/admin/AdminAccessGate.tsx`: development access-code gate.
- `src/features/admin/TableManager.tsx`: table list, creation, and QR display.
- `src/features/admin/BillEditor.tsx`: open bill, add item, close bill.
- `src/features/admin/ItemStatusList.tsx`: paid/unpaid status list.

Create guest UI:

- `src/features/guest/GuestBillScreen.tsx`: guest bill selection screen.
- `src/features/guest/BillItemPicker.tsx`: selectable unpaid item list.
- `src/features/guest/TipSelector.tsx`: preset and custom tip selector.
- `src/features/guest/CheckoutBar.tsx`: sticky selected total and checkout button.
- `src/features/guest/MockCheckoutScreen.tsx`: mock checkout confirmation screen.
- `src/features/guest/PaymentSuccessScreen.tsx`: success state.
- `src/features/guest/EmptyBillState.tsx`: table not found, no open bill, all paid, and conflict states.

Create domain and persistence modules:

- `src/lib/db/client.ts`: SQLite and Drizzle client.
- `src/lib/db/schema.ts`: database schema.
- `src/lib/db/migrate.ts`: migration runner.
- `src/lib/db/seed.ts`: seed data helper for local demo.
- `src/lib/domain/money.ts`: integer-cent money helpers.
- `src/lib/domain/errors.ts`: typed domain errors.
- `src/lib/domain/types.ts`: shared domain DTOs.
- `src/lib/services/billService.ts`: table and bill business rules.
- `src/lib/services/paymentService.ts`: mock payment business rules.
- `src/lib/pos/POSAdapter.ts`: POS adapter interface.
- `src/lib/pos/MockPOSAdapter.ts`: SQLite-backed mock adapter.
- `src/lib/telegram/webapp.ts`: client-side Telegram WebApp helper.
- `src/lib/qr/tableLinks.ts`: table deep-link and local URL helpers.

Create tests:

- `src/lib/domain/money.test.ts`: totals and tips.
- `src/lib/services/billService.test.ts`: bill validation and close rules.
- `src/lib/services/paymentService.test.ts`: mock payment and conflict rules.
- `src/lib/pos/MockPOSAdapter.test.ts`: integration event behavior.
- `tests/e2e/admin-and-guest.spec.ts`: browser happy path.

## Task 1: Scaffold Next.js Project

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`

- [ ] **Step 1: Create project metadata and scripts**

Add this `package.json`:

```json
{
  "name": "tg-mini-app-split-bill",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:migrate": "tsx src/lib/db/migrate.ts",
    "db:seed": "tsx src/lib/db/seed.ts"
  },
  "dependencies": {
    "@telegram-apps/sdk-react": "^3.3.1",
    "better-sqlite3": "^11.9.1",
    "drizzle-orm": "^0.43.1",
    "lucide-react": "^0.468.0",
    "next": "^15.3.1",
    "qrcode.react": "^4.2.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.24.4"
  },
  "devDependencies": {
    "@playwright/test": "^1.52.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@types/better-sqlite3": "^7.6.13",
    "@types/node": "^22.15.3",
    "@types/react": "^19.0.12",
    "@types/react-dom": "^19.0.4",
    "drizzle-kit": "^0.31.0",
    "jsdom": "^26.1.0",
    "tsx": "^4.19.4",
    "typescript": "^5.8.3",
    "vitest": "^3.1.2"
  }
}
```

- [ ] **Step 2: Add TypeScript and framework config**

Add `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, and `playwright.config.ts` with strict TypeScript, App Router support, Vitest `jsdom`, and Playwright `webServer` using `npm run dev`.

Key `vitest.config.ts` content:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
```

- [ ] **Step 3: Add app shell**

Create `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Split Bill Mini App",
  description: "Telegram Mini App MVP for table-level split payments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
```

Create `src/app/page.tsx`:

```tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="panel">
        <h1>Split Bill Mini App</h1>
        <p>Local MVP for restaurant table bills.</p>
        <Link className="primary-link" href="/admin">
          Open admin
        </Link>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and dependencies install without errors.

- [ ] **Step 5: Run initial checks**

Run:

```bash
npm run test
npm run build
```

Expected: Vitest reports no test files or passes empty suite, and Next.js build succeeds.

- [ ] **Step 6: Commit scaffold**

Run:

```bash
git add package.json package-lock.json tsconfig.json next.config.ts vitest.config.ts playwright.config.ts .gitignore .env.example src/app
git commit -m "chore: scaffold next app"
```

## Task 2: Add Database Schema, Migrations, and Seed Data

**Files:**

- Create: `src/lib/db/client.ts`
- Create: `src/lib/db/schema.ts`
- Create: `src/lib/db/migrate.ts`
- Create: `src/lib/db/seed.ts`
- Create: `src/lib/domain/types.ts`
- Modify: `.env.example`

- [ ] **Step 1: Define database connection**

Create `src/lib/db/client.ts`:

```ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const databasePath = process.env.DATABASE_URL?.replace("file:", "") ?? "data/dev.db";

export const sqlite = new Database(databasePath);
export const db = drizzle(sqlite, { schema });
```

- [ ] **Step 2: Define schema**

Create `src/lib/db/schema.ts` with tables for `venues`, `restaurantTables`, `bills`, `billItems`, `payments`, `paymentItems`, and `integrationEvents`. Store money as integer cents. Add a unique index that allows only one open bill per table through service-level validation because SQLite partial uniqueness through Drizzle is more brittle than an explicit service check for this MVP.

Required enums as text unions:

```ts
export const billStatuses = ["open", "closed"] as const;
export const itemStatuses = ["unpaid", "paid"] as const;
export const paymentStatuses = ["pending", "succeeded", "failed"] as const;
```

- [ ] **Step 3: Add migration runner**

Create `src/lib/db/migrate.ts` that creates `data/` when missing and runs `CREATE TABLE IF NOT EXISTS` statements for every table. Use explicit SQL so the app has no separate migration service dependency in the MVP.

Run:

```bash
npm run db:migrate
```

Expected: `data/dev.db` exists and tables are created.

- [ ] **Step 4: Add seed helper**

Create `src/lib/db/seed.ts` that inserts:

- venue: `Demo Bar`, currency `USD`, tip presets `[0,5,10,15]`
- table: label `12`, table token `demo-table-12`
- open bill for table `12`
- unpaid items: `Espresso`, `Caesar Salad`, `Lemonade`

Run:

```bash
npm run db:seed
```

Expected: seed script prints `Seeded Demo Bar table demo-table-12`.

- [ ] **Step 5: Commit persistence foundation**

Run:

```bash
git add .env.example src/lib/db src/lib/domain/types.ts data/.gitkeep
git commit -m "feat: add sqlite schema and seed data"
```

## Task 3: Implement Money Helpers and Domain Errors With Tests

**Files:**

- Create: `src/lib/domain/money.ts`
- Create: `src/lib/domain/errors.ts`
- Create: `src/lib/domain/money.test.ts`

- [ ] **Step 1: Write failing money tests**

Create `src/lib/domain/money.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateTipCents, formatMoney, sumLineItems } from "./money";

describe("money helpers", () => {
  it("sums line items in cents", () => {
    expect(
      sumLineItems([
        { unitPriceCents: 500, quantity: 2 },
        { unitPriceCents: 1250, quantity: 1 },
      ]),
    ).toBe(2250);
  });

  it("calculates percent tips from subtotal", () => {
    expect(calculateTipCents(2250, { type: "percent", value: 10 })).toBe(225);
  });

  it("uses custom fixed tips in cents", () => {
    expect(calculateTipCents(2250, { type: "fixed", value: 333 })).toBe(333);
  });

  it("formats money with currency", () => {
    expect(formatMoney(2250, "USD")).toBe("$22.50");
  });
});
```

- [ ] **Step 2: Run failing test**

Run:

```bash
npm run test -- src/lib/domain/money.test.ts
```

Expected: fail because `src/lib/domain/money.ts` does not exist.

- [ ] **Step 3: Implement helpers and errors**

Create `src/lib/domain/money.ts`:

```ts
export type TipInput =
  | { type: "percent"; value: number }
  | { type: "fixed"; value: number };

export function sumLineItems(items: Array<{ unitPriceCents: number; quantity: number }>) {
  return items.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0);
}

export function calculateTipCents(subtotalCents: number, tip: TipInput) {
  if (tip.value < 0) return 0;
  if (tip.type === "fixed") return Math.round(tip.value);
  return Math.round((subtotalCents * tip.value) / 100);
}

export function formatMoney(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}
```

Create `src/lib/domain/errors.ts`:

```ts
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

export const domainErrors = {
  tableNotFound: () => new DomainError("Table not found", "TABLE_NOT_FOUND"),
  noOpenBill: () => new DomainError("No open bill", "NO_OPEN_BILL"),
  itemAlreadyPaid: () => new DomainError("One or more items are already paid", "ITEM_ALREADY_PAID"),
  billHasUnpaidItems: () => new DomainError("Bill has unpaid items", "BILL_HAS_UNPAID_ITEMS"),
  invalidSelection: () => new DomainError("Invalid item selection", "INVALID_SELECTION"),
};
```

- [ ] **Step 4: Run passing tests**

Run:

```bash
npm run test -- src/lib/domain/money.test.ts
```

Expected: all four money tests pass.

- [ ] **Step 5: Commit domain helpers**

Run:

```bash
git add src/lib/domain
git commit -m "feat: add money helpers"
```

## Task 4: Implement Bill Service With Tests

**Files:**

- Create: `src/lib/services/billService.ts`
- Create: `src/lib/services/billService.test.ts`
- Modify: `src/lib/domain/types.ts`
- Modify: `src/lib/db/schema.ts`

- [ ] **Step 1: Write failing bill service tests**

Create `src/lib/services/billService.test.ts` covering:

- resolving `demo-table-12` returns venue, table, bill, and unpaid items
- invalid token throws `TABLE_NOT_FOUND`
- closing a bill with unpaid items throws `BILL_HAS_UNPAID_ITEMS`
- selecting an already paid item throws `ITEM_ALREADY_PAID`

Use a fresh SQLite file per test run by setting `process.env.DATABASE_URL = "file:data/test.db"` before importing services.

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test -- src/lib/services/billService.test.ts
```

Expected: fail because `billService.ts` does not exist.

- [ ] **Step 3: Implement bill service**

Create `src/lib/services/billService.ts` with these exported functions:

```ts
export async function getGuestBillByTableToken(tableToken: string): Promise<GuestBillView>;
export async function createTable(input: { venueId: string; label: string }): Promise<TableView>;
export async function openBill(tableId: string): Promise<BillView>;
export async function addBillItem(input: { billId: string; name: string; unitPriceCents: number; quantity: number }): Promise<BillItemView>;
export async function validateUnpaidItems(input: { billId: string; itemIds: string[] }): Promise<BillItemView[]>;
export async function closeBill(billId: string): Promise<void>;
```

Implementation rules:

- Generate IDs with `crypto.randomUUID()`.
- Generate table tokens as `tbl_${crypto.randomUUID().replaceAll("-", "")}`.
- Return only unpaid items to the guest view.
- Reject opening a second open bill for the same table.
- Reject bill close when any item on the bill has `status = "unpaid"`.

- [ ] **Step 4: Run passing bill service tests**

Run:

```bash
npm run test -- src/lib/services/billService.test.ts
```

Expected: all bill service tests pass.

- [ ] **Step 5: Commit bill service**

Run:

```bash
git add src/lib/services/billService.ts src/lib/services/billService.test.ts src/lib/domain/types.ts src/lib/db/schema.ts
git commit -m "feat: add bill service"
```

## Task 5: Implement Payment Service and Mock POS Adapter

**Files:**

- Create: `src/lib/services/paymentService.ts`
- Create: `src/lib/services/paymentService.test.ts`
- Create: `src/lib/pos/POSAdapter.ts`
- Create: `src/lib/pos/MockPOSAdapter.ts`
- Create: `src/lib/pos/MockPOSAdapter.test.ts`

- [ ] **Step 1: Write failing payment tests**

Create `paymentService.test.ts` covering:

- creating a pending payment recalculates subtotal, tip, and total on server
- confirming a pending payment marks all selected items paid
- confirming a payment fails when one selected item was already paid by another payment
- failed mock checkout keeps items unpaid

- [ ] **Step 2: Define POS adapter contract**

Create `src/lib/pos/POSAdapter.ts`:

```ts
export type ExternalBill = {
  externalId: string;
  tableExternalId: string;
  items: Array<{
    externalId: string;
    name: string;
    unitPriceCents: number;
    quantity: number;
  }>;
};

export interface POSAdapter {
  getOpenBill(tableExternalId: string): Promise<ExternalBill | null>;
  syncBill(tableId: string): Promise<void>;
  markItemsPaid(paymentId: string): Promise<void>;
}
```

- [ ] **Step 3: Run failing tests**

Run:

```bash
npm run test -- src/lib/services/paymentService.test.ts src/lib/pos/MockPOSAdapter.test.ts
```

Expected: fail because service and adapter implementations do not exist.

- [ ] **Step 4: Implement payment service**

Create `src/lib/services/paymentService.ts` with:

```ts
export async function createMockPayment(input: {
  billId: string;
  itemIds: string[];
  tip: TipInput;
  guestName?: string;
  telegramUserId?: string;
}): Promise<PaymentView>;

export async function confirmMockPayment(input: {
  paymentId: string;
  outcome: "succeeded" | "failed";
}): Promise<PaymentView>;
```

Rules:

- Always reload selected bill items inside service methods.
- Recalculate money on the server from database item prices.
- Use a SQLite transaction when confirming payment.
- Before marking items paid, verify every item is still `unpaid`.
- On success, mark payment `succeeded`, mark items `paid`, set `paidAt`, `paymentId`, and guest fields.
- On failure, mark payment `failed` and leave items unpaid.
- Insert an `IntegrationEvent` for successful payment.

- [ ] **Step 5: Implement Mock POS adapter**

Create `src/lib/pos/MockPOSAdapter.ts` with these concrete behaviors:

```ts
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { bills, billItems, integrationEvents, restaurantTables } from "@/lib/db/schema";
import type { ExternalBill, POSAdapter } from "./POSAdapter";

export class MockPOSAdapter implements POSAdapter {
  async getOpenBill(tableExternalId: string): Promise<ExternalBill | null> {
    const table = await db.query.restaurantTables.findFirst({
      where: eq(restaurantTables.externalId, tableExternalId),
    });

    if (!table) return null;

    const bill = await db.query.bills.findFirst({
      where: eq(bills.tableId, table.id),
    });

    if (!bill || bill.status !== "open") return null;

    const items = await db.query.billItems.findMany({
      where: eq(billItems.billId, bill.id),
    });

    return {
      externalId: bill.externalId ?? bill.id,
      tableExternalId,
      items: items.map((item) => ({
        externalId: item.externalId ?? item.id,
        name: item.name,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
      })),
    };
  }

  async syncBill(tableId: string): Promise<void> {
    await db.insert(integrationEvents).values({
      id: crypto.randomUUID(),
      type: "mock_pos.bill_synced",
      payload: JSON.stringify({ tableId }),
      createdAt: new Date(),
    });
  }

  async markItemsPaid(paymentId: string): Promise<void> {
    await db.insert(integrationEvents).values({
      id: crypto.randomUUID(),
      type: "mock_pos.items_paid",
      payload: JSON.stringify({ paymentId }),
      createdAt: new Date(),
    });
  }
}
```

- [ ] **Step 6: Run passing tests**

Run:

```bash
npm run test -- src/lib/services/paymentService.test.ts src/lib/pos/MockPOSAdapter.test.ts
```

Expected: all payment and adapter tests pass.

- [ ] **Step 7: Commit payment service**

Run:

```bash
git add src/lib/services/paymentService.ts src/lib/services/paymentService.test.ts src/lib/pos
git commit -m "feat: add mock payment service"
```

## Task 6: Build Admin Server Actions and UI

**Files:**

- Create: `src/app/admin/actions.ts`
- Create: `src/app/admin/page.tsx`
- Create: `src/features/admin/AdminDashboard.tsx`
- Create: `src/features/admin/AdminAccessGate.tsx`
- Create: `src/features/admin/TableManager.tsx`
- Create: `src/features/admin/BillEditor.tsx`
- Create: `src/features/admin/ItemStatusList.tsx`
- Create: `src/lib/qr/tableLinks.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add QR link helper**

Create `src/lib/qr/tableLinks.ts`:

```ts
export function buildTableUrl(origin: string, tableToken: string) {
  return `${origin.replace(/\/$/, "")}/t/${tableToken}`;
}
```

- [ ] **Step 2: Add admin server actions**

Create `src/app/admin/actions.ts` with `"use server"` and actions:

```ts
export async function createTableAction(formData: FormData): Promise<void>;
export async function openBillAction(formData: FormData): Promise<void>;
export async function addBillItemAction(formData: FormData): Promise<void>;
export async function closeBillAction(formData: FormData): Promise<void>;
```

Rules:

- Parse and validate form inputs with `zod`.
- Call `billService`.
- Call `revalidatePath("/admin")` after mutations.
- Convert price input dollars to cents with `Math.round(Number(price) * 100)`.

- [ ] **Step 3: Create admin dashboard**

Create `src/app/admin/page.tsx` as a server component that loads venue, tables, open bills, and items, then renders `AdminDashboard`.

Create `AdminAccessGate` as a client component. Use local state and require code `demo-admin` before showing admin controls. This is development-only access control and must be visibly labeled as local MVP access.

- [ ] **Step 4: Create table and bill controls**

Implement:

- `TableManager`: table creation form, list of table labels, QR code via `qrcode.react`, and deep link text.
- `BillEditor`: open bill button, add item form, close bill button disabled when unpaid items remain.
- `ItemStatusList`: compact list showing item name, quantity, amount, unpaid/paid status, and guest name when present.

- [ ] **Step 5: Run checks**

Run:

```bash
npm run test
npm run build
```

Expected: tests pass and Next.js build succeeds.

- [ ] **Step 6: Commit admin UI**

Run:

```bash
git add src/app/admin src/features/admin src/lib/qr src/app/globals.css
git commit -m "feat: add admin bill management"
```

## Task 7: Build Guest Bill Selection UI

**Files:**

- Create: `src/app/t/[tableToken]/page.tsx`
- Create: `src/app/t/[tableToken]/actions.ts`
- Create: `src/features/guest/GuestBillScreen.tsx`
- Create: `src/features/guest/BillItemPicker.tsx`
- Create: `src/features/guest/TipSelector.tsx`
- Create: `src/features/guest/CheckoutBar.tsx`
- Create: `src/features/guest/EmptyBillState.tsx`
- Create: `src/lib/telegram/webapp.ts`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add Telegram helper**

Create `src/lib/telegram/webapp.ts`:

```ts
export function notifyTelegramReady() {
  if (typeof window === "undefined") return;
  const telegram = window.Telegram?.WebApp;
  telegram?.ready();
  telegram?.expand();
}
```

Add a global declaration for `window.Telegram` in `src/lib/domain/types.ts` or `src/types/telegram.d.ts`.

- [ ] **Step 2: Add guest page loader**

Create `src/app/t/[tableToken]/page.tsx`:

```tsx
import { getGuestBillByTableToken } from "@/lib/services/billService";
import { GuestBillScreen } from "@/features/guest/GuestBillScreen";
import { EmptyBillState } from "@/features/guest/EmptyBillState";

export default async function TablePage({ params }: { params: Promise<{ tableToken: string }> }) {
  const { tableToken } = await params;

  try {
    const bill = await getGuestBillByTableToken(tableToken);
    return <GuestBillScreen bill={bill} />;
  } catch {
    return <EmptyBillState kind="not-found" />;
  }
}
```

- [ ] **Step 3: Add guest create-payment action**

Create `src/app/t/[tableToken]/actions.ts` with `"use server"`:

```ts
export async function createMockPaymentAction(input: {
  billId: string;
  itemIds: string[];
  tip: { type: "percent" | "fixed"; value: number };
}): Promise<{ paymentId: string }>;
```

The action calls `createMockPayment` and returns the payment ID for navigation to `/t/[tableToken]/checkout?paymentId=...`.

- [ ] **Step 4: Implement guest components**

`GuestBillScreen` must be a client component with:

- local selected item IDs
- selected tip input
- derived subtotal, tip, and total for display only
- submit handler calling `createMockPaymentAction`
- disabled checkout when no items are selected

`BillItemPicker` renders stable-height rows with checkbox controls.

`TipSelector` renders preset buttons for `0%`, `5%`, `10%`, `15%` and a custom amount input.

`CheckoutBar` sticks to the bottom of mobile viewport and shows selected total.

- [ ] **Step 5: Run checks**

Run:

```bash
npm run test
npm run build
```

Expected: tests pass and Next.js build succeeds.

- [ ] **Step 6: Commit guest selection UI**

Run:

```bash
git add src/app/t src/features/guest src/lib/telegram src/app/globals.css
git commit -m "feat: add guest bill selection"
```

## Task 8: Build Mock Checkout and Success Flow

**Files:**

- Create: `src/app/t/[tableToken]/checkout/page.tsx`
- Create: `src/app/t/[tableToken]/success/page.tsx`
- Create: `src/features/guest/MockCheckoutScreen.tsx`
- Create: `src/features/guest/PaymentSuccessScreen.tsx`
- Modify: `src/app/t/[tableToken]/actions.ts`

- [ ] **Step 1: Add confirm payment action**

Modify `src/app/t/[tableToken]/actions.ts`:

```ts
export async function confirmMockPaymentAction(input: {
  paymentId: string;
  outcome: "succeeded" | "failed";
}): Promise<{ status: "succeeded" | "failed" }>;
```

The action calls `confirmMockPayment`.

- [ ] **Step 2: Add checkout page**

Create `src/app/t/[tableToken]/checkout/page.tsx` as a server component that reads `paymentId` from `searchParams`, loads payment summary, and renders `MockCheckoutScreen`.

`MockCheckoutScreen` must offer:

- Confirm button
- Simulate failure button
- Back to bill link
- clear error message for item conflict

- [ ] **Step 3: Add success page**

Create `src/app/t/[tableToken]/success/page.tsx` rendering `PaymentSuccessScreen` with:

- payment total
- paid item count
- link back to the table bill

- [ ] **Step 4: Test conflict manually**

Run dev server:

```bash
npm run dev
```

Manual flow:

1. Open two browser tabs at `http://localhost:3000/t/demo-table-12`.
2. Select `Espresso` in both tabs.
3. Confirm checkout in the first tab.
4. Confirm checkout in the second tab.

Expected: first tab succeeds, second tab shows item conflict and the bill reloads.

- [ ] **Step 5: Commit checkout flow**

Run:

```bash
git add src/app/t src/features/guest
git commit -m "feat: add mock checkout flow"
```

## Task 9: Add End-to-End Tests and Local Documentation

**Files:**

- Create: `tests/e2e/admin-and-guest.spec.ts`
- Modify: `README.md`
- Modify: `.env.example`

- [ ] **Step 1: Write Playwright test**

Create `tests/e2e/admin-and-guest.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("admin creates an item and guest pays it", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("Admin access code").fill("demo-admin");
  await page.getByRole("button", { name: "Unlock" }).click();

  await page.getByLabel("Table label").fill("21");
  await page.getByRole("button", { name: "Create table" }).click();
  await expect(page.getByText("Table 21")).toBeVisible();

  const tableLink = await page.getByTestId("table-21-link").textContent();
  expect(tableLink).toContain("/t/");

  await page.goto(tableLink ?? "/");
  await expect(page.getByText("Unpaid items")).toBeVisible();

  await page.getByLabel("Espresso").check();
  await page.getByRole("button", { name: "Checkout" }).click();
  await page.getByRole("button", { name: "Confirm mock payment" }).click();
  await expect(page.getByText("Payment complete")).toBeVisible();
});
```

Adjust labels in components to match this test exactly.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run db:migrate
npm run db:seed
npm run test
npm run build
npm run test:e2e
```

Expected:

- database migration and seed finish successfully
- Vitest passes
- Next.js build succeeds
- Playwright happy path passes

- [ ] **Step 3: Write README**

Update `README.md` with:

- stack summary
- setup commands
- `DATABASE_URL=file:data/dev.db`
- seed command
- admin code `demo-admin`
- demo guest URL `http://localhost:3000/t/demo-table-12`
- note that payments and POS are mocked

- [ ] **Step 4: Commit verification and docs**

Run:

```bash
git add tests/e2e README.md .env.example
git commit -m "test: add mvp e2e coverage"
```

## Task 10: Final Verification

**Files:**

- No new files expected.

- [ ] **Step 1: Check repository status**

Run:

```bash
git status --short
```

Expected: no uncommitted changes.

- [ ] **Step 2: Run final checks**

Run:

```bash
npm run test
npm run build
npm run test:e2e
```

Expected: all commands pass.

- [ ] **Step 3: Start local dev server for user preview**

Run:

```bash
npm run dev
```

Expected: app is available at `http://localhost:3000`, admin is available at `http://localhost:3000/admin`, and demo guest flow is available at `http://localhost:3000/t/demo-table-12`.

## Self-Review

Spec coverage:

- Guest QR/deep-link flow is implemented in Tasks 7 and 8.
- Admin screen is implemented in Task 6.
- SQLite persistence is implemented in Task 2.
- Mock checkout is implemented in Tasks 5 and 8.
- POS adapter abstraction is implemented in Task 5.
- Whole-item-only payment rule is implemented in Tasks 4 and 5.
- Concurrent payment conflict is implemented in Task 5 and manually verified in Task 8.
- Unit, integration, and UI tests are implemented in Tasks 3, 4, 5, and 9.

Type consistency:

- Money values use integer cents in schema, services, and UI DTOs.
- Guest route parameter is consistently `tableToken`.
- Payment statuses are consistently `pending`, `succeeded`, and `failed`.
- Bill item statuses are consistently `unpaid` and `paid`.
