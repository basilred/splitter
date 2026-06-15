import { Context } from 'grammy';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';

// Расширяем контекст для хранения данных пользователя
export interface AuthContext extends Context {
  user?: {
    id: string;
    telegramId: number;
    name: string;
    venueId?: string;
    role: 'owner' | 'manager' | 'staff';
  };
}

// Middleware для аутентификации администратора по Telegram ID
export async function authenticate(ctx: AuthContext, next: () => Promise<void>) {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    // Если нет telegramId (например, сообщение от канала), пропускаем
    await next();
    return;
  }

  // Ищем пользователя в БД по telegramId
  const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
  if (user && user.telegramId !== null) {
    ctx.user = {
      id: user.id,
      telegramId: user.telegramId,
      name: user.name,
      venueId: user.venueId || undefined,
      role: user.role,
    };
    // Сохраняем venueId в сессию для удобства (если контекст поддерживает сессию)
    if ('session' in ctx && user.venueId) {
      (ctx as any).session.venueId = user.venueId;
    }
  } else {
    // Пользователь не найден - возможно, он ещё не зарегистрирован
    // Можно предложить регистрацию через админ-панель
    ctx.user = undefined;
  }

  await next();
}

// Проверка, является ли пользователь администратором заведения (owner или manager)
export async function isAdmin(ctx: AuthContext): Promise<boolean> {
  if (!ctx.user) {
    return false;
  }
  // Владелец или менеджер считаются администраторами
  return ctx.user.role === 'owner' || ctx.user.role === 'manager';
}

// Проверка, является ли пользователь владельцем заведения
export async function isOwner(ctx: AuthContext): Promise<boolean> {
  if (!ctx.user) {
    return false;
  }
  return ctx.user.role === 'owner';
}

// Получение venueId из контекста (если пользователь привязан к заведению)
export function getVenueId(ctx: AuthContext): string | undefined {
  return ctx.user?.venueId;
}
