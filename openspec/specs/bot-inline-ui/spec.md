## ADDED Requirements

### Requirement: Bot shows main menu with inline buttons
The system SHALL display a main menu with inline keyboard after `/start` and at every navigation root.

#### Scenario: Main menu display
- **WHEN** admin sends /start or presses "На главную"
- **THEN** bot SHALL show buttons: [📋 Мои столики] [📊 Статистика] [⚙️ Заведение]
- **AND** brief context message

### Requirement: Navigation remembers context
The system SHALL maintain current view context per user in session.

#### Scenario: Back navigation
- **WHEN** admin presses [🔙 Назад]
- **THEN** bot SHALL return to previous menu level
- **AND** update message with appropriate content

### Requirement: Bot shows table list with inline buttons
The system SHALL display all active tables for the venue with inline keyboard.

#### Scenario: List tables
- **WHEN** admin selects "Мои столики"
- **THEN** bot SHALL show list of tables with [🔍 Показать] button each
- **AND** a [➕ Создать столик] button at the bottom

#### Scenario: Empty table list
- **WHEN** venue has no active tables
- **THEN** bot SHALL show "У вас пока нет столиков" with [➕ Создать столик] button

### Requirement: Bot shows table detail with context
The system SHALL show table details including current bill status and action buttons.

#### Scenario: View table
- **WHEN** admin selects a specific table
- **THEN** bot SHALL show table name, open bill status (if any), QR link
- **AND** buttons: [📋 Счёт] [🔄 Сменить название] [❌ Деактивировать]

#### Scenario: Table with no open bill
- **WHEN** table has no open bill
- **THEN** bot SHALL show [➕ Открыть счёт] button

#### Scenario: Table with open bill
- **WHEN** table has an open bill
- **THEN** bot SHALL show bill summary and [📋 Счёт] button

### Requirement: Bot shows venue settings menu
The system SHALL show venue configuration options for owners/managers.

#### Scenario: Venue settings
- **WHEN** admin selects "⚙️ Заведение"
- **THEN** bot SHALL show [📋 Меню] [👥 Персонал] [⚙️ Настройки] buttons
