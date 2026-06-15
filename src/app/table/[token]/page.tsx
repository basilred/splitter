'use client';

import { TableView } from '@/components/TableView';
import { useLaunchParams } from '@telegram-apps/sdk-react';
import { useEffect } from 'react';
import styles from './page.module.css';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function TablePage({ params }: PageProps) {
  const launchParams = useLaunchParams();

  useEffect(() => {
    // Расширяем viewport при загрузке
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.expand();
    }
  }, []);

  const token = (params as any).token; // временно, пока Next 15 не поддерживает async params

  return (
    <div className={styles.page}>
      <div className={styles.page__container}>
        <TableView token={token} />
      </div>
      <footer className={styles.page__footer}>
        <p className={styles.page__footerText}>
          Оплата через Telegram Mini App • Безопасно и быстро
        </p>
      </footer>
    </div>
  );
}
