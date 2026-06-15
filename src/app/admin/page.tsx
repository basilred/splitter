'use client';

import { useState, useEffect } from 'react';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { Settings, Users, QrCode, BarChart, Plus, Edit, Trash2 } from 'lucide-react';
import styles from './page.module.css';

interface Table {
  id: string;
  label: string;
  token: string;
  isActive: boolean;
}

interface Venue {
  id: string;
  name: string;
  currency: string;
}

export default function AdminPage() {
  const [tables, setTables] = useState<Table[]>([
    { id: '1', label: 'Столик 1', token: 'abc123', isActive: true },
    { id: '2', label: 'Столик 2', token: 'def456', isActive: true },
    { id: '3', label: 'Столик 3', token: 'ghi789', isActive: false },
  ]);
  const [venues, setVenues] = useState<Venue[]>([
    { id: '1', name: 'Ресторан "Уют"', currency: 'RUB' },
    { id: '2', name: 'Бар "Крафт"', currency: 'RUB' },
  ]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(tables[0]);
  const [activeTab, setActiveTab] = useState<'tables' | 'venues' | 'qr'>('tables');

  const handleAddTable = () => {
    const newTable: Table = {
      id: Date.now().toString(),
      label: `Столик ${tables.length + 1}`,
      token: Math.random().toString(36).substring(2, 10),
      isActive: true,
    };
    setTables([...tables, newTable]);
    setSelectedTable(newTable);
  };

  const handleToggleActive = (id: string) => {
    setTables(tables.map(table =>
      table.id === id ? { ...table, isActive: !table.isActive } : table
    ));
  };

  const handleDeleteTable = (id: string) => {
    setTables(tables.filter(table => table.id !== id));
    if (selectedTable?.id === id) {
      setSelectedTable(tables.length > 1 ? tables[1] : null);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.page__header}>
        <h1 className={styles.page__title}>
          <Settings size={28} />
          Админ-панель
        </h1>
        <p className={styles.page__subtitle}>Управление заведениями и столиками</p>
      </header>

      <div className={styles.page__tabs}>
        <button
          className={`${styles.page__tab} ${activeTab === 'tables' ? styles['page__tab--active'] : ''}`}
          onClick={() => setActiveTab('tables')}
        >
          <Users size={18} />
          Столики
        </button>
        <button
          className={`${styles.page__tab} ${activeTab === 'venues' ? styles['page__tab--active'] : ''}`}
          onClick={() => setActiveTab('venues')}
        >
          <BarChart size={18} />
          Заведения
        </button>
        <button
          className={`${styles.page__tab} ${activeTab === 'qr' ? styles['page__tab--active'] : ''}`}
          onClick={() => setActiveTab('qr')}
        >
          <QrCode size={18} />
          QR-коды
        </button>
      </div>

      <div className={styles.page__content}>
        {activeTab === 'tables' && (
          <div className={styles.page__section}>
            <div className={styles.page__sectionHeader}>
              <h2>Список столиков</h2>
              <button className={styles.page__addButton} onClick={handleAddTable}>
                <Plus size={18} />
                Добавить столик
              </button>
            </div>
            <div className={styles.page__tableList}>
              {tables.map(table => (
                <div
                  key={table.id}
                  className={`${styles.page__tableItem} ${selectedTable?.id === table.id ? styles['page__tableItem--selected'] : ''}`}
                  onClick={() => setSelectedTable(table)}
                >
                  <div className={styles.page__tableInfo}>
                    <h3 className={styles.page__tableLabel}>{table.label}</h3>
                    <p className={styles.page__tableToken}>Токен: {table.token}</p>
                    <span className={`${styles.page__tableStatus} ${table.isActive ? styles['page__tableStatus--active'] : styles['page__tableStatus--inactive']}`}>
                      {table.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                  </div>
                  <div className={styles.page__tableActions}>
                    <button
                      className={styles.page__tableAction}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(table.id);
                      }}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className={styles.page__tableAction}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTable(table.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'venues' && (
          <div className={styles.page__section}>
            <h2>Заведения</h2>
            <div className={styles.page__venueList}>
              {venues.map(venue => (
                <div key={venue.id} className={styles.page__venueItem}>
                  <h3 className={styles.page__venueName}>{venue.name}</h3>
                  <p className={styles.page__venueCurrency}>Валюта: {venue.currency}</p>
                  <button className={styles.page__venueEdit}>Редактировать</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'qr' && selectedTable && (
          <div className={styles.page__section}>
            <h2>QR-код для {selectedTable.label}</h2>
            <div className={styles.page__qrContainer}>
              <QRCodeDisplay
                token={selectedTable.token}
                tableLabel={selectedTable.label}
                size={300}
              />
            </div>
            <div className={styles.page__qrInstructions}>
              <p>Распечатайте этот QR-код и разместите на столике.</p>
              <p>Гости смогут сканировать его камерой Telegram для оплаты.</p>
            </div>
          </div>
        )}
      </div>

      <footer className={styles.page__footer}>
        <p className={styles.page__footerText}>
          Админ-панель Split Bill Mini App • {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
