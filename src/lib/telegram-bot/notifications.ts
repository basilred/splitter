import { InlineKeyboard } from 'grammy';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users, bills } from '../db/schema';
import { bot } from './bot';
import { BillService } from '../services/BillService';

export async function notifyPaymentSucceeded(
  billId: string,
  paymentId: string,
  tableLabel: string,
  amount: number,
  guestName?: string,
) {
  const billService = BillService();
  const data = await billService.getWithItems(billId);
  const unpaidItems = data?.items.filter(i => i.status === 'unpaid') || [];
  const remaining = unpaidItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const guest = guestName ? ` (Гость: ${guestName})` : '';
  let msg = `💵 Оплата ${(amount / 100).toFixed(2)}₽ за столик "${tableLabel}"${guest}`;
  if (remaining > 0) {
    msg += `\n\nОсталось оплатить: ${(remaining / 100).toFixed(2)}₽`;
  }

  const kb = new InlineKeyboard()
    .text('📋 Показать счёт', `bill:show:${billId}`);

  await notifyAdmins(billId, msg, kb);
}

export async function notifyBillClosed(billId: string, tableLabel: string, totalAmount: number) {
  const msg = `✅ Счёт за столик "${tableLabel}" полностью оплачен!\nСумма: ${(totalAmount / 100).toFixed(2)}₽`;

  const kb = new InlineKeyboard()
    .text('📋 Показать счёт', `bill:show:${billId}`);

  await notifyAdmins(billId, msg, kb);
}

async function notifyAdmins(billId: string, message: string, keyboard: InlineKeyboard) {
  const [bill] = await db.select().from(bills).where(eq(bills.id, billId));
  if (!bill) return;

  const adminUsers = await db.select()
    .from(users)
    .where(eq(users.venueId, bill.venueId));

  for (const admin of adminUsers) {
    if (!admin.telegramId) continue;

    try {
      await bot.api.sendMessage(admin.telegramId, message, {
        reply_markup: keyboard,
      });
    } catch {
      // silently skip if user blocked the bot or chat is unavailable
    }
  }
}
