import { Composer } from 'grammy';
import { MyContext, setAwaitingInput, setContext, clearAwaitingInput } from '../session';
import { TableService } from '../../services/TableService';
import { BillService } from '../../services/BillService';
import { tableListKeyboard, tableDetailKeyboard, mainMenuKeyboard, backKeyboard } from '../keyboards';
import { cbTable, cbNav, parseCallbackData } from '../router';

export const tableRouter = new Composer<MyContext>();

function getVenueId(ctx: MyContext): string | undefined {
  return (ctx as any).user?.venueId ?? ctx.session.venueId;
}

type TableListItem = import('../keyboards').TableListItem;

export async function buildTableList(venueId: string): Promise<{ items: TableListItem[]; summary: string }> {
  const tableService = TableService();
  const billService = BillService();
  const tables = await tableService.listByVenue(venueId, true);

  const items: TableListItem[] = [];
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

  return { items, summary };
}

// List tables
tableRouter.callbackQuery(cbTable.list(), async (ctx) => {
  const venueId = getVenueId(ctx);
  if (!venueId) {
    await ctx.answerCallbackQuery('❌ Заведение не определено');
    return;
  }

  setContext(ctx.session, 'viewing_tables');

  const { items, summary } = await buildTableList(venueId);

  if (items.length === 0) {
    await ctx.editMessageText(
      '📭 У вас пока нет активных столиков.',
      { reply_markup: tableListKeyboard([]) },
    );
    return;
  }

  await ctx.editMessageText(
    `📋 Активные столики (${items.length}):\n\n${summary}`,
    { reply_markup: tableListKeyboard(items) },
  );
});

// Show table detail
tableRouter.callbackQuery(/^table:show:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  if (!parsed) return;
  const tableId = parsed.payload;

  const tableService = TableService();
  const billService = BillService();
  const table = await tableService.getById(tableId);

  if (!table) {
    await ctx.answerCallbackQuery('❌ Столик не найден');
    return;
  }

  const openBill = await billService.getOpenBillForTable(tableId);

  setContext(ctx.session, 'viewing_table', { currentTableId: tableId });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let msg = `🔹 Столик: ${table.label}\n`;
  msg += `Токен: \`${table.tableToken}\`\n`;
  msg += `Ссылка: ${appUrl}/table/${table.tableToken}\n`;

  if (openBill) {
      const total = await billService.calculateUnpaidTotal(openBill.id);
    msg += `\n📋 Открытый счёт: ${(total / 100).toFixed(2)}₽ неоплачено`;
    ctx.session.currentBillId = openBill.id;
  } else {
    msg += '\n✅ Нет открытого счёта';
  }

  await ctx.editMessageText(msg, {
    parse_mode: 'Markdown',
    reply_markup: tableDetailKeyboard(tableId, !!openBill, openBill?.id),
  });
});

// Create table dialog
tableRouter.callbackQuery(cbTable.create(), async (ctx) => {
  setAwaitingInput(ctx.session, {
    type: 'table_name',
    billId: '',
  });
  await ctx.editMessageText(
    'Введите название нового столика:',
    { reply_markup: backKeyboard('❌ Отмена') },
  );
});

export async function handleTableName(ctx: MyContext, name: string) {
  const venueId = getVenueId(ctx);
  if (!venueId) {
    await ctx.reply('❌ Заведение не определено');
    return;
  }

  if (!name || name.length > 50) {
    await ctx.reply('Название должно быть от 1 до 50 символов. Попробуйте ещё раз:');
    return;
  }

  try {
    const tableService = TableService();
    const table = await tableService.create({ venueId, label: name });

    clearAwaitingInput(ctx.session);
    setContext(ctx.session, 'viewing_table', { currentTableId: table.id });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await ctx.reply(
      `✅ Столик "${table.label}" создан!\n\n` +
      `Токен: \`${table.tableToken}\`\n` +
      `Ссылка: ${appUrl}/table/${table.tableToken}`,
      { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard() },
    );
  } catch (err) {
    console.error('Error creating table:', err);
    await ctx.reply('❌ Ошибка при создании столика.');
  }
}

// Deactivate table
tableRouter.callbackQuery(/^table:deactivate:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  if (!parsed) return;

  const tableService = TableService();
  await tableService.deactivate(parsed.payload);

  await ctx.answerCallbackQuery('✅ Столик деактивирован');
  const { items, summary } = await buildTableList(getVenueId(ctx)!);
  await ctx.editMessageText(
    `📋 Активные столики (${items.length}):\n\n${summary}`,
    { reply_markup: tableListKeyboard(items) },
  );
});

// Rename table dialog
tableRouter.callbackQuery(/^table:rename:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  if (!parsed) return;

  ctx.session.currentTableId = parsed.payload;
  setAwaitingInput(ctx.session, {
    type: 'table_name',
    billId: '',
    data: { rename: true, tableId: parsed.payload },
  });
  await ctx.editMessageText(
    'Введите новое название столика:',
    { reply_markup: backKeyboard('❌ Отмена') },
  );
});

// Handle manually entered table name (for rename) — early return avoids conflicting with handleTableName
export async function handleTableRename(ctx: MyContext, name: string) {
  const tableId = ctx.session.currentTableId;
  if (!tableId) return;

  if (!name || name.length > 50) {
    await ctx.reply('Название должно быть от 1 до 50 символов. Попробуйте ещё раз:');
    return;
  }

  try {
    const tableService = TableService();
    await tableService.update(tableId, { label: name });

    clearAwaitingInput(ctx.session);
    setContext(ctx.session, 'viewing_tables');
    await ctx.reply(`✅ Название изменено на "${name}"`);
    const { items, summary } = await buildTableList(getVenueId(ctx)!);
    await ctx.reply(
      `📋 Активные столики (${items.length}):\n\n${summary}`,
      { reply_markup: tableListKeyboard(items) },
    );
  } catch {
    await ctx.reply('❌ Ошибка при переименовании.');
  }
}
