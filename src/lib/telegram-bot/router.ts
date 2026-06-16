import { z } from 'zod';

const CallbackDataSchema = z.string().refine(
  (val) => /^[a-z_]+:[a-z_]+:.+$/.test(val),
  { message: 'Invalid callback data format. Expected namespace:action:payload' }
);

export interface ParsedCallback {
  namespace: string;
  action: string;
  payload: string;
}

export function parseCallbackData(data: string): ParsedCallback | null {
  const result = CallbackDataSchema.safeParse(data);
  if (!result.success) return null;

  const [namespace, action, ...rest] = data.split(':');
  return {
    namespace,
    action,
    payload: rest.join(':'),
  };
}

// Callback data builders
export function cb(namespace: string, action: string, payload: string): string {
  return `${namespace}:${action}:${payload}`;
}

// Namespace helpers
export const cbTable = {
  list: () => cb('table', 'list', '_'),
  show: (id: string) => cb('table', 'show', id),
  create: () => cb('table', 'create', '_'),
  deactivate: (id: string) => cb('table', 'deactivate', id),
  rename: (id: string) => cb('table', 'rename', id),
};

export const cbBill = {
  show: (id: string) => cb('bill', 'show', id),
  open: (tableId: string) => cb('bill', 'open', tableId),
  close: (id: string) => cb('bill', 'close', id),
  addItem: (id: string) => cb('bill', 'add_item', id),
  addItemFromMenu: (id: string) => cb('bill', 'add_menu', id),
  addItemCustom: (id: string) => cb('bill', 'add_custom', id),
  removeItem: (itemId: string) => cb('bill', 'remove_item', itemId),
  editQty: (itemId: string) => cb('bill', 'edit_qty', itemId),
  payments: (id: string) => cb('bill', 'payments', id),
};

export const cbMenu = {
  list: () => cb('menu', 'list', '_'),
  addCategory: () => cb('menu', 'add_cat', '_'),
  showCategory: (id: string) => cb('menu', 'show_cat', id),
  deleteCategory: (id: string) => cb('menu', 'del_cat', id),
  addItem: (categoryId: string) => cb('menu', 'add_item', categoryId),
  editItem: (id: string) => cb('menu', 'edit_item', id),
  deactivateItem: (id: string) => cb('menu', 'deact_item', id),
  addItemToBill: (itemId: string) => cb('menu', 'to_bill', itemId),
};

export const cbStats = {
  show: (period: string) => cb('stats', 'show', period),
};

export const cbNav = {
  main: () => cb('nav', 'main', '_'),
  back: (to: string) => cb('nav', 'back', to),
};
