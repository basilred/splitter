import { CreditCard, Receipt, Wallet } from 'lucide-react';
import styles from './PaymentSummary.module.css';

interface PaymentSummaryProps {
  subtotal: number;
  tipAmount: number;
  total: number;
  selectedCount: number;
}

export function PaymentSummary({ subtotal, tipAmount, total, selectedCount }: PaymentSummaryProps) {
  const formatCurrency = (amount: number) => {
    return amount.toFixed(2);
  };

  return (
    <div className={styles.summary}>
      <div className={styles.summary__header}>
        <Receipt size={24} />
        <h3 className={styles.summary__title}>Итог к оплате</h3>
      </div>

      <div className={styles.summary__details}>
        <div className={styles.summary__row}>
          <span className={styles.summary__label}>Позиции ({selectedCount})</span>
          <span className={styles.summary__value}>{formatCurrency(subtotal)} ₽</span>
        </div>
        <div className={styles.summary__row}>
          <span className={styles.summary__label}>Чаевые</span>
          <span className={styles.summary__value}>+{formatCurrency(tipAmount)} ₽</span>
        </div>
        <div className={styles.summary__divider} />
        <div className={`${styles.summary__row} ${styles['summary__row--total']}`}>
          <span className={styles.summary__label}>
            <Wallet size={18} />
            Итого
          </span>
          <span className={styles.summary__total}>{formatCurrency(total)} ₽</span>
        </div>
      </div>

      <div className={styles.summary__methods}>
        <h4 className={styles.summary__methodsTitle}>Способы оплаты</h4>
        <div className={styles.summary__methodsList}>
          <div className={styles.summary__method}>
            <CreditCard size={20} />
            <span>Карта</span>
          </div>
          <div className={styles.summary__method}>
            <div className={styles.summary__methodIcon}>🍏</div>
            <span>Apple Pay</span>
          </div>
          <div className={styles.summary__method}>
            <div className={styles.summary__methodIcon}>🤖</div>
            <span>Google Pay</span>
          </div>
        </div>
      </div>

      <div className={styles.summary__note}>
        <p>Оплата проходит через защищенный шлюз. Данные карт не сохраняются.</p>
      </div>
    </div>
  );
}
