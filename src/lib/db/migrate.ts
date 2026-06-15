import Database from 'better-sqlite3';
import * as schema from './schema';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Running database migration...');

  // Создание подключения к базе данных
  const sqlite = new Database('data/split-bill.db');

  // Включение foreign keys
  sqlite.pragma('foreign_keys = ON');

  // Создание таблиц через drizzle-orm (используем run для каждой таблицы)
  // Но проще использовать drizzle-orm's migrate, однако для простоты используем raw SQL из схемы
  // Вместо этого создадим таблицы через drizzle-orm's `createTable` если они не существуют.
  // Однако drizzle-orm не имеет встроенного createTable. Используем drizzle-kit для миграций.
  // Для MVP просто выполним SQL из архитектурного документа.

  const createTablesSQL = `
    -- Заведение
    CREATE TABLE IF NOT EXISTS venues (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'RUB',
        tip_presets TEXT NOT NULL DEFAULT '[0,5,10,15]',
        pos_config TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    -- Столик
    CREATE TABLE IF NOT EXISTS tables (
        id TEXT PRIMARY KEY,
        venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        table_token TEXT NOT NULL UNIQUE,
        external_id TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
    CREATE INDEX IF NOT EXISTS tables_table_token_idx ON tables(table_token);
    CREATE INDEX IF NOT EXISTS tables_venue_id_idx ON tables(venue_id);

    -- Счет
    CREATE TABLE IF NOT EXISTS bills (
        id TEXT PRIMARY KEY,
        venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
        table_id TEXT NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'open',
        external_id TEXT,
        opened_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        closed_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
    CREATE INDEX IF NOT EXISTS bills_table_id_idx ON bills(table_id);
    CREATE INDEX IF NOT EXISTS bills_status_idx ON bills(status);

    -- Позиция счета
    CREATE TABLE IF NOT EXISTS bill_items (
        id TEXT PRIMARY KEY,
        bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        unit_price INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'unpaid',
        external_id TEXT,
        paid_at INTEGER,
        paid_by_guest_name TEXT,
        paid_by_telegram_id INTEGER,
        payment_id TEXT REFERENCES payments(id),
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
    CREATE INDEX IF NOT EXISTS bill_items_bill_id_status_idx ON bill_items(bill_id, status);
    CREATE INDEX IF NOT EXISTS bill_items_payment_id_idx ON bill_items(payment_id);

    -- Платеж
    CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending',
        item_subtotal INTEGER NOT NULL,
        tip_amount INTEGER NOT NULL DEFAULT 0,
        total_amount INTEGER NOT NULL,
        telegram_user_id INTEGER,
        guest_name TEXT,
        payment_method TEXT,
        payment_provider TEXT,
        provider_payment_id TEXT,
        metadata TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
    CREATE INDEX IF NOT EXISTS payments_bill_id_idx ON payments(bill_id);
    CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status);

    -- Связь платежа и позиций
    CREATE TABLE IF NOT EXISTS payment_items (
        payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        bill_item_id TEXT NOT NULL REFERENCES bill_items(id) ON DELETE CASCADE,
        amount_at_payment INTEGER NOT NULL,
        PRIMARY KEY (payment_id, bill_item_id)
    );

    -- События интеграции
    CREATE TABLE IF NOT EXISTS integration_events (
        id TEXT PRIMARY KEY,
        venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        processed INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
    CREATE INDEX IF NOT EXISTS integration_events_venue_id_processed_idx ON integration_events(venue_id, processed);
    CREATE INDEX IF NOT EXISTS integration_events_created_at_idx ON integration_events(created_at);

    -- Пользователи
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        telegram_id INTEGER UNIQUE,
        email TEXT UNIQUE,
        name TEXT NOT NULL,
        venue_id TEXT REFERENCES venues(id) ON DELETE SET NULL,
        role TEXT NOT NULL DEFAULT 'staff',
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
    CREATE INDEX IF NOT EXISTS users_venue_id_idx ON users(venue_id);

    -- Сессии
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
  `;

  // Выполняем SQL построчно
  const statements = createTablesSQL.split(';').filter(stmt => stmt.trim());
  for (const stmt of statements) {
    try {
      sqlite.exec(stmt + ';');
    } catch (err) {
      console.error('Error executing statement:', stmt);
      console.error(err);
      throw err;
    }
  }

  console.log('Migration completed successfully.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
