import { Composer } from 'grammy';
import { MyContext, setContext } from '../session';
import { mainMenuKeyboard, backKeyboard } from '../keyboards';
import { cbNav, parseCallbackData } from '../router';

export const mainRouter = new Composer<MyContext>();

mainRouter.command('start', async (ctx) => {
  setContext(ctx.session, 'idle');
  await ctx.reply(
    `👋 Привет, ${ctx.from?.first_name || 'администратор'}!\n\n` +
    `Я бот для управления счетами в заведениях. Выбери раздел:`,
    { reply_markup: mainMenuKeyboard() },
  );
});

mainRouter.command('help', async (ctx) => {
  await ctx.reply(
    `📋 Доступные команды:\n\n` +
    `/start — главное меню\n` +
    `/cancel — отменить текущее действие\n` +
    `/help — эта справка\n\n` +
    `Используй кнопки для навигации.`,
  );
});

mainRouter.command('cancel', async (ctx) => {
  if (ctx.session.awaitingInput) {
    ctx.session.awaitingInput = null;
    setContext(ctx.session, 'idle');
    await ctx.reply('❌ Действие отменено.', { reply_markup: mainMenuKeyboard() });
  } else {
    await ctx.reply('Нет активного действия для отмены.');
  }
});

mainRouter.callbackQuery(cbNav.main(), async (ctx) => {
  setContext(ctx.session, 'idle');
  await ctx.editMessageText(
    '🏠 Главное меню. Выбери раздел:',
    { reply_markup: mainMenuKeyboard() },
  );
});

mainRouter.callbackQuery(/^nav:back:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  const to = parsed?.payload || 'main';

  if (to === 'table') {
    const venueId = (ctx as any).user?.venueId ?? ctx.session.venueId;
    if (!venueId) return;

    const { BillService } = await import('../../services/BillService');
    const { TableService } = await import('../../services/TableService');
    const { tableListKeyboard } = await import('../keyboards');

    const tableService = TableService();
    const billService = BillService();
    const tables = await tableService.listByVenue(venueId, true);

    setContext(ctx.session, 'viewing_tables');

    if (tables.length === 0) {
      await ctx.editMessageText(
        '📭 У вас пока нет активных столиков.',
        { reply_markup: tableListKeyboard([]) },
      );
      return;
    }

    const items: import('../keyboards').TableListItem[] = [];
    let summary = '';

    for (const t of tables) {
      const openBill = await billService.getOpenBillForTable(t.id);
      if (openBill) {
        const total = await billService.calculateUnpaidTotal(openBill.id);
        items.push({ id: t.id, label: t.label, hasOpenBill: true, unpaidTotal: total });
        summary += `🟢 ${t.label} — ${(total / 100).toFixed(2)}₽ неоплачено\n`;
      } else {
        items.push({ id: t.id, label: t.label, hasOpenBill: false });
        summary += `⚪ ${t.label} — свободен\n`;
      }
    }

    await ctx.editMessageText(
      `📋 Активные столики (${items.length}):\n\n${summary}`,
      { reply_markup: tableListKeyboard(items) },
    );
  } else {
    setContext(ctx.session, 'idle');
    await ctx.editMessageText(
      '🏠 Главное меню:',
      { reply_markup: mainMenuKeyboard() },
    );
  }
});

mainRouter.on('message:text', async (ctx) => {
  if (ctx.session.awaitingInput) {
    const input = ctx.session.awaitingInput;
    if (input.type === 'add_item_name') {
      const { handleAddItemName } = await import('./bills');
      await handleAddItemName(ctx, input.billId, ctx.message.text);
    } else if (input.type === 'add_item_price') {
      const { handleAddItemPrice } = await import('./bills');
      await handleAddItemPrice(ctx, input.billId, ctx.message.text);
    } else if (input.type === 'add_item_qty') {
      const { handleAddItemQty } = await import('./bills');
      await handleAddItemQty(ctx, input.billId, ctx.message.text, input.data);
    } else if (input.type === 'edit_qty') {
      const { handleEditQty } = await import('./bills');
      await handleEditQty(ctx, ctx.message.text);
    } else if (input.type === 'table_name') {
      if (input.data?.rename) {
        const { handleTableRename } = await import('./tables');
        await handleTableRename(ctx, ctx.message.text);
      } else {
        const { handleTableName } = await import('./tables');
        await handleTableName(ctx, ctx.message.text);
      }
    } else if (input.type === 'menu_item_name') {
      const { handleMenuItemName } = await import('./menu');
      await handleMenuItemName(ctx, ctx.message.text);
    } else if (input.type === 'menu_item_price') {
      const { handleMenuItemPrice } = await import('./menu');
      await handleMenuItemPrice(ctx, ctx.message.text);
    } else if (input.type === 'menu_item_cat_name') {
      const { handleMenuCatName } = await import('./menu');
      await handleMenuCatName(ctx, ctx.message.text);
    }
  } else {
    await ctx.reply('Используй кнопки для навигации.', { reply_markup: mainMenuKeyboard() });
  }
});

mainRouter.on('message', async (ctx) => {
  await ctx.reply('Используй кнопки для навигации.', { reply_markup: mainMenuKeyboard() });
});
