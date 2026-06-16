import { InlineKeyboard } from 'grammy';
import { cbNav, cbTable, cbBill, cbMenu, cbStats } from './router';

export function mainMenuKeyboard() {
  return new InlineKeyboard()
    .text('📋 Мои столики', cbTable.list())
    .text('📊 Статистика', cbStats.show('today'))
    .row()
    .text('⚙️ Заведение', cbMenu.list());
}

export type TableListItem = {
  id: string;
  label: string;
  hasOpenBill?: boolean;
  unpaidTotal?: number;
};

export function tableListKeyboard(tables: TableListItem[]) {
  const kb = new InlineKeyboard();
  tables.forEach((t, i) => {
    if (i > 0 && i % 2 === 0) kb.row();
    const status = t.hasOpenBill ? '🟢' : '⚪';
    kb.text(`${status} ${t.label}`, cbTable.show(t.id));
  });
  kb.row().text('➕ Создать столик', cbTable.create());
  kb.row().text('🏠 На главную', cbNav.main());
  return kb;
}

export function tableDetailKeyboard(tableId: string, hasOpenBill: boolean, billId: string | undefined) {
  const kb = new InlineKeyboard();
  if (hasOpenBill && billId) {
    kb.text('📋 Счёт', cbBill.show(billId));
  } else {
    kb.text('➕ Открыть счёт', cbBill.open(tableId));
  }
  kb.row()
    .text('🔄 Сменить название', cbTable.rename(tableId))
    .text('❌ Деактивировать', cbTable.deactivate(tableId));
  kb.row().text('🔙 К столикам', cbTable.list());
  return kb;
}

export function billViewKeyboard(billId: string) {
  return new InlineKeyboard()
    .text('➕ Добавить позицию', cbBill.addItem(billId))
    .row()
    .text('❌ Закрыть счёт', cbBill.close(billId))
    .row()
    .text('🔙 Назад', cbNav.back('table'));
}

export function addItemMethodKeyboard(billId: string) {
  return new InlineKeyboard()
    .text('📋 Из меню', cbBill.addItemFromMenu(billId))
    .text('✏️ Своё название', cbBill.addItemCustom(billId))
    .row()
    .text('🔙 Назад', cbBill.show(billId));
}

export function billItemActionKeyboard(billId: string, itemId: string, isPaid: boolean) {
  const kb = new InlineKeyboard();
  if (!isPaid) {
    kb.text('✏️ Кол-во', cbBill.editQty(itemId));
    kb.text('❌ Удалить', cbBill.removeItem(itemId));
  }
  kb.row().text('🔙 К счёту', cbBill.show(billId));
  return kb;
}

export function menuManagementKeyboard(hasCategories: boolean) {
  const kb = new InlineKeyboard()
    .text('📁 Новая категория', cbMenu.addCategory());
  if (hasCategories) {
    kb.row().text('➕ Новая позиция', cbMenu.addItem('_'));
  }
  kb.row().text('🔙 На главную', cbNav.main());
  return kb;
}

export function menuCategoryListKeyboard(categories: { id: string; name: string }[]) {
  const kb = new InlineKeyboard();
  categories.forEach((c, i) => {
    if (i > 0) kb.row();
    kb.text(`📁 ${c.name}`, cbMenu.showCategory(c.id));
  });
  kb.row().text('➕ Новая категория', cbMenu.addCategory());
  kb.row().text('🔙 На главную', cbNav.main());
  return kb;
}

export function menuItemListKeyboard(
  items: { id: string; name: string; unitPrice: number }[],
  billId?: string,
) {
  const kb = new InlineKeyboard();
  items.forEach((item, i) => {
    const priceRub = (item.unitPrice / 100).toFixed(0);
    if (billId) {
      kb.text(`${item.name} (${priceRub}₽)`, cbMenu.addItemToBill(billId, item.id));
    } else {
      kb.text(`${item.name} (${priceRub}₽)`, cbMenu.editItem(item.id));
    }
    if (i < items.length - 1) kb.row();
  });
  kb.row().text('🔙 Назад', cbMenu.list());
  return kb;
}

export function statsPeriodKeyboard() {
  return new InlineKeyboard()
    .text('📅 Сегодня', cbStats.show('today'))
    .text('📅 Неделя', cbStats.show('week'))
    .text('📅 Месяц', cbStats.show('month'))
    .row()
    .text('🏠 На главную', cbNav.main());
}

export function confirmCancelKeyboard(action: string, payload: string) {
  return new InlineKeyboard()
    .text('✅ Подтвердить', `${action}:${payload}`)
    .text('❌ Отмена', cbNav.main());
}

export function backKeyboard(label = '🔙 Назад') {
  return new InlineKeyboard()
    .text(label, cbNav.main());
}

export function notificationBillKeyboard(billId: string) {
  return new InlineKeyboard()
    .text('📋 Показать счёт', cbBill.show(billId));
}
