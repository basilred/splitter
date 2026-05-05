# Telegram Mini App Split Bill MVP Design

Date: 2026-05-05

## Purpose

Build a Telegram Mini Web App for bars, cafes, and restaurants where guests at the same table can pay for only their own unpaid items without waiting for the full group to finish. The first release is an MVP without real payments. It validates the core user flow with a mock checkout while keeping the architecture ready for real payment providers and POS/accounting system integrations.

## Scope

The MVP includes:

- A guest-facing Telegram Mini App opened from a table QR/deep link.
- A simple admin screen for staff to create tables, open bills, add items, and view paid/unpaid status.
- SQLite persistence.
- Mock checkout that marks selected items as paid after confirmation.
- A POS integration abstraction with a mock adapter.

The MVP does not include:

- Real payment processing.
- Splitting one item between multiple guests.
- Manual table selection by the guest.
- Production-grade staff authentication.
- Direct integration with iiko, r_keeper, Poster, or another specific POS system.

## Recommended Stack

Use a single Next.js full-stack project:

- Next.js with TypeScript for frontend, admin UI, and server routes.
- React for UI.
- SQLite for local persistence.
- A lightweight database layer suitable for Next.js server code.
- Telegram WebApp SDK only in the guest-facing flow.

This keeps the project JavaScript/TypeScript-first, easy to run locally, and simple enough for a fast MVP while preserving clear boundaries for later production work.

## Architecture

The application has two main interfaces:

- Guest flow: `/t/[tableToken]`
- Admin flow: `/admin`

The guest route is intended to be opened from a QR code placed on a physical table. The QR link contains a private `tableToken`, so the guest lands directly on the correct table without entering a table number manually.

The admin route lets staff manage the demo venue, tables, open bills, bill items, and QR/deep links. In the MVP, the admin UI uses a development-only access code. Production-grade authentication is out of scope.

Server-side code owns all business rules. React components should not be the source of truth for payment totals, item availability, or paid status. Guest and admin screens call server routes/actions that delegate to domain services.

## Data Model

### Venue

Represents a restaurant, bar, or cafe.

Fields:

- `id`
- `name`
- `currency`
- `tipPresets`
- timestamps

### Table

Represents a physical table inside a venue.

Fields:

- `id`
- `venueId`
- `label`
- `tableToken`
- optional `externalId` for future POS integration
- timestamps

`tableToken` is used in QR/deep links and must be treated as a private capability URL.

### Bill

Represents an open or closed bill for a table.

Fields:

- `id`
- `venueId`
- `tableId`
- `status`: `open` or `closed`
- optional `externalId` for future POS integration
- timestamps

In the MVP, a table can have at most one open bill at a time.

### BillItem

Represents one payable line item on a bill.

Fields:

- `id`
- `billId`
- `name`
- `unitPrice`
- `quantity`
- `status`: `unpaid` or `paid`
- optional `paidAt`
- optional `paidByGuestName`
- optional `paidByTelegramId`
- optional `paymentId`
- timestamps

The MVP supports paying only whole line items. Partial item splitting is explicitly out of scope.

### Payment

Represents a mock checkout attempt.

Fields:

- `id`
- `billId`
- `status`: `pending`, `succeeded`, or `failed`
- `itemSubtotal`
- `tipAmount`
- `totalAmount`
- optional `telegramUserId`
- optional `guestName`
- timestamps

The server recalculates all amounts before creating or confirming a payment.

### PaymentItem

Join table between `Payment` and `BillItem`.

Fields:

- `paymentId`
- `billItemId`
- `amountAtPayment`

### IntegrationEvent

Small append-only log for integration-facing events.

Fields:

- `id`
- `type`
- `payload`
- timestamps

Events include bill creation, item creation, successful mock payment, and bill closure. This gives future POS adapters a clear event trail and helps debug synchronization behavior.

## Domain Services

### billService

Responsibilities:

- Resolve a table by `tableToken`.
- Load the open bill for a table.
- Return unpaid items for the guest UI.
- Add bill items from the admin UI.
- Close a bill only when it has no unpaid items.
- Validate that selected items still belong to an open bill and remain unpaid.

### paymentService

Responsibilities:

- Create a mock payment for selected unpaid items.
- Recalculate subtotal, tip, and total on the server.
- Confirm mock checkout.
- Atomically mark selected items as paid.
- Reject conflicting payments when another guest has already paid one or more selected items.
- Record integration events after successful payment.

### posAdapter

Define an interface that can support future integrations:

```ts
interface POSAdapter {
  getOpenBill(tableExternalId: string): Promise<ExternalBill | null>;
  syncBill(tableId: string): Promise<void>;
  markItemsPaid(paymentId: string): Promise<void>;
}
```

The MVP uses `MockPOSAdapter`, which works against local SQLite data and records integration events. No concrete POS system is targeted in the first release.

## Guest User Flow

1. Guest scans the table QR code.
2. Telegram opens `/t/[tableToken]`.
3. The app loads the venue, table, open bill, and unpaid items.
4. Guest selects one or more whole items.
5. Guest chooses a tip preset: `0%`, `5%`, `10%`, `15%`, or custom amount.
6. Server recalculates the total.
7. Guest sees a mock checkout screen.
8. Guest confirms mock checkout.
9. Server validates item availability again and marks selected items as paid.
10. Guest sees a success screen.

## Admin User Flow

1. Staff opens `/admin`.
2. Staff creates or uses the demo venue.
3. Staff creates a table.
4. Staff sees the QR/deep link for that table.
5. Staff opens a bill for the table.
6. Staff adds bill items.
7. Staff sees which items are unpaid and which have been paid by guests.
8. Staff closes the bill after the unpaid balance reaches zero.

## Error Handling

Invalid `tableToken`:

- Show a table-not-found state.

No open bill:

- Show a no-open-bill state with refresh support.

All items are paid:

- Show an all-paid state.

Two guests pay the same item concurrently:

- The first confirmed payment succeeds.
- The second confirmation fails with an item-already-paid response.
- The guest UI reloads the bill state and asks the guest to choose again.

Mock checkout failure:

- Keep all selected items unpaid.
- Show retry support.

Bill closes during guest checkout:

- Reject checkout confirmation.
- Reload the guest bill state.

## Testing

Unit tests:

- Subtotal calculation.
- Tip calculation.
- Total calculation.
- Validation that selected items are unpaid and belong to the open bill.
- Bill close rule when unpaid items remain.

Integration tests:

- Create table.
- Open bill.
- Add bill item.
- Complete successful mock payment.
- Reject conflicting payment for an already paid item.

UI tests:

- Guest happy path from table URL to successful mock payment.
- Admin path for creating a table, opening a bill, and adding a position.

## Future Extensions

Real payments:

- Replace mock checkout with a provider-backed checkout while keeping server-side total recalculation and item locking rules.

POS integrations:

- Add concrete adapters for systems such as iiko, r_keeper, Poster, or other regional restaurant systems.
- Map external table IDs, bill IDs, and item IDs onto the local model.
- Support inbound sync from POS and outbound paid-item confirmation.

Item splitting:

- Add split allocations only after the whole-item flow is validated.

Authentication:

- Add production staff authentication and role-based access when the admin UI moves beyond local/demo use.

## Acceptance Criteria

- A guest can open a table-specific URL and see unpaid items for that table.
- A guest can select whole items, add a tip, complete mock checkout, and see success.
- Paid items disappear from the unpaid guest list.
- The admin can create a table, open a bill, add items, view payment status, and close a fully paid bill.
- The server prevents two guests from paying the same item twice.
- POS integration concerns are isolated behind `POSAdapter` and integration events.
