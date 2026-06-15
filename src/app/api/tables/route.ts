import { NextRequest, NextResponse } from 'next/server';
import { TableService } from '@/lib/services/TableService';
import { z } from 'zod';

const tableService = TableService();

// Схема валидации создания столика
const CreateTableSchema = z.object({
  venueId: z.string().uuid(),
  label: z.string().min(1).max(50),
  externalId: z.string().optional(),
});

// Схема валидации обновления столика
const UpdateTableSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
  externalId: z.string().optional(),
});

// GET /api/tables?venueId=... - получение столиков заведения
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    if (!venueId) {
      return NextResponse.json(
        { error: 'venueId query parameter is required' },
        { status: 400 }
      );
    }

    const tables = await tableService.listByVenue(venueId, activeOnly);
    return NextResponse.json({ tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tables - создание нового столика
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateTableSchema.parse(body);
    const table = await tableService.create(validated);
    return NextResponse.json(table, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating table:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

