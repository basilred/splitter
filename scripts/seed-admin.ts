import { db } from '../src/lib/db';
import { venues, users, tables } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const telegramId = 74826557;

  const existingUser = await db.select().from(users).where(eq(users.telegramId, telegramId));
  if (existingUser.length > 0) {
    console.log(`User with telegramId ${telegramId} already exists.`);
    console.log(JSON.stringify(existingUser[0], null, 2));
    return;
  }

  const venueId = crypto.randomUUID();
  await db.insert(venues).values({
    id: venueId,
    name: 'Моё заведение',
    currency: 'RUB',
    tipPresets: JSON.stringify([0, 5, 10, 15]),
  });
  console.log('Created venue:', venueId);

  const userId = crypto.randomUUID();
  await db.insert(users).values({
    id: userId,
    telegramId,
    name: 'Admin',
    venueId,
    role: 'owner',
  });
  console.log('Created user:', userId);

  await db.insert(tables).values([
    { id: crypto.randomUUID(), venueId, label: 'Столик 1', tableToken: crypto.randomUUID().replace(/-/g, '').slice(0, 12) },
    { id: crypto.randomUUID(), venueId, label: 'Столик 2', tableToken: crypto.randomUUID().replace(/-/g, '').slice(0, 12) },
    { id: crypto.randomUUID(), venueId, label: 'Столик 3', tableToken: crypto.randomUUID().replace(/-/g, '').slice(0, 12) },
  ]);
  console.log('Created 3 tables');

  console.log('Done. Restart the bot and try /my_tables');
}

main().catch(console.error);
