import { Composer, InlineKeyboard } from 'grammy';
import { MyContext, setAwaitingInput, setContext, clearAwaitingInput } from '../session';
import { MenuItemService } from '../../services/MenuItemService';
import { menuCategoryListKeyboard, menuItemListKeyboard, menuManagementKeyboard, backKeyboard } from '../keyboards';
import { cbMenu, cbNav, parseCallbackData } from '../router';

export const menuRouter = new Composer<MyContext>();

function getVenueId(ctx: MyContext): string | undefined {
  return (ctx as any).user?.venueId ?? ctx.session.venueId;
}

// List categories
menuRouter.callbackQuery(cbMenu.list(), async (ctx) => {
  const venueId = getVenueId(ctx);
  if (!venueId) return;

  const menuService = MenuItemService();
  const categories = await menuService.listCategories(venueId);

  setContext(ctx.session, 'viewing_menu');

  if (categories.length === 0) {
    await ctx.editMessageText(
      '⚙️ Меню заведения\n\nМеню пусто. Создайте первую категорию:',
      { reply_markup: menuManagementKeyboard(false) },
    );
    return;
  }

  let msg = '⚙️ Меню заведения\n\n';
  categories.forEach(c => {
    msg += `📁 ${c.name}\n`;
  });

  await ctx.editMessageText(msg, {
    reply_markup: menuCategoryListKeyboard(categories.map(c => ({ id: c.id, name: c.name }))),
  });
});

// Show category with items
menuRouter.callbackQuery(/^menu:show_cat:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  if (!parsed) return;
  const categoryId = parsed.payload;
  const venueId = getVenueId(ctx);
  if (!venueId) return;

  const menuService = MenuItemService();
  const category = await menuService.getCategoryById(categoryId);
  const items = await menuService.listItems(venueId, categoryId);

  let msg = `📁 ${category?.name || 'Без категории'}\n\n`;
  if (items.length === 0) {
    msg += 'В этой категории нет позиций.';
  } else {
    items.forEach(item => {
      msg += `• ${item.name} — ${(item.unitPrice / 100).toFixed(2)}₽\n`;
    });
  }

  const kb = new InlineKeyboard();
  kb.text('➕ Добавить позицию', cbMenu.addItem(categoryId));
  kb.row();
  kb.text('❌ Удалить категорию', cbMenu.deleteCategory(categoryId));
  kb.row();
  kb.text('🔙 К категориям', cbMenu.list());

  await ctx.editMessageText(msg, { reply_markup: kb });
});

// Add category dialog
menuRouter.callbackQuery(cbMenu.addCategory(), async (ctx) => {
  setAwaitingInput(ctx.session, {
    type: 'menu_item_cat_name',
    billId: '',
  });
  await ctx.editMessageText(
    'Введите название новой категории:',
    { reply_markup: backKeyboard('❌ Отмена') },
  );
});

export async function handleMenuCatName(ctx: MyContext, name: string) {
  const venueId = getVenueId(ctx);
  if (!venueId) return;

  if (!name || name.length > 100) {
    await ctx.reply('Название должно быть от 1 до 100 символов. Попробуйте ещё раз:');
    return;
  }

  try {
    const menuService = MenuItemService();
    await menuService.createCategory({ venueId, name });

    clearAwaitingInput(ctx.session);
    setContext(ctx.session, 'viewing_menu');
    await ctx.reply(`✅ Категория "${name}" создана`);

    const categories = await menuService.listCategories(venueId);
    await ctx.reply(
      '⚙️ Меню заведения',
      { reply_markup: menuCategoryListKeyboard(categories.map(c => ({ id: c.id, name: c.name }))) },
    );
  } catch (e) {
    console.error('Error creating category:', e);
    await ctx.reply('❌ Ошибка при создании категории.');
  }
}

// Delete category
menuRouter.callbackQuery(/^menu:del_cat:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  if (!parsed) return;

  try {
    const menuService = MenuItemService();
    await menuService.deleteCategory(parsed.payload);
    await ctx.answerCallbackQuery('✅ Категория удалена');

    const venueId = getVenueId(ctx);
    if (!venueId) return;
    const categories = await menuService.listCategories(venueId);
    await ctx.editMessageText(
      '⚙️ Меню заведения',
      { reply_markup: menuCategoryListKeyboard(categories.map(c => ({ id: c.id, name: c.name }))) },
    );
  } catch (e) {
    console.error('Error deleting category:', e);
    await ctx.answerCallbackQuery('❌ Ошибка при удалении');
  }
});

