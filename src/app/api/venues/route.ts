import { NextRequest, NextResponse } from 'next/server';
import { VenueService } from '@/lib/services/VenueService';
import { z } from 'zod';

const venueService = VenueService();

// Схема валидации создания заведения
const CreateVenueSchema = z.object({
  name: z.string().min(1).max(100),
  currency: z.string().length(3).default('RUB'),
  tipPresets: z.array(z.number().int().nonnegative()).default([0, 5, 10, 15]),
  posConfig: z.record(z.any()).optional(),
});

// Схема валидации обновления заведения
const UpdateVenueSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currency: z.string().length(3).optional(),
  tipPresets: z.array(z.number().int().nonnegative()).optional(),
  posConfig: z.record(z.any()).optional(),
});

// GET /api/venues - получение списка заведений
export async function GET() {
  try {
    const venues = await venueService.list();
    return NextResponse.json({ venues });
  } catch (error) {
    console.error('Error fetching venues:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/venues - создание нового заведения
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = CreateVenueSchema.parse(body);
    const venue = await venueService.create(validated);
    return NextResponse.json(venue, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating venue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

