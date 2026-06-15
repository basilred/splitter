import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TableService } from './TableService';
import { db } from '../db';
import { tables } from '../db/schema';

// Мокируем drizzle
vi.mock('../db', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'table-1', tableToken: 'token123' }]),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
}));

describe('TableService', () => {
  let service: ReturnType<typeof TableService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = TableService();
  });

  describe('create', () => {
    it('should create a table with generated token', async () => {
      const input = {
        venueId: '123e4567-e89b-12d3-a456-426614174000',
        label: 'Table 5',
        externalId: 'ext-123',
      };

      const result = await service.create(input);

      expect(db.insert).toHaveBeenCalledWith(tables);
      expect(result).toHaveProperty('id', 'table-1');
      expect(result).toHaveProperty('tableToken', 'token123');
    });

    it('should reject invalid input', async () => {
      const input = {
        venueId: '', // invalid
        label: '',
      };

      await expect(service.create(input as any)).rejects.toThrow();
    });
  });

  describe('getByToken', () => {
    it('should return table by token', async () => {
      const mockTable = { id: 'table-1', tableToken: 'token123' };
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockTable]),
        }),
      });

      const result = await service.getByToken('token123');

      expect(result).toEqual(mockTable);
    });

    it('should return null if not found', async () => {
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getByToken('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update table', async () => {
      const updatedTable = { id: 'table-1', label: 'Updated' };
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedTable]),
      });

      const result = await service.update('table-1', { label: 'Updated' });

      expect(result).toEqual(updatedTable);
    });

    it('should return null if table not found', async () => {
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      });

      const result = await service.update('nonexistent', { label: 'Updated' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete table', async () => {
      (db.delete as any).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await service.delete('table-1');

      expect(result).toBe(true);
    });
  });
});
