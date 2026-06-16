import { bot } from './bot';
import { authenticate } from './middleware';
import { mainRouter } from './handlers/main';
import { tableRouter } from './handlers/tables';
import { billRouter } from './handlers/bills';
import { menuRouter } from './handlers/menu';
import { statsRouter } from './handlers/stats';
import { cbNav, parseCallbackData, cbBill } from './router';
import { clearAwaitingInput } from './session';
import { InlineKeyboard } from 'grammy';

export type MyContext = import('./session').MyContext;

// Auth middleware
bot.use(authenticate as any);

// Register handlers
bot.use(mainRouter);
bot.use(tableRouter);
bot.use(billRouter);
bot.use(menuRouter);
bot.use(statsRouter);

// Catch unhandled callback queries (callback data that doesn't match any handler)
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const parsed = parseCallbackData(data);

  if (parsed) {
    await ctx.answerCallbackQuery();
  } else {
    await ctx.answerCallbackQuery('❌ Неизвестная команда');
    await ctx.editMessageText(
      'Неизвестное действие. Используйте /start для возврата в главное меню.',
      { reply_markup: new InlineKeyboard().text('🏠 На главную', cbNav.main()) },
    );
  }
});

// Handle /cancel as global command
bot.command('cancel', async (ctx) => {
  if (ctx.session.awaitingInput) {
    clearAwaitingInput(ctx.session);
    await ctx.reply('❌ Действие отменено.', {
      reply_markup: new InlineKeyboard().text('🏠 На главную', cbNav.main()),
    });
  }
});

export { bot, startBot, stopBot } from './bot';
export default bot;
