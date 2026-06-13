import { useEffect, useState } from 'react';
import { Table, Bill, BillItem } from '@/lib/db/schema';
import { BillItemList } from './BillItemList';
import { TipSelector } from './TipSelector';
import { PaymentSummary } from './PaymentSummary';
import { Loader2, Users, Clock, Hash } from 'lucide-react';
import styles from './TableView.module.css';

interface TableViewProps {
  token: string;
}

interface TableWithVenue extends Table {
  venue?: {
    name: string;
    address?: string;
  };
}

interface BillWithItems extends Bill {
  items: BillItem[];
}

export function TableView({ token }: TableViewProps) {
  const [table, setTable] = useState<TableWithVenue | null>(null);
  const [bill, setBill] = useState<BillWithItems | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [tipPercentage, setTipPercentage] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTable() {
      try {
        const res = await fetch(`/api/tables/${token}`);
        if (!res.ok) throw new Error('Столик не найден');
        const data = await res.json();
        setTable(data.table);
        setBill(data.bill);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    }
    fetchTable();
  }, [token]);

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleTipChange = (percentage: number) => {
    setTipPercentage(percentage);
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <Loader2 className={styles.spinner} />
        <p>Загружаем ваш столик...</p>
      </div>
    );
  }

  if (error || !table || !bill) {
    return (
      <div className={styles.error}>
        <h2>Ошибка</h2>
        <p>{error || 'Столик не найден'}</p>
        <button className={styles.retry} onClick={() => window.location.reload()}>
          Попробовать снова
        </button>
      </div>
    );
  }

  const selectedItemsData = bill.items.filter(item => selectedItems.includes(item.id));
  const subtotal = selectedItemsData.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0) / 100;
  const tipAmount = subtotal * (tipPercentage / 100);
  const total = subtotal + tipAmount;

  return (
    <div className={styles.table}>
      <header className={styles.table__header}>
        <div className={styles.table__meta}>
          <h1 className={styles.table__title}>Столик {table.label}</h1>
          <div className={styles.table__details}>
            <span className={styles.table__detail}>
              <Users size={16} />
              Столик
            </span>
            <span className={styles.table__detail}>
              <Clock size={16} />
              {new Date(bill.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className={styles.table__detail}>
              <Hash size={16} />
              {bill.items.length} позиций
            </span>
          </div>
        </div>
        <div className={styles.table__venue}>
          <h2 className={styles.table__venueName}>{table.venue?.name || 'Ресторан'}</h2>
          <p className={styles.table__venueAddress}>{table.venue?.address || ''}</p>
        </div>
      </header>

      <main className={styles.table__main}>
        <section className={styles.table__section}>
          <h3 className={styles.table__sectionTitle}>Выберите позиции для оплаты</h3>
          <BillItemList
            items={bill.items.map(item => ({
              id: parseInt(item.id), // временно
              name: item.name,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              status: item.status,
            }))}
            selectedIds={selectedItems.map(id => parseInt(id))}
            onToggle={(id) => handleItemToggle(id.toString())}
          />
        </section>

        <section className={styles.table__section}>
          <h3 className={styles.table__sectionTitle}>Чаевые</h3>
          <TipSelector
            selectedPercentage={tipPercentage}
            onSelect={handleTipChange}
          />
        </section>

        <section className={styles.table__section}>
          <h3 className={styles.table__sectionTitle}>Итог</h3>
          <PaymentSummary
            subtotal={subtotal}
            tipAmount={tipAmount}
            total={total}
            selectedCount={selectedItems.length}
          />
        </section>
      </main>

      <footer className={styles.table__footer}>
        <button
          className={styles.table__payButton}
          disabled={selectedItems.length === 0}
          onClick={() => {
            // Переход на страницу оплаты
            window.location.href = `/payment?token=${token}&items=${selectedItems.join(',')}&tip=${tipPercentage}`;
          }}
        >
          Перейти к оплате
        </button>
        <p className={styles.table__hint}>
          Вы выбрали {selectedItems.length} позиций на сумму {total.toFixed(2)} ₽
        </p>
      </footer>
    </div>
  );
}