// Add item to category dialog
menuRouter.callbackQuery(/^menu:add_item:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  if (!parsed) return;

  const categoryId = parsed.payload === '_' ? null : parsed.payload;

  setAwaitingInput(ctx.session, {
    type: 'menu_item_name',
    billId: '',
    data: { categoryId },
  });
  await ctx.editMessageText(
    'Введите название позиции:',
    { reply_markup: backKeyboard('❌ Отмена') },
  );
});

export async function handleMenuItemName(ctx: MyContext, name: string) {
  if (!name || name.length > 200) {
    await ctx.reply('Название должно быть от 1 до 200 символов. Попробуйте ещё раз:');
    return;
  }

  setAwaitingInput(ctx.session, {
    type: 'menu_item_price',
    billId: '',
    data: { itemName: name, categoryId: ctx.session.awaitingInput?.data?.categoryId },
  });
  await ctx.reply(`Название: ${name}\nТеперь введите цену в рублях (целое число):`);
}

export async function handleMenuItemPrice(ctx: MyContext, priceStr: string) {
  const price = parseInt(priceStr, 10);
  if (isNaN(price) || price <= 0) {
    await ctx.reply('Цена должна быть положительным целым числом. Попробуйте ещё раз:');
    return;
  }

  const venueId = getVenueId(ctx);
  if (!venueId) return;

  const data = ctx.session.awaitingInput?.data || {};
  const categoryId = data.categoryId as string | null || undefined;

  try {
    const menuService = MenuItemService();
    await menuService.createItem({
      venueId,
      name: data.itemName as string || 'Позиция',
      unitPrice: price * 100,
      categoryId,
    });

    clearAwaitingInput(ctx.session);
    setContext(ctx.session, 'viewing_menu');
    await ctx.reply(`✅ Позиция "${data.itemName as string}" добавлена (${price}₽)`);

    if (categoryId) {
      const category = await menuService.getCategoryById(categoryId);
      const items = await menuService.listItems(venueId, categoryId);
      let msg = `📁 ${category?.name || ''}\n\n`;
      items.forEach(item => {
        msg += `• ${item.name} — ${(item.unitPrice / 100).toFixed(2)}₽\n`;
      });
      await ctx.reply(msg, {
        reply_markup: new InlineKeyboard()
          .text('➕ Добавить ещё', cbMenu.addItem(categoryId))
          .row()
          .text('🔙 К категориям', cbMenu.list()),
      });
    } else {
      const categories = await menuService.listCategories(venueId);
      await ctx.reply(
        '⚙️ Меню заведения',
        { reply_markup: menuCategoryListKeyboard(categories.map(c => ({ id: c.id, name: c.name }))) },
      );
    }
  } catch (e) {
    console.error('Error creating menu item:', e);
    await ctx.reply('❌ Ошибка при создании позиции.');
  }
}

// Edit item dialog
menuRouter.callbackQuery(/^menu:edit_item:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  if (!parsed) return;

  const menuService = MenuItemService();
  const item = await menuService.getItemById(parsed.payload);
  if (!item) {
    await ctx.answerCallbackQuery('❌ Позиция не найдена');
    return;
  }

  const priceRub = (item.unitPrice / 100).toFixed(2);
  const kb = new InlineKeyboard()
    .text('✏️ Изменить название', `menu:edit_name:${item.id}`)
    .row()
    .text('✏️ Изменить цену', `menu:edit_price:${item.id}`)
    .row()
    .text('❌ Деактивировать', cbMenu.deactivateItem(item.id))
    .row()
    .text('🔙 Назад', cbMenu.list());

  await ctx.editMessageText(
    `✏️ Редактирование: ${item.name}\nЦена: ${priceRub}₽`,
    { reply_markup: kb },
  );
});

// Deactivate item
menuRouter.callbackQuery(/^menu:deact_item:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  if (!parsed) return;

  try {
    const menuService = MenuItemService();
    await menuService.deactivateItem(parsed.payload);
    await ctx.answerCallbackQuery('✅ Позиция деактивирована');
  } catch (e) {
    console.error('Error deactivating menu item:', e);
    await ctx.answerCallbackQuery('❌ Ошибка');
  }
});
