# Telegram Mini App — Разделение счетов

Приложение для разделения счетов в заведениях через Telegram Mini Apps с управлением через Telegram бота.

## Функциональность

- **Telegram Mini App**: Гости сканируют QR-код столика, открывают мини-приложение в Telegram, выбирают позиции и оплачивают свою часть счета.
- **Telegram бот для администраторов**: Управление столиками, генерация QR-кодов, просмотр статистики.
- **Админ-панель**: Веб-интерфейс для управления заведениями, столиками, счетами.
- **Интеграция с POS-системами**: Синхронизация данных с кассовыми системами.

## Установка и запуск

### Предварительные требования

- Node.js 18+ и npm
- SQLite (используется встроенный better-sqlite3)
- Аккаунт Telegram и бот через [@BotFather](https://t.me/BotFather)

### 1. Клонирование и установка зависимостей

```bash
git clone <repository-url>
cd tg-mini-app
npm install
```

### 2. Настройка переменных окружения

Скопируйте `.env.example` в `.env.local` и заполните значения:

```bash
cp .env.example .env.local
```

Отредактируйте `.env.local`:

```env
DATABASE_URL=file:data/dev.db
ADMIN_ACCESS_CODE=demo-admin

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here  # Получите у @BotFather
TELEGRAM_WEBHOOK_SECRET=optional_secret_for_webhook_verification

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
TELEGRAM_WEBHOOK_URL=${NEXT_PUBLIC_APP_URL}/api/telegram-webhook
```

### 3. Инициализация базы данных

```bash
npm run db:migrate
```

### 4. Запуск приложения в режиме разработки

```bash
npm run dev
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000).

## Настройка Telegram бота

### Создание бота

1. Откройте Telegram и найдите [@BotFather](https://t.me/BotFather).
2. Отправьте команду `/newbot` и следуйте инструкциям.
3. Скопируйте полученный токен и вставьте в `TELEGRAM_BOT_TOKEN` в `.env.local`.

### Режимы работы бота

Бот может работать в двух режимах:

#### 1. Вебхук (рекомендуется для продакшена)

Вебхук автоматически настраивается при запуске приложения, если доступен публичный URL (например, через ngrok или развертывание).

Чтобы установить вебхук вручную:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_WEBHOOK_URL>"
```

Где `<YOUR_WEBHOOK_URL>` — это `https://ваш-домен/api/telegram-webhook`.

#### 2. Polling (для локальной разработки)

Если вы работаете локально без публичного URL, запустите бота в режиме polling:

Создайте файл `scripts/bot-polling.ts`:

```typescript
import { bot } from '@/lib/telegram-bot';

console.log('Starting bot in polling mode...');
bot.start();
```

Запустите его:

```bash
npx tsx scripts/bot-polling.ts
```

### Команды бота

После настройки бота администраторы заведений могут использовать следующие команды:

- `/start` — приветствие и инструкция
- `/help` — справка по командам
- `/create_table <название>` — создать новый столик
- `/my_tables` — список активных столиков заведения
- `/qr <token>` — сгенерировать QR-код для столика
- `/stats` — статистика по оплатам за сегодня

### Привязка администратора к заведению

Перед использованием команд администратор должен быть привязан к заведению через админ-панель:

1. Откройте админ-панель: `http://localhost:3000/admin`
2. Войдите с кодом доступа (по умолчанию `demo-admin`)
3. Создайте заведение и пользователя, указав Telegram ID администратора.

## Разработка

### Структура проекта

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   │   ├── telegram-webhook/  # Вебхук для Telegram бота
│   │   ├── tables/        # API столиков
│   │   └── ...
│   ├── admin/             # Админ-панель
│   ├── table/[token]/     # Страница столика для гостей
│   └── payment/[id]/      # Страница оплаты
├── components/            # React компоненты
├── lib/
│   ├── telegram-bot/      # Модуль Telegram бота
│   │   ├── index.ts       # Инициализация бота и команды
│   │   ├── middleware.ts  # Аутентификация администратора
│   │   └── qr.ts          # Генерация QR-кодов
│   ├── services/          # Бизнес-логика (TableService, VenueService и т.д.)
│   └── db/                # Работа с базой данных (Drizzle ORM)
└── types/                 # TypeScript типы
```

### Добавление новых команд бота

1. Откройте `src/lib/telegram-bot/index.ts`
2. Добавьте обработчик команды:

```typescript
bot.command('new_command', async (ctx) => {
  await ctx.reply('Ответ на команду');
});
```

3. Перезапустите бота (вебхук или polling).

### Тестирование

Запуск unit-тестов:

```bash
npm test
```

Запуск e2e-тестов (Playwright):

```bash
npm run test:e2e
```

## Развертывание

### Подготовка к продакшену

Перед развертыванием убедитесь, что:
- Все тесты проходят (`npm test`)
- Сборка успешна (`npm run build`)
- База данных мигрирована (`npm run db:migrate`)
- Переменные окружения настроены (см. `.env.example`)

### На Vercel (рекомендуется)

1. Подключите репозиторий к Vercel.
2. Установите переменные окружения в настройках проекта:
   - `DATABASE_URL` (используйте Vercel Postgres или оставьте SQLite файл в `/tmp`)
   - `TELEGRAM_BOT_TOKEN`
   - `NEXT_PUBLIC_APP_URL` (автоматически определяется Vercel)
   - `ADMIN_ACCESS_CODE`
3. Деплой произойдет автоматически при пуше в ветку `main`.
4. После деплоя настройте вебхук Telegram бота:
   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_VERCEL_URL>/api/telegram-webhook"
   ```

### На Railway

1. Создайте новый проект Railway и подключите репозиторий.
2. Добавьте переменные окружения через панель Railway.
3. Railway автоматически определит `start` скрипт и запустит приложение.
4. Для базы данных используйте Railway PostgreSQL или SQLite (файловая система эфемерна).
5. Используйте `npm run deploy:railway` для деплоя через CLI.

### На собственном сервере (Docker)

Пример `Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data
COPY --from=builder /app/next.config.ts ./
EXPOSE 3000
CMD ["npm", "start"]
```

Запуск:
```bash
docker build -t tg-mini-app .
docker run -p 3000:3000 --env-file .env.production tg-mini-app
```

### Настройка вебхука Telegram бота

Для продакшена требуется HTTPS. Убедитесь, что ваш домен имеет SSL‑сертификат (автоматически на Vercel/Railway).

Установите вебхук:
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<URL>/api/telegram-webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Проверьте статус:
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

### Миграции базы данных

При каждом деплое миграции выполняются автоматически через скрипт `prebuild`. Для ручного запуска:
```bash
npm run db:migrate
```

Для продакшена рекомендуется заменить SQLite на PostgreSQL (более надежная). Используйте переменную `DATABASE_URL` вида `postgresql://user:pass@host:5432/db`.

## Мониторинг и логирование

### Health check

Приложение предоставляет эндпоинт `/api/health` для проверки работоспособности. Используйте его в мониторинге (UptimeRobot, Better Stack и т.д.).

```bash
curl -f https://ваш-домен/api/health
```

### Логирование

- Уровень логирования управляется переменной `LOG_LEVEL` (по умолчанию `info`).
- Логи выводятся в stdout/stderr (собираются хостингом).
- Для продвинутого логирования подключите Sentry (укажите `SENTRY_DSN`).

### Метрики

- Используйте встроенные метрики Next.js (App Router).
- Для сбора бизнес-метрик (количество оплат, активных столиков) расширьте `IntegrationService`.

### Рекомендации по масштабированию

1. **База данных**: Замените SQLite на PostgreSQL (например, через Supabase, Railway Postgres).
2. **Кэширование**: Добавьте Redis для кэширования часто запрашиваемых данных (списки столиков).
3. **Фоновая обработка**: Используйте очереди (BullMQ) для отправки уведомлений и синхронизации с POS.
4. **Статика**: Разместите статические файлы на CDN (Vercel Edge Network).

## Переменные окружения

| Переменная | Обязательно | Описание | Пример |
|------------|-------------|----------|--------|
| `DATABASE_URL` | Да | Путь к базе данных | `file:data/prod.db` или `postgresql://...` |
| `ADMIN_ACCESS_CODE` | Да | Код доступа к админ-панели | `secure-code` |
| `TELEGRAM_BOT_TOKEN` | Да | Токен Telegram бота | `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11` |
| `TELEGRAM_WEBHOOK_SECRET` | Нет | Секрет для верификации вебхука | `my-secret` |
| `NEXT_PUBLIC_APP_URL` | Да | Публичный URL приложения | `https://ваш-домен.vercel.app` |
| `TELEGRAM_WEBHOOK_URL` | Нет | Полный URL вебхука (автоматически) | `${NEXT_PUBLIC_APP_URL}/api/telegram-webhook` |
| `YOOKASSA_SHOP_ID` | Нет | ID магазина ЮKassa | `123456` |
| `YOOKASSA_SECRET_KEY` | Нет | Секретный ключ ЮKassa | `test_...` |
| `STRIPE_SECRET_KEY` | Нет | Секретный ключ Stripe | `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | Нет | Публичный ключ Stripe | `pk_test_...` |
| `LOG_LEVEL` | Нет | Уровень логирования (`error`, `warn`, `info`, `debug`) | `info` |
| `SENTRY_DSN` | Нет | DSN для Sentry | `https://...@sentry.io/...` |

## Скрипты package.json

| Скрипт | Назначение |
|--------|------------|
| `dev` | Запуск dev-сервера |
| `build` | Сборка для продакшена |
| `start` | Запуск продакшен-сервера |
| `lint` | Проверка типов TypeScript |
| `test` | Запуск unit-тестов (Vitest) |
| `test:watch` | Запуск тестов в watch-режиме |
| `test:e2e` | Запуск e2e-тестов (Playwright) |
| `db:migrate` | Выполнение миграций базы данных |
| `db:seed` | Заполнение тестовыми данными |
| `prebuild` | Автоматически запускает миграции перед сборкой |
| `postinstall` | Запускает миграции после установки зависимостей |
| `deploy:vercel` | Деплой на Vercel (требуется CLI) |
| `deploy:railway` | Деплой на Railway (требуется CLI) |
| `health` | Проверка health-check локально |


## Лицензия

MIT
