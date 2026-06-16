## ADDED Requirements

### Requirement: Bot notifies admin on new payment
The system SHALL send a push notification to the venue admin when a guest completes a payment.

#### Scenario: Successful payment notification
- **WHEN** a guest payment status changes to 'succeeded'
- **THEN** bot SHALL send message to admin's chat: "💵 Оплата 500₽ за столик 4 (Гость: Иван)"
- **AND** include the bill context: remaining unpaid amount

#### Scenario: Multiple admins
- **WHEN** venue has multiple admin users (owner + manager)
- **THEN** bot SHALL notify all admins with role 'owner' or 'manager'

### Requirement: Bot notifies admin when bill is fully paid
The system SHALL notify the admin when all items in a bill are paid.

#### Scenario: Bill fully paid
- **WHEN** the last unpaid item on a bill is paid
- **THEN** bot SHALL send: "✅ Счёт за столик 4 полностью оплачен! Сумма: 1500₽"

### Requirement: Notifications include quick actions
The system SHALL include inline buttons in notification messages for quick access.

#### Scenario: Notification with bill link
- **WHEN** admin receives a payment notification
- **THEN** message SHALL include [📋 Показать счёт] button
- **AND** pressing it SHALL open bill view in the bot

### Requirement: Admin can enable/disable notifications
The system SHALL allow admins to mute notifications per venue.

#### Scenario: Toggle notifications
- **WHEN** admin uses a notification toggle command
- **THEN** bot SHALL save preference in session or user settings
- **AND** stop/start sending notifications accordingly
