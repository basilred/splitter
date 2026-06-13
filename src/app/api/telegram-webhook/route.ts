import { NextRequest, NextResponse } from 'next/server';
import { bot } from '@/lib/telegram-bot';

// Верификация вебхука (опционально, можно добавить секретный токен)
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Проверка метода (Telegram отправляет POST)
    if (request.method !== 'POST') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // Можно добавить проверку секрета, если задан
    if (WEBHOOK_SECRET) {
      const secret = request.headers.get('x-telegram-webhook-secret');
      if (secret !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Получение обновления от Telegram
    const update = await request.json();

    // Обработка обновления через бота
    await bot.handleUpdate(update);

    // Ответ 200 OK
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET для проверки работоспособности вебхука
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Telegram webhook endpoint is running',
    timestamp: new Date().toISOString(),
    bot: bot.botInfo ? `@${bot.botInfo.username}` : 'not initialized',
  });
}