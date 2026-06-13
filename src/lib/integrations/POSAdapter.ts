// Интерфейс адаптера для интеграции с POS-системами
export interface POSAdapter {
  // Синхронизация счета
  syncBill(billData: any): Promise<void>;
  // Синхронизация позиции
  syncItem(itemData: any): Promise<void>;
  // Синхронизация платежа
  syncPayment(paymentData: any): Promise<void>;
  // Получение столиков из POS
  fetchTables(venueId: string): Promise<any[]>;
  // Получение открытых счетов для столика
  fetchOpenBills(tableExternalId: string): Promise<any[]>;
  // Закрытие счета в POS
  closeBill(billExternalId: string): Promise<void>;
}

// Базовый класс адаптера с общей логикой
export abstract class BasePOSAdapter implements POSAdapter {
  protected config: Record<string, any>;

  constructor(config: Record<string, any>) {
    this.config = config;
  }

  abstract syncBill(billData: any): Promise<void>;
  abstract syncItem(itemData: any): Promise<void>;
  abstract syncPayment(paymentData: any): Promise<void>;
  abstract fetchTables(venueId: string): Promise<any[]>;
  abstract fetchOpenBills(tableExternalId: string): Promise<any[]>;
  abstract closeBill(billExternalId: string): Promise<void>;

  protected log(message: string, data?: any) {
    console.log(`[POSAdapter] ${message}`, data ? JSON.stringify(data) : '');
  }

  protected error(message: string, error?: any) {
    console.error(`[POSAdapter] ${message}`, error);
  }
}

// Заглушка адаптера для разработки
export class StubPOSAdapter extends BasePOSAdapter {
  async syncBill(billData: any): Promise<void> {
    this.log('Stub: syncBill', billData);
  }

  async syncItem(itemData: any): Promise<void> {
    this.log('Stub: syncItem', itemData);
  }

  async syncPayment(paymentData: any): Promise<void> {
    this.log('Stub: syncPayment', paymentData);
  }

  async fetchTables(venueId: string): Promise<any[]> {
    this.log('Stub: fetchTables', { venueId });
    return [];
  }

  async fetchOpenBills(tableExternalId: string): Promise<any[]> {
    this.log('Stub: fetchOpenBills', { tableExternalId });
    return [];
  }

  async closeBill(billExternalId: string): Promise<void> {
    this.log('Stub: closeBill', { billExternalId });
  }
}

// Адаптер для iiko
export class IikoPOSAdapter extends BasePOSAdapter {
  async syncBill(billData: any): Promise<void> {
    this.log('iiko: syncBill (not implemented)', billData);
    throw new Error('iiko integration not implemented');
  }

  async syncItem(itemData: any): Promise<void> {
    this.log('iiko: syncItem (not implemented)', itemData);
    throw new Error('iiko integration not implemented');
  }

  async syncPayment(paymentData: any): Promise<void> {
    this.log('iiko: syncPayment (not implemented)', paymentData);
    throw new Error('iiko integration not implemented');
  }

  async fetchTables(venueId: string): Promise<any[]> {
    this.log('iiko: fetchTables (not implemented)', { venueId });
    return [];
  }

  async fetchOpenBills(tableExternalId: string): Promise<any[]> {
    this.log('iiko: fetchOpenBills (not implemented)', { tableExternalId });
    return [];
  }

  async closeBill(billExternalId: string): Promise<void> {
    this.log('iiko: closeBill (not implemented)', { billExternalId });
    throw new Error('iiko integration not implemented');
  }
}

// Адаптер для R-Keeper
export class RKeeperPOSAdapter extends BasePOSAdapter {
  async syncBill(billData: any): Promise<void> {
    this.log('R-Keeper: syncBill (not implemented)', billData);
    throw new Error('R-Keeper integration not implemented');
  }

  async syncItem(itemData: any): Promise<void> {
    this.log('R-Keeper: syncItem (not implemented)', itemData);
    throw new Error('R-Keeper integration not implemented');
  }

  async syncPayment(paymentData: any): Promise<void> {
    this.log('R-Keeper: syncPayment (not implemented)', paymentData);
    throw new Error('R-Keeper integration not implemented');
  }

  async fetchTables(venueId: string): Promise<any[]> {
    this.log('R-Keeper: fetchTables (not implemented)', { venueId });
    return [];
  }

  async fetchOpenBills(tableExternalId: string): Promise<any[]> {
    this.log('R-Keeper: fetchOpenBills (not implemented)', { tableExternalId });
    return [];
  }

  async closeBill(billExternalId: string): Promise<void> {
    this.log('R-Keeper: closeBill (not implemented)', { billExternalId });
    throw new Error('R-Keeper integration not implemented');
  }
}

// Адаптер для Poster
export class PosterPOSAdapter extends BasePOSAdapter {
  async syncBill(billData: any): Promise<void> {
    this.log('Poster: syncBill (not implemented)', billData);
    throw new Error('Poster integration not implemented');
  }

  async syncItem(itemData: any): Promise<void> {
    this.log('Poster: syncItem (not implemented)', itemData);
    throw new Error('Poster integration not implemented');
  }

  async syncPayment(paymentData: any): Promise<void> {
    this.log('Poster: syncPayment (not implemented)', paymentData);
    throw new Error('Poster integration not implemented');
  }

  async fetchTables(venueId: string): Promise<any[]> {
    this.log('Poster: fetchTables (not implemented)', { venueId });
    return [];
  }

  async fetchOpenBills(tableExternalId: string): Promise<any[]> {
    this.log('Poster: fetchOpenBills (not implemented)', { tableExternalId });
    return [];
  }

  async closeBill(billExternalId: string): Promise<void> {
    this.log('Poster: closeBill (not implemented)', { billExternalId });
    throw new Error('Poster integration not implemented');
  }
}

// Фабрика для создания адаптеров
export function createPOSAdapter(type: 'iiko' | 'rkeeper' | 'poster' | 'stub', config: Record<string, any>): POSAdapter {
  switch (type) {
    case 'iiko':
      return new IikoPOSAdapter(config);
    case 'rkeeper':
      return new RKeeperPOSAdapter(config);
    case 'poster':
      return new PosterPOSAdapter(config);
    case 'stub':
    default:
      return new StubPOSAdapter(config);
  }
}
