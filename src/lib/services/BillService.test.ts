import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillService } from './BillService';
import { db } from '../db';
import { bills, billItems } from '../db/schema';

// Мокируем drizzle
vi.mock('../db', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'bill-1', venueId: 'venue-1', tableId: 'table-1', status: 'open' }]),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  },
}));

describe('BillService', () => {
  let service: ReturnType<typeof BillService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = BillService();
  });

  describe('create', () => {
    it('should create a bill with valid input', async () => {
      const input = {
        venueId: '123e4567-e89b-12d3-a456-426614174000',
        tableId: '123e4567-e89b-12d3-a456-426614174001',
        externalId: 'ext-123',
      };

      const result = await service.create(input);

      expect(db.insert).toHaveBeenCalledWith(bills);
      expect(result).toHaveProperty('id', 'bill-1');
      expect(result).toHaveProperty('status', 'open');
    });

    it('should reject invalid input', async () => {
      const input = {
        venueId: 'invalid',
        tableId: '123e4567-e89b-12d3-a456-426614174001',
      };

      await expect(service.create(input as any)).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('should return bill by id', async () => {
      const mockBill = { id: 'bill-1', venueId: 'venue-1' };
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockBill]),
        }),
      });

      const result = await service.getById('bill-1');

      expect(result).toEqual(mockBill);
    });

    it('should return null if not found', async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getOpenBillForTable', () => {
    it('should return open bill for table', async () => {
      const mockBill = { id: 'bill-1', tableId: 'table-1', status: 'open' };
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([mockBill]),
        }),
      });

      const result = await service.getOpenBillForTable('table-1');

      expect(result).toEqual(mockBill);
    });

    it('should return null if no open bill', async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getOpenBillForTable('table-1');

      expect(result).toBeNull();
    });
  });

  describe('close', () => {
    it('should close bill', async () => {
      const updatedBill = { id: 'bill-1', status: 'closed' };
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedBill]),
      });

      const result = await service.close('bill-1');

      expect(result).toEqual(updatedBill);
    });

    it('should return null if bill not found', async () => {
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      });

      const result = await service.close('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('addItem', () => {
    it('should add item to bill', async () => {
      const mockItem = { id: 'item-1', name: 'Coffee', unitPrice: 500 };
      (db.insert as any).mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockItem]),
      });

      const input = {
        name: 'Coffee',
        unitPrice: 500,
        quantity: 2,
      };

      const result = await service.addItem('bill-1', input);

      expect(db.insert).toHaveBeenCalledWith(billItems);
      expect(result).toEqual(mockItem);
    });
  });

  describe('calculateUnpaidTotal', () => {
    it('should calculate total of unpaid items', async () => {
      const mockResult = [{ total: 1500 }];
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockResult),
        }),
      });

      const result = await service.calculateUnpaidTotal('bill-1');

      expect(result).toBe(1500);
    });

    it('should return 0 if no unpaid items', async () => {
      const mockResult = [{ total: null }];
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockResult),
        }),
      });

      const result = await service.calculateUnpaidTotal('bill-1');

      expect(result).toBe(0);
    });
  });

  describe('markItemsAsPaid', () => {
    it('should mark items as paid', async () => {
      const mockResult = [{ count: 3 }];
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(mockResult),
      });

      const result = await service.markItemsAsPaid(['item-1', 'item-2'], 'payment-1', 'Guest', 123456);

      expect(result).toBe(3);
    });
  });
});