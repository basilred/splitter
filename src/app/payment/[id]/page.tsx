'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, CreditCard, Shield, Loader2 } from 'lucide-react';
import styles from './page.module.css';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PaymentPage({ params }: PageProps) {
  const [status, setStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');
  const [paymentId, setPaymentId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);

  useEffect(() => {
    // В реальном приложении здесь был бы запрос к API для получения данных платежа
    const mockPayment = {
      id: (params as any).id,
      amount: 1250.50,
    };
    setPaymentId(mockPayment.id);
    setAmount(mockPayment.amount);
    setStatus('pending');
  }, [params]);

  const handlePay = () => {
    setStatus('processing');
    setTimeout(() => {
      setStatus('success');
    }, 2000);
  };

  return (
    <div className={styles.page}>
      <div className={styles.page__container}>
        <header className={styles.page__header}>
          <h1 className={styles.page__title}>Оплата счета</h1>
          <p className={styles.page__subtitle}>Подтвердите платеж</p>
        </header>

        <div className={styles.page__card}>
          <div className={styles.page__amount}>
            <span className={styles.page__amountLabel}>Сумма к оплате</span>
            <span className={styles.page__amountValue}>{amount.toFixed(2)} ₽</span>
          </div>

          <div className={styles.page__details}>
            <div className={styles.page__detail}>
              <span className={styles.page__detailLabel}>ID платежа</span>
              <span className={styles.page__detailValue}>{paymentId}</span>
            </div>
            <div className={styles.page__detail}>
              <span className={styles.page__detailLabel}>Способ оплаты</span>
              <span className={styles.page__detailValue}>Карта •••• 4242</span>
            </div>
            <div className={styles.page__detail}>
              <span className={styles.page__detailLabel}>Статус</span>
              <span className={`${styles.page__detailValue} ${styles[`page__detailValue--${status}`]}`}>
                {status === 'pending' && 'Ожидание'}
                {status === 'processing' && 'Обработка'}
                {status === 'success' && 'Успешно'}
                {status === 'failed' && 'Ошибка'}
              </span>
            </div>
          </div>

          {status === 'pending' && (
            <button className={styles.page__payButton} onClick={handlePay}>
              <CreditCard size={20} />
              Оплатить {amount.toFixed(2)} ₽
            </button>
          )}

          {status === 'processing' && (
            <div className={styles.page__processing}>
              <Loader2 className={styles.page__spinner} />
              <p>Проверяем платеж...</p>
            </div>
          )}

          {status === 'success' && (
            <div className={styles.page__success}>
              <CheckCircle size={48} />
              <h2>Оплата прошла успешно!</h2>
              <p>Спасибо за использование нашего сервиса.</p>
              <button
                className={styles.page__backButton}
                onClick={() => window.history.back()}
              >
                Вернуться к столику
              </button>
            </div>
          )}

          <div className={styles.page__security}>
            <Shield size={18} />
            <span>Платеж защищен шифрованием</span>
          </div>
        </div>

        <footer className={styles.page__footer}>
          <p className={styles.page__footerText}>
            В случае проблем обратитесь к персоналу заведения.
          </p>
        </footer>
      </div>
    </div>
  );
}
