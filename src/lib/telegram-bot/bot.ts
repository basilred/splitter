import { Bot, session } from 'grammy';
import { SessionData, createInitialSession } from './session';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
}

export type BotContext = import('./session').MyContext;

export const bot = new Bot<BotContext>(token);

bot.use(session({ initial: createInitialSession }));

bot.catch((err) => {
  const msg = String(err.error || err);
  if (msg.includes('message is not modified')) return;
  console.error('Bot error:', msg);
});

export function startBot() {
  console.log('Starting Telegram bot (polling)...');
  bot.start();
}

export function stopBot() {
  console.log('Stopping Telegram bot...');
  bot.stop();
}

export default bot;
