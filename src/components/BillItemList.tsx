import { Check, X } from 'lucide-react';
import styles from './BillItemList.module.css';

export interface BillItem {
  id: number;
  name: string;
  unitPrice: number; // в копейках
  quantity: number;
  status: 'unpaid' | 'paid';
}

interface BillItemListProps {
  items: BillItem[];
  selectedIds: number[];
  onToggle: (itemId: number) => void;
}

export function BillItemList({ items, selectedIds, onToggle }: BillItemListProps) {
  const formatPrice = (price: number) => {
    // цена в копейках -> рубли
    return (price / 100).toFixed(2);
  };

  return (
    <div className={styles.list}>
      {items.length === 0 ? (
        <div className={styles.list__empty}>
          <X size={24} />
          <p>Позиции отсутствуют</p>
        </div>
      ) : (
        <ul className={styles.list__items}>
          {items.map(item => {
            const isSelected = selectedIds.includes(item.id);
            const totalPrice = item.unitPrice * item.quantity;
            return (
              <li
                key={item.id}
                className={`${styles.list__item} ${isSelected ? styles['list__item--selected'] : ''}`}
                onClick={() => onToggle(item.id)}
              >
                <div className={styles.list__itemCheckbox}>
                  <div className={styles.list__checkbox}>
                    {isSelected && <Check size={16} />}
                  </div>
                </div>
                <div className={styles.list__itemContent}>
                  <h4 className={styles.list__itemName}>{item.name}</h4>
                  <div className={styles.list__itemMeta}>
                    <span className={styles.list__itemQuantity}>{item.quantity} × {formatPrice(item.unitPrice)} ₽</span>
                    <span className={styles.list__itemStatus}>
                      {item.status === 'paid' ? 'Оплачено' : 'Не оплачено'}
                    </span>
                  </div>
                </div>
                <div className={styles.list__itemPrice}>
                  <span className={styles.list__itemTotal}>{formatPrice(totalPrice)} ₽</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className={styles.list__footer}>
        <p className={styles.list__selectedCount}>
          Выбрано: {selectedIds.length} из {items.length}
        </p>
        <button
          className={styles.list__selectAll}
          onClick={() => {
            if (selectedIds.length === items.length) {
              // снять все
              items.forEach(item => onToggle(item.id));
            } else {
              // выбрать все
              items.forEach(item => {
                if (!selectedIds.includes(item.id)) onToggle(item.id);
              });
            }
          }}
        >
          {selectedIds.length === items.length ? 'Снять все' : 'Выбрать все'}
        </button>
      </div>
    </div>
  );
}
