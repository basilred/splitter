import { NextRequest, NextResponse } from 'next/server';
import { IntegrationService } from '@/lib/services/IntegrationService';
import { createPOSAdapter } from '@/lib/integrations/POSAdapter';
import { z } from 'zod';

// GET /api/integrations/events?venueId=...&processed=... - получение событий интеграции
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');
    const processed = searchParams.get('processed');

    if (!venueId) {
      return NextResponse.json(
        { error: 'venueId query parameter is required' },
        { status: 400 }
      );
    }

    const integrationService = IntegrationService();
    const events = await integrationService.getUnprocessedEvents(venueId);
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching integration events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/integrations/process - ручная обработка событий
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const schema = z.object({
      venueId: z.string().uuid(),
      adapterType: z.enum(['iiko', 'rkeeper', 'poster', 'stub']).default('stub'),
    });
    const validated = schema.parse(body);

    // Создаем адаптер на основе конфигурации заведения (упрощенно)
    const adapter = createPOSAdapter(validated.adapterType, {});
    const integrationService = IntegrationService(adapter);
    const result = await integrationService.processEvents(validated.venueId);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error processing integration events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
