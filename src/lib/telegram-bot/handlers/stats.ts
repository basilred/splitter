import { Composer } from 'grammy';
import { MyContext, setContext } from '../session';
import { PaymentService, StatsPeriod } from '../../services/PaymentService';
import { statsPeriodKeyboard, mainMenuKeyboard } from '../keyboards';
import { cbStats, parseCallbackData } from '../router';

export const statsRouter = new Composer<MyContext>();

statsRouter.callbackQuery(/^stats:show:/, async (ctx) => {
  const parsed = parseCallbackData(ctx.callbackQuery.data);
  if (!parsed) return;

  const period = parsed.payload as StatsPeriod;
  const venueId = (ctx as any).user?.venueId ?? ctx.session.venueId;
  if (!venueId) return;

  const paymentService = PaymentService();
  const stats = await paymentService.getStats(venueId, period);
  const methods = await paymentService.getPaymentMethodBreakdown(venueId, period);
  const topItems = await paymentService.getTopItems(venueId, period, 5);

  const periodLabels: Record<string, string> = {
    today: '📅 Сегодня',
    week: '📅 За неделю',
    month: '📅 За месяц',
  };

  let msg = `${periodLabels[period as string] || '📊 Статистика'}\n\n`;
  msg += `💰 Выручка: ${(stats.totalRevenue / 100).toFixed(2)}₽\n`;
  msg += `💵 Чаевые: ${(stats.totalTips / 100).toFixed(2)}₽\n`;
  msg += `📊 Платежей: ${stats.paymentCount}\n`;
  msg += `👤 Гостей: ${stats.guestCount}\n`;
  msg += `📈 Средний чек: ${(stats.averageCheck / 100).toFixed(2)}₽\n`;

  if (methods.length > 0) {
    msg += `\n${'─'.repeat(20)}\n`;
    msg += 'По способам оплаты:\n';
    methods.forEach(m => {
      const methodLabel = m.method || 'неизвестно';
      msg += `  • ${methodLabel}: ${m.count} платежей на ${(m.total / 100).toFixed(2)}₽\n`;
    });
  }

  if (topItems.length > 0) {
    msg += `\n${'─'.repeat(20)}\n`;
    msg += 'Топ позиций:\n';
    topItems.forEach((item, i) => {
      msg += `  ${i + 1}. ${item.name} — ${item.orderCount}× (${(item.revenue / 100).toFixed(2)}₽)\n`;
    });
  }

  if (stats.paymentCount === 0) {
    msg += '\nНет оплат за выбранный период.';
  }

  setContext(ctx.session, 'idle');
  await ctx.editMessageText(msg, { reply_markup: statsPeriodKeyboard() });
});
