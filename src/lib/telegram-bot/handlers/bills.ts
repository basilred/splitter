import { Composer, InlineKeyboard } from 'grammy';
import { MyContext, setAwaitingInput, setContext, clearAwaitingInput } from '../session';
import { BillService } from '../../services/BillService';
import { PaymentService } from '../../services/PaymentService';
import { MenuItemService } from '../../services/MenuItemService';
import { billViewKeyboard, addItemMethodKeyboard, billItemActionKeyboard, menuItemListKeyboard, backKeyboard } from '../keyboards';
import { cbBill, cbNav, parseCallbackData } from '../router';

export const billRouter = new Composer<MyContext>();

// Open bill for table
billRouter.callbackQuery(/^bill:open:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  if (!parsed) return;
  const tableId = parsed.payload;
  const venueId = (ctx as any).user?.venueId ?? ctx.session.venueId;
  if (!venueId) return;

  const billService = BillService();
  const existing = await billService.getOpenBillForTable(tableId);
  if (existing) {
    ctx.session.currentBillId = existing.id;
    await ctx.answerCallbackQuery('ℹ️ У столика уже есть открытый счёт');
    await showBill(ctx, existing.id);
    return;
  }

  const bill = await billService.create({ venueId, tableId });
  ctx.session.currentBillId = bill.id;
  setContext(ctx.session, 'viewing_bill', { currentBillId: bill.id });

  await ctx.editMessageText(
    '✅ Счёт открыт.\n\nСчёт пуст. Добавьте первую позицию:',
    { reply_markup: billViewKeyboard(bill.id) },
  );
});

// Show bill
billRouter.callbackQuery(/^bill:show:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  if (!parsed) return;
  await showBill(ctx, parsed.payload);
});

async function showBill(ctx: MyContext, billId: string) {
  const billService = BillService();
  const paymentService = PaymentService();
  const data = await billService.getWithItems(billId);
  if (!data) {
    await ctx.answerCallbackQuery('❌ Счёт не найден');
    return;
  }

  ctx.session.currentBillId = billId;
  setContext(ctx.session, 'viewing_bill', { currentBillId: billId });

  const unpaid = data.items.filter(i => i.status === 'unpaid');
  const paid = data.items.filter(i => i.status === 'paid');
  const summary = await paymentService.getBillSummary(billId);

  let msg = `📋 Счёт #${billId.slice(0, 8)}\n`;
  msg += `Статус: ${data.bill.status === 'open' ? '🟢 Открыт' : '🔴 Закрыт'}\n\n`;

  if (unpaid.length > 0) {
    msg += `⏳ Неоплачено:\n`;
    unpaid.forEach(item => {
      const total = item.unitPrice * item.quantity;
      msg += `  • ${item.name} × ${item.quantity} = ${(total / 100).toFixed(2)}₽\n`;
    });
  }

  if (paid.length > 0) {
    msg += `\n✅ Оплачено:\n`;
    paid.forEach(item => {
      const total = item.unitPrice * item.quantity;
      const guest = item.paidByGuestName ? ` (${item.paidByGuestName})` : '';
      msg += `  • ${item.name} × ${item.quantity} = ${(total / 100).toFixed(2)}₽${guest}\n`;
    });
  }

  const unpaidTotal = unpaid.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  msg += `\n${'─'.repeat(20)}\n`;
  msg += `Неоплачено: ${(unpaidTotal / 100).toFixed(2)}₽\n`;
  msg += `Оплачено: ${(summary.totalPaid / 100).toFixed(2)}₽`;
  if (summary.totalTips > 0) msg += ` (чаевые: ${(summary.totalTips / 100).toFixed(2)}₽)`;
  msg += `\nПлатежей: ${summary.paymentCount}`;

  if (data.bill.status === 'closed') {
    msg += `\n\n✅ Счёт закрыт в ${new Date(data.bill.closedAt!).toLocaleString('ru-RU')}`;
  }

  if (data.bill.status === 'open' && ctx.session.awaitingInput) {
    await ctx.reply(msg, { reply_markup: billViewKeyboard(billId) });
  } else {
    await ctx.editMessageText(msg, {
      parse_mode: 'Markdown',
      reply_markup: data.bill.status === 'open' ? billViewKeyboard(billId) : new InlineKeyboard().text('🔙 На главную', cbNav.main()),
    });
  }
}

