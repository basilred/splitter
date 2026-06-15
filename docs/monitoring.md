# Мониторинг и логирование

## Health check

Приложение предоставляет эндпоинт `/api/health`, который проверяет:
- Подключение к базе данных
- Доступность API

Пример ответа:
```json
{
  "status": "healthy",
  "timestamp": "2026-05-06T17:53:12.836Z",
  "services": {
    "database": "ok",
    "api": "ok"
  }
}
```

Используйте этот эндпоинт для мониторинга доступности (UptimeRobot, Better Stack, AWS CloudWatch).

## Логирование

### Уровни логирования

Управляется переменной окружения `LOG_LEVEL`:
- `error` — только ошибки
- `warn` — предупреждения и ошибки
- `info` — информационные сообщения (по умолчанию)
- `debug` — отладочная информация

### Структура логов

Логи выводятся в stdout/stderr в формате JSON (в продакшене) или текстовом (в разработке).

Пример лога:
```json
{
  "level": "info",
  "message": "Table created",
  "timestamp": "2026-05-06T17:53:12.836Z",
  "service": "TableService",
  "tableId": "123e4567-e89b-12d3-a456-426614174000",
  "venueId": "venue-1"
}
```

### Контекстное логирование

В сервисах используется контекстное логирование для отслеживания операций:

```typescript
import { logger } from '@/lib/logger';

logger.info('Payment created', {
  paymentId: payment.id,
  billId: payment.billId,
  amount: payment.totalAmount,
});
```

## Интеграция с Sentry

Для отслеживания ошибок в продакшене подключите Sentry:

1. Получите DSN в [Sentry.io](https://sentry.io)
2. Установите переменную окружения `SENTRY_DSN`
3. Ошибки будут автоматически отправляться в Sentry

Конфигурация уже включена в `next.config.ts` (при наличии `SENTRY_DSN`).

## Метрики

### Встроенные метрики Next.js

Next.js предоставляет метрики через эндпоинт `/_next/static/chunks/next-buildid-*.js` (внутренние). Для сбора метрик используйте:

- **Vercel Analytics** (если развернуто на Vercel)
- **Custom metrics** через экспорт в Prometheus (требует настройки)

### Бизнес-метрики

Для отслеживания бизнес-показателей расширьте `IntegrationService`:

```typescript
// Пример отправки метрики
await integrationService.emitEvent('payment_succeeded', {
  paymentId: payment.id,
  amount: payment.totalAmount,
  venueId: bill.venueId,
});
```

Метрики можно отправлять в:
- **PostHog** для аналитики
- **Amplitude** для пользовательской аналитики
- **Google Analytics** через Measurement Protocol

## Алертинг

Настройте алерты на основе:

1. **Health check failures** — если `/api/health` возвращает статус ≠ 200 более 5 минут.
2. **Высокая ошибка платежей** — если >5% платежей завершаются статусом `failed` за час.
3. **Низкая активность** — если за последний час не создано ни одного столика (для продакшена).

### Инструменты для алертинга

- **Better Stack** — мониторинг uptime + алерты
- **Datadog** — полноценный мониторинг инфраструктуры
- **PagerDuty** — управление инцидентами
- **Telegram бот** — кастомные уведомления через ваш же бот

## Рекомендации по продакшену

### Логирование в продакшене

- Все логи должны собираться в централизованное хранилище (ELK, Loki, CloudWatch).
- Не логируйте чувствительные данные (токены, пароли, номера карт).
- Используйте structured logging для удобства анализа.

### Мониторинг производительности

- Отслеживайте время ответа API (`/api/*`).
- Мониторьте использование памяти и CPU процесса Node.js.
- Настройте алерты на высокую загрузку CPU (>80% более 5 минут).

### Резервное копирование базы данных

- Для SQLite: регулярно копируйте файл `data/split-bill.db` в S3/Google Cloud Storage.
- Для PostgreSQL: используйте встроенные механизмы бэкапов хостинга (Railway, Supabase).

### Аварийное восстановление

1. **База данных недоступна** — приложение возвращает 503, health check падает.
2. **Telegram API недоступен** — платежи продолжают работать, но уведомления не отправляются.
3. **Платежный шлюз недоступен** — платежи помечаются как `pending`, повторная попытка через 5 минут.

## Пример конфигурации для Vercel

В `vercel.json`:
```json
{
  "env": {
    "LOG_LEVEL": "info",
    "SENTRY_DSN": "@sentry_dsn"
  },
  "regions": ["fra1"],
  "functions": {
    "app/api/*.ts": {
      "maxDuration": 10
    }
  }
}
```

## Пример конфигурации для Railway

В `railway.toml`:
```toml
[service]
name = "tg-mini-app"
start = "npm start"
healthcheck = "/api/health"

[variables]
LOG_LEVEL = "info"
DATABASE_URL = "postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}"

[deploy]
autoDeploy = true
