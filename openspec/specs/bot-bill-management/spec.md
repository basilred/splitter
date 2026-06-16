## ADDED Requirements

### Requirement: Admin can open a bill for a table
The system SHALL allow admins to create a new open bill for a table that has no open bill.

#### Scenario: Open bill successfully
- **WHEN** admin presses "Открыть счёт" for a table
- **THEN** bot SHALL create a new bill with status 'open'
- **AND** show empty bill with [➕ Добавить позицию] button

#### Scenario: Table already has open bill
- **WHEN** admin presses "Открыть счёт" for a table with an existing open bill
- **THEN** bot SHALL show error and display existing bill

### Requirement: Admin can add items to a bill from menu
The system SHALL allow admins to add menu item templates as bill items.

#### Scenario: Add item from menu
- **WHEN** admin selects "➕ Добавить" then "📋 Из меню"
- **THEN** bot SHALL show categories (if any) → items in category → admin selects item
- **AND** prompts for quantity (default 1)
- **AND** creates bill_item with name and unit_price from menu_item
- **AND** shows updated bill

#### Scenario: Add item with custom quantity
- **WHEN** admin enters a quantity > 1
- **THEN** bill_item SHALL have that quantity
- **AND** total shown as unitPrice × quantity

### Requirement: Admin can add custom items to a bill
The system SHALL allow admins to add arbitrary items with custom name and price.

#### Scenario: Add custom item
- **WHEN** admin selects "➕ Добавить" then "✏️ Своё название"
- **THEN** bot SHALL prompt: name → price (rubles, converted to kopeks) → quantity (default 1)
- **AND** creates bill_item with provided values

#### Scenario: Cancel during custom item input
- **WHEN** admin sends /cancel during any input step
- **THEN** bot SHALL clear awaiting state
- **AND** return to bill view

### Requirement: Admin can remove items from a bill
The system SHALL allow admins to remove unpaid items from a bill.

#### Scenario: Remove unpaid item
- **WHEN** admin presses delete on an unpaid item
- **THEN** bot SHALL ask for confirmation
- **AND** on confirm, delete bill_item
- **AND** show updated bill

#### Scenario: Cannot remove paid item
- **WHEN** admin presses delete on a paid item
- **THEN** bot SHALL show "Позиция уже оплачена, удаление невозможно"

### Requirement: Admin can edit item quantity
The system SHALL allow admins to change the quantity of unpaid bill items.

#### Scenario: Edit quantity
- **WHEN** admin presses edit on an unpaid item
- **THEN** bot SHALL prompt for new quantity
- **AND** update bill_item.quantity

### Requirement: Admin can view bill details
The system SHALL display full bill information including items with statuses.

#### Scenario: View bill
- **WHEN** admin views a bill
- **THEN** bot SHALL show each item with: name, quantity, unit price, total, status (paid/unpaid)
- **AND** show subtotal (unpaid), tips (paid), grand total

#### Scenario: Bill with mixed statuses
- **WHEN** bill has both paid and unpaid items
- **THEN** bot SHALL group items by status
- **AND** show clear visual separation

### Requirement: Admin can close a bill
The system SHALL allow admins to close a bill when all items are paid.

#### Scenario: Close fully paid bill
- **WHEN** admin presses "Закрыть счёт" and all items are paid
- **THEN** bot SHALL set bill status to 'closed'
- **AND** show bill summary (total paid, tips, guest count)

#### Scenario: Close with unpaid items
- **WHEN** admin presses "Закрыть счёт" with unpaid items
- **THEN** bot SHALL warn about unpaid items
- **AND** require confirmation before closing

### Requirement: Admin can view payment history per bill
The system SHALL show which payments were made for a bill.

#### Scenario: Show payments
- **WHEN** admin views bill with payments
- **THEN** bot SHALL list each payment: amount, tip, guest name, status, timestamp
