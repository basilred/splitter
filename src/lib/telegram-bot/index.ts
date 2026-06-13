import { Bot, Context, session, SessionFlavor, InputFile } from 'grammy';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, type User } from '../db/schema';
import { TableService } from '../services/TableService';
import { VenueService } from '../services/VenueService';
import { PaymentService } from '../services/PaymentService';
import { generateQRCode } from './qr';
import { authenticate, isAdmin } from './middleware';

// Типы сессии (пока пустая, можно расширить)
interface SessionData {
  venueId?: string;
}

type MyContext = Context & SessionFlavor<SessionData>;

// Инициализация бота
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
}

export const bot = new Bot<MyContext>(token);

// Сессия (память в процессе, для продакшена нужно хранилище)
bot.use(session({ initial: (): SessionData => ({}) }));

// Middleware для аутентификации администратора
bot.use(authenticate as any);

// Команды
bot.command('start', async (ctx) => {
  await ctx.reply(
    `👋 Привет, ${ctx.from?.first_name || 'администратор'}!\n\n` +
    `Я бот для управления разделением счетов в заведениях.\n` +
    `С моей помощью вы можете:\n` +
    `• Создавать столики (/create_table)\n` +
    `• Просматривать свои столики (/my_tables)\n` +
    `• Генерировать QR-коды для столиков (/qr <token>)\n` +
    `• Смотреть статистику оплат (/stats)\n\n` +
    `Используйте /help для списка команд.`
  );
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    `📋 Доступные команды:\n\n` +
    `/start - приветствие и инструкция\n` +
    `/help - эта справка\n` +
    `/create_table <название> - создать новый столик\n` +
    `/my_tables - список ваших столиков\n` +
    `/qr <token> - сгенерировать QR-код для столика\n` +
    `/stats - статистика по оплатам за сегодня\n\n` +
    `Для создания столика укажите название после команды, например:\n` +
    `/create_table Столик 5`
  );
});

bot.command('create_table', async (ctx) => {
  // Проверка, что пользователь администратор заведения
  if (!await isAdmin(ctx)) {
    await ctx.reply('❌ У вас нет прав администратора заведения. Обратитесь к владельцу.');
    return;
  }

  const text = ctx.message?.text;
  const args = text?.split(' ').slice(1);
  const label = args?.join(' ');

  if (!label) {
    await ctx.reply('Укажите название столика: /create_table <название>');
    return;
  }

  try {
    const venueId = ctx.session.venueId;
    if (!venueId) {
      await ctx.reply('❌ Не удалось определить ваше заведение. Проверьте привязку аккаунта.');
      return;
    }

    const tableService = TableService();
    const table = await tableService.create({ venueId, label });

    await ctx.reply(
      `✅ Столик "${label}" создан!\n\n` +
      `Токен: \`${table.tableToken}\`\n` +
      `ID: ${table.id}\n\n` +
      `Ссылка для гостей: ${process.env.NEXT_PUBLIC_APP_URL}/table/${table.tableToken}\n` +
      `Используйте /qr ${table.tableToken} для получения QR-кода.`
    );
  } catch (error) {
    console.error('Error creating table:', error);
    await ctx.reply('❌ Ошибка при создании столика. Проверьте данные и попробуйте снова.');
  }
});

bot.command('my_tables', async (ctx) => {
  if (!await isAdmin(ctx)) {
    await ctx.reply('❌ У вас нет прав администратора заведения.');
    return;
  }

  const venueId = ctx.session.venueId;
  if (!venueId) {
    await ctx.reply('❌ Не удалось определить ваше заведение.');
    return;
  }

  try {
    const tableService = TableService();
    const tables = await tableService.listByVenue(venueId, true);

    if (tables.length === 0) {
      await ctx.reply('📭 У вас пока нет активных столиков. Создайте первый с помощью /create_table');
      return;
    }

    let message = `📋 Ваши активные столики (${tables.length}):\n\n`;
    tables.forEach((table, idx) => {
      message += `${idx + 1}. ${table.label}\n`;
      message += `   Токен: \`${table.tableToken}\`\n`;
      message += `   Ссылка: ${process.env.NEXT_PUBLIC_APP_URL}/table/${table.tableToken}\n\n`;
    });

    await ctx.reply(message);
  } catch (error) {
    console.error('Error fetching tables:', error);
    await ctx.reply('❌ Ошибка при получении списка столиков.');
  }
});

bot.command('qr', async (ctx) => {
  const text = ctx.message?.text;
  const args = text?.split(' ').slice(1);
  const token = args?.[0];

  if (!token) {
    await ctx.reply('Укажите токен столика: /qr <token>');
    return;
  }

  try {
    const tableService = TableService();
    const table = await tableService.getByToken(token);
    if (!table) {
      await ctx.reply('❌ Столик с таким токеном не найден.');
      return;
    }

    // Проверка, что столик принадлежит заведению администратора
    if (!await isAdmin(ctx) || ctx.session.venueId !== table.venueId) {
      await ctx.reply('❌ У вас нет доступа к этому столику.');
      return;
    }

    const url = `${process.env.NEXT_PUBLIC_APP_URL}/table/${token}`;
    const qrBuffer = await generateQRCode(url);

    await ctx.replyWithPhoto(new InputFile(qrBuffer, `qr-${token}.png`), {
      caption: `QR-код для столика "${table.label}"\nТокен: \`${token}\`\nСсылка: ${url}`,
    });
  } catch (error) {
    console.error('Error generating QR:', error);
    await ctx.reply('❌ Ошибка при генерации QR-кода.');
  }
});

bot.command('stats', async (ctx) => {
  if (!await isAdmin(ctx)) {
    await ctx.reply('❌ У вас нет прав администратора заведения.');
    return;
  }

  const venueId = ctx.session.venueId;
  if (!venueId) {
    await ctx.reply('❌ Не удалось определить ваше заведение.');
    return;
  }

  try {
    const paymentService = PaymentService();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // В реальности нужно добавить метод в PaymentService для статистики по заведению
    // Пока заглушка
    await ctx.reply(
      `📊 Статистика оплат за сегодня (${today.toLocaleDateString('ru-RU')}):\n\n` +
      `• Успешных платежей: 0\n` +
      `• Сумма: 0 ₽\n` +
      `• Средний чек: 0 ₽\n\n` +
      `Функционал статистики в разработке.`
    );
  } catch (error) {
    console.error('Error fetching stats:', error);
    await ctx.reply('❌ Ошибка при получении статистики.');
  }
});

// Обработка неизвестных команд
bot.on('message', async (ctx) => {
  if (ctx.message?.text?.startsWith('/')) {
    await ctx.reply('Неизвестная команда. Используйте /help для списка команд.');
  }
});

// Экспорт функции запуска бота
export function startBot() {
  console.log('Starting Telegram bot...');
  bot.start();
}

// Экспорт функции остановки бота
export function stopBot() {
  console.log('Stopping Telegram bot...');
  bot.stop();
}

// Экспорт для использования в вебхуке
export default bot;
