import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService } from './PaymentService';
import { db } from '../db';
import { payments, paymentItems } from '../db/schema';

// Мокируем drizzle
vi.mock('../db', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'payment-1', billId: 'bill-1', totalAmount: 1000, status: 'pending' }]),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  },
}));

describe('PaymentService', () => {
  let service: ReturnType<typeof PaymentService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = PaymentService();
  });

  describe('create', () => {
    it('should create a payment with valid input', async () => {
      const input = {
        billId: '123e4567-e89b-12d3-a456-426614174000',
        itemSubtotal: 800,
        tipAmount: 200,
        totalAmount: 1000,
        telegramUserId: 123456,
        guestName: 'Guest',
        paymentMethod: 'card',
        paymentProvider: 'stripe',
        providerPaymentId: 'pay_123',
      };

      const result = await service.create(input);

      expect(db.insert).toHaveBeenCalledWith(payments);
      expect(result).toHaveProperty('id', 'payment-1');
      expect(result).toHaveProperty('totalAmount', 1000);
    });

    it('should create payment with items', async () => {
      const input = {
        billId: '123e4567-e89b-12d3-a456-426614174000',
        itemSubtotal: 800,
        tipAmount: 200,
        totalAmount: 1000,
      };
      const items = [
        { billItemId: '123e4567-e89b-12d3-a456-426614174001', amountAtPayment: 500 },
        { billItemId: '123e4567-e89b-12d3-a456-426614174002', amountAtPayment: 300 },
      ];

      const result = await service.create(input, items);

      expect(db.insert).toHaveBeenCalledWith(payments);
      expect(db.insert).toHaveBeenCalledWith(paymentItems);
      expect(result).toBeDefined();
    });

    it('should reject invalid input', async () => {
      const input = {
        billId: 'invalid',
        itemSubtotal: -100,
        totalAmount: 0,
      };

      await expect(service.create(input as any)).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('should return payment by id', async () => {
      const mockPayment = { id: 'payment-1', billId: 'bill-1' };
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockPayment]),
        }),
      });

      const result = await service.getById('payment-1');

      expect(result).toEqual(mockPayment);
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

  describe('listByBill', () => {
    it('should return payments for bill', async () => {
      const mockPayments = [
        { id: 'payment-1', billId: 'bill-1' },
        { id: 'payment-2', billId: 'bill-1' },
      ];
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockResolvedValue(mockPayments),
        }),
      });

      const result = await service.listByBill('bill-1');

      expect(result).toEqual(mockPayments);
    });
  });

  describe('setStatus', () => {
    it('should update payment status', async () => {
      const updatedPayment = { id: 'payment-1', status: 'succeeded' };
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedPayment]),
      });

      const result = await service.setStatus('payment-1', 'succeeded');

      expect(result).toEqual(updatedPayment);
    });

    it('should return null if payment not found', async () => {
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      });

      const result = await service.setStatus('nonexistent', 'succeeded');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update payment with metadata', async () => {
      const updatedPayment = { id: 'payment-1', providerPaymentId: 'new-id' };
      (db.update as any).mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([updatedPayment]),
      });

      const result = await service.update('payment-1', { providerPaymentId: 'new-id' });

      expect(result).toEqual(updatedPayment);
    });
  });

  describe('getWithItems', () => {
    it('should return payment with items', async () => {
      const mockPayment = {
        id: 'payment-1',
        billId: 'bill-1',
        status: 'pending',
        itemSubtotal: 1000,
        tipAmount: 0,
        totalAmount: 1000,
        telegramUserId: null,
        guestName: null,
        paymentMethod: null,
        paymentProvider: null,
        providerPaymentId: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockItems = [{ paymentId: 'payment-1', billItemId: 'item-1', amountAtPayment: 1000 }];
      vi.spyOn(service, 'getById').mockResolvedValue(mockPayment as any);
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockItems),
        }),
      });

      const result = await service.getWithItems('payment-1');

      expect(result).toEqual({ payment: mockPayment, items: mockItems });
    });

    it('should return null if payment not found', async () => {
      vi.spyOn(service, 'getById').mockResolvedValue(null);

      const result = await service.getWithItems('nonexistent');

      expect(result).toBeNull();
    });
  });
});
