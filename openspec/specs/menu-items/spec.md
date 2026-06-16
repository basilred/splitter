## ADDED Requirements

### Requirement: Admin can create menu items
The system SHALL allow venue admins (owner/manager) to create menu item templates with name, price (in kopeks), and optional category.

#### Scenario: Successful creation from bot
- **WHEN** admin uses "Добавить позицию меню" in bot
- **THEN** bot prompts for name, price, and category
- **AND** creates a new menu item record in the database
- **AND** confirms creation to the admin

#### Scenario: Validation failure
- **WHEN** admin provides empty name or non-numeric price
- **THEN** bot SHALL reject with an error message
- **AND** prompt to re-enter

### Requirement: Admin can list and filter menu items
The system SHALL allow admins to view all menu items grouped by category.

#### Scenario: View full menu
- **WHEN** admin opens menu management
- **THEN** bot SHALL show categories with items and prices

#### Scenario: Filter by category
- **WHEN** admin selects a specific category
- **THEN** bot SHALL show only items in that category

### Requirement: Admin can edit menu items
The system SHALL allow admins to update name, price, or category of existing menu items.

#### Scenario: Edit price
- **WHEN** admin edits an item's price
- **THEN** bot SHALL prompt for new price
- **AND** update the record

### Requirement: Admin can delete / deactivate menu items
The system SHALL allow admins to deactivate menu items (soft delete via `is_active` flag).

#### Scenario: Deactivate item
- **WHEN** admin deletes a menu item
- **THEN** bot SHALL set `is_active = false`
- **AND** the item SHALL not appear in menu listings

### Requirement: Admin can manage categories
The system SHALL allow admins to create, rename, reorder, and delete menu categories.

#### Scenario: Create category
- **WHEN** admin creates a new category
- **THEN** bot SHALL prompt for category name
- **AND** create the category with incremented sort_order

#### Scenario: Delete category with items
- **WHEN** admin deletes a non-empty category
- **THEN** bot SHALL warn about associated items
- **AND** require confirmation