// Add item choice (menu or custom)
billRouter.callbackQuery(/^bill:add_item:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  if (!parsed) return;

  await ctx.editMessageText(
    'Выберите способ добавления:',
    { reply_markup: addItemMethodKeyboard(parsed.payload) },
  );
});

// Add item from menu
billRouter.callbackQuery(/^bill:add_menu:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  if (!parsed) return;
  const billId = parsed.payload;

  const venueId = (ctx as any).user?.venueId ?? ctx.session.venueId;
  if (!venueId) return;

  const menuService = MenuItemService();
  const grouped = await menuService.listItemsByCategory(venueId);

  if (grouped.length === 0) {
    await ctx.editMessageText(
      '📭 Меню пусто. Сначала добавьте позиции в меню заведения.',
      { reply_markup: backKeyboard('🔙 К счёту') },
    );
    const { cbBill } = await import('../router');
    ctx.callbackQuery.data = cbBill.show(billId);
    return;
  }

  let msg = '📋 Выберите позицию из меню:\n\n';
  const kb = new InlineKeyboard();

  for (const group of grouped) {
    const catName = group.category?.name || 'Без категории';
    for (const item of group.items) {
      const priceRub = (item.unitPrice / 100).toFixed(0);
      const { cbMenu } = await import('../router');
      kb.text(`${catName} → ${item.name} (${priceRub}₽)`, cbMenu.addItemToBill(item.id));
      kb.row();
    }
  }

  kb.text('🔙 К счёту', cbBill.show(billId));
  await ctx.editMessageText(msg, { reply_markup: kb });
});

// Add custom item dialog
billRouter.callbackQuery(/^bill:add_custom:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  if (!parsed) return;

  setAwaitingInput(ctx.session, {
    type: 'add_item_name',
    billId: parsed.payload,
  });
  await ctx.editMessageText(
    'Введите название позиции:',
    { reply_markup: backKeyboard('❌ Отмена') },
  );
});

export async function handleAddItemName(ctx: MyContext, billId: string, name: string) {
  if (!name || name.length > 200) {
    await ctx.reply('Название должно быть от 1 до 200 символов. Попробуйте ещё раз:');
    return;
  }

  setAwaitingInput(ctx.session, {
    type: 'add_item_price',
    billId,
    data: { itemName: name },
  });
  await ctx.reply(`Название: ${name}\nТеперь введите цену в рублях (целое число):`);
}

export async function handleAddItemPrice(ctx: MyContext, billId: string, priceStr: string) {
  const price = parseInt(priceStr, 10);
  if (isNaN(price) || price <= 0) {
    await ctx.reply('Цена должна быть положительным целым числом (в рублях). Попробуйте ещё раз:');
    return;
  }

  setAwaitingInput(ctx.session, {
    type: 'add_item_qty',
    billId,
    data: { itemName: ctx.session.awaitingInput?.data?.itemName, itemPrice: price * 100 },
  });
  await ctx.reply(`Цена: ${price}₽\nВведите количество (по умолчанию 1):`);
}

export async function handleAddItemQty(ctx: MyContext, billId: string, qtyStr: string, data?: Record<string, unknown>) {
  const qty = parseInt(qtyStr, 10) || 1;
  if (qty < 1) {
    await ctx.reply('Количество должно быть не менее 1. Попробуйте ещё раз:');
    return;
  }

  try {
    const billService = BillService();
    await billService.addItem(billId, {
      name: data?.itemName as string || 'Позиция',
      unitPrice: data?.itemPrice as number || 0,
      quantity: qty,
    });

    clearAwaitingInput(ctx.session);
    setContext(ctx.session, 'viewing_bill', { currentBillId: billId });
    await ctx.reply(`✅ Добавлено: ${data?.itemName as string || 'Позиция'} × ${qty}`);
    await showBill(ctx, billId);
  } catch {
    await ctx.reply('❌ Ошибка при добавлении позиции.');
  }
}

