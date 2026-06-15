import { NextRequest, NextResponse } from 'next/server';
import { TableService } from '@/lib/services/TableService';
import { BillService } from '@/lib/services/BillService';
import { z } from 'zod';

const tableService = TableService();
const billService = BillService();

// GET /api/tables/[token] - получение информации о столике и его открытом счете
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json(
        { error: 'Table token is required' },
        { status: 400 }
      );
    }

    const table = await tableService.getByToken(token);
    if (!table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    if (!table.isActive) {
      return NextResponse.json(
        { error: 'Table is inactive' },
        { status: 403 }
      );
    }

    // Получаем открытый счет для столика
    const openBill = await billService.getOpenBillForTable(table.id);
    let billWithItems = null;
    if (openBill) {
      const result = await billService.getWithItems(openBill.id);
      if (result) {
        const unpaidTotal = await billService.calculateUnpaidTotal(openBill.id);
        billWithItems = {
          ...result.bill,
          items: result.items,
          unpaidTotal,
        };
      }
    }

    return NextResponse.json({
      table: {
        id: table.id,
        label: table.label,
        venueId: table.venueId,
      },
      bill: billWithItems,
    });
  } catch (error) {
    console.error('Error fetching table:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tables/[token] - создание нового счета для столика (админ)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const schema = z.object({
      externalId: z.string().optional(),
    });
    const validated = schema.parse(body);

    const table = await tableService.getByToken(token);
    if (!table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    // Проверяем, есть ли уже открытый счет
    const existingOpenBill = await billService.getOpenBillForTable(table.id);
    if (existingOpenBill) {
      return NextResponse.json(
        { error: 'There is already an open bill for this table' },
        { status: 409 }
      );
    }

    const bill = await billService.create({
      venueId: table.venueId,
      tableId: table.id,
      externalId: validated.externalId,
    });

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating bill:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
