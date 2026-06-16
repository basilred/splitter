import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MenuItemService } from './MenuItemService';

vi.mock('../db', () => ({ db: {} }));

describe('MenuItemService', () => {
  let service: ReturnType<typeof MenuItemService>;

  beforeEach(() => {
    service = MenuItemService();
  });

  describe('createCategory', () => {
    it('should reject empty name', async () => {
      await expect(service.createCategory({
        venueId: '123e4567-e89b-12d3-a456-426614174000',
        name: '',
      })).rejects.toThrow();
    });

    it('should reject short name', async () => {
      await expect(service.createCategory({
        venueId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'A'.repeat(101),
      })).rejects.toThrow();
    });
  });

  describe('createItem', () => {
    it('should reject empty name', async () => {
      await expect(service.createItem({
        venueId: '123e4567-e89b-12d3-a456-426614174000',
        name: '',
        unitPrice: 25000,
      })).rejects.toThrow();
    });

    it('should reject negative price', async () => {
      await expect(service.createItem({
        venueId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Эспрессо',
        unitPrice: -100,
      })).rejects.toThrow();
    });
  });

  describe('updateItem', () => {
    it('should reject non-integer price', async () => {
      await expect(service.updateItem('item-1', {
        unitPrice: 1.5,
      } as any)).rejects.toThrow();
    });
  });

  describe('updateCategory', () => {
    it('should reject empty name', async () => {
      await expect(service.updateCategory('cat-1', { name: '' })).rejects.toThrow();
    });
  });

  it('should have all required methods', () => {
    expect(service).toHaveProperty('createCategory');
    expect(service).toHaveProperty('listCategories');
    expect(service).toHaveProperty('getCategoryById');
    expect(service).toHaveProperty('updateCategory');
    expect(service).toHaveProperty('deleteCategory');
    expect(service).toHaveProperty('createItem');
    expect(service).toHaveProperty('listItems');
    expect(service).toHaveProperty('listItemsByCategory');
    expect(service).toHaveProperty('getItemById');
    expect(service).toHaveProperty('updateItem');
    expect(service).toHaveProperty('deactivateItem');
    expect(service).toHaveProperty('deleteItem');
  });
});