// Add menu item to bill
billRouter.callbackQuery(/^menu:to_bill:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  if (!parsed) return;
  const itemId = parsed.payload;

  const billId = ctx.session.currentBillId;
  if (!billId) {
    await ctx.answerCallbackQuery('❌ Счёт не найден');
    return;
  }

  try {
    const menuService = MenuItemService();
    const item = await menuService.getItemById(itemId);
    if (!item) {
      await ctx.answerCallbackQuery('❌ Позиция не найдена');
      return;
    }

    const billService = BillService();
    await billService.addItem(billId, {
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: 1,
    });

    await ctx.answerCallbackQuery(`✅ ${item.name} добавлен`);
    await showBill(ctx, billId);
  } catch (e) {
    console.error('Error adding menu item to bill:', e);
    await ctx.answerCallbackQuery('❌ Ошибка');
  }
});

// Edit quantity dialog
billRouter.callbackQuery(/^bill:edit_qty:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  if (!parsed) return;
  const itemId = parsed.payload;
  const billId = ctx.session.currentBillId;
  if (!billId) return;

  setAwaitingInput(ctx.session, {
    type: 'edit_qty',
    billId,
    data: { billId, itemId },
  });
  await ctx.editMessageText(
    'Введите новое количество:',
    { reply_markup: backKeyboard('❌ Отмена') },
  );
});

export async function handleEditQty(ctx: MyContext, qtyStr: string) {
  const input = ctx.session.awaitingInput;
  if (!input?.data) return;

  const qty = parseInt(qtyStr, 10);
  if (qty < 1) {
    await ctx.reply('Количество должно быть не менее 1. Попробуйте ещё раз:');
    return;
  }

  try {
    const billService = BillService();
    await billService.updateItem(input.data.itemId as string, { quantity: qty });

    clearAwaitingInput(ctx.session);
    setContext(ctx.session, 'viewing_bill', { currentBillId: input.billId });
    await ctx.reply(`✅ Количество изменено на ${qty}`);
    await showBill(ctx, input.billId);
  } catch {
    await ctx.reply('❌ Ошибка при изменении количества.');
  }
}

// Remove item (unpaid only)
billRouter.callbackQuery(/^bill:remove_item:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  if (!parsed) return;
  const itemId = parsed.payload;
  const billId = ctx.session.currentBillId;
  if (!billId) return;

  try {
    const billService = BillService();
    await billService.deleteItem(itemId);

    await ctx.answerCallbackQuery('✅ Позиция удалена');
    await showBill(ctx, billId);
  } catch (e) {
    console.error('Error removing item:', e);
    await ctx.answerCallbackQuery('❌ Ошибка при удалении');
  }
});

// Close bill
billRouter.callbackQuery(/^bill:close:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  if (!parsed) return;
  const billId = parsed.payload;

  try {
    const billService = BillService();
    const data = await billService.getWithItems(billId);
    if (!data) return;

    const unpaid = data.items.filter(i => i.status === 'unpaid');
    if (unpaid.length > 0) {
      await ctx.answerCallbackQuery(`⚠️ Есть неоплаченные позиции (${unpaid.length} шт.)`);
      return;
    }

    await billService.close(billId);
    await ctx.answerCallbackQuery('✅ Счёт закрыт');
    await showBill(ctx, billId);
  } catch {
    await ctx.answerCallbackQuery('❌ Ошибка');
  }
});

// Show payment history
billRouter.callbackQuery(/^bill:payments:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  if (!parsed) return;

  const paymentService = PaymentService();
  const payments = await paymentService.listByBill(parsed.payload);

  if (payments.length === 0) {
    await ctx.editMessageText(
      '💳 Платежей по этому счёту нет.',
      { reply_markup: backKeyboard('🔙 К счёту') },
    );
    return;
  }

  let msg = '💳 Платежи:\n\n';
  payments.forEach((p, i) => {
    const statusEmoji = p.status === 'succeeded' ? '✅' : p.status === 'pending' ? '🕐' : '❌';
    msg += `${statusEmoji} Платёж #${i + 1}\n`;
    msg += `  Сумма: ${(p.totalAmount / 100).toFixed(2)}₽`;
    if (p.tipAmount > 0) msg += ` (чаевые: ${(p.tipAmount / 100).toFixed(2)}₽)`;
    msg += `\n  Гость: ${p.guestName || 'Аноним'}`;
    msg += `\n  Статус: ${p.status}\n\n`;
  });

  await ctx.editMessageText(msg, { reply_markup: backKeyboard('🔙 К счёту') });
});
