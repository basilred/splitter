## ADDED Requirements

### Requirement: Admin can view today's payment stats
The system SHALL show aggregated payment statistics for the current day.

#### Scenario: View today stats
- **WHEN** admin selects "📊 Статистика"
- **THEN** bot SHALL show: total revenue, total tips, payment count, average check
- **AND** apply default period "сегодня"

### Requirement: Admin can select stats period
The system SHALL allow admins to view stats for predefined periods.

#### Scenario: Select period
- **WHEN** admin selects a period button (Сегодня, Неделя, Месяц)
- **THEN** bot SHALL recalculate and show stats filtered by that period
- **AND** show period context in message header

#### Scenario: Empty period
- **WHEN** no payments exist for the selected period
- **THEN** bot SHALL show "Нет оплат за выбранный период"

### Requirement: Stats show breakdown by payment method
The system SHALL show how payments were made (card, cash, etc.) when data is available.

#### Scenario: Payment method breakdown
- **WHEN** admin views stats with mixed payment methods
- **THEN** bot SHALL show counts and totals per payment method

### Requirement: Bot shows top-selling menu items (future-ready)
The system SHALL show most frequently paid bill items when menu item data is available.

#### Scenario: Top items
- **WHEN** admin switches to "Товары" tab in stats
- **THEN** bot SHALL show top N items by payment count and revenue
