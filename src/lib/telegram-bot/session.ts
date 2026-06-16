import { SessionFlavor } from 'grammy';

export interface SessionData {
  venueId?: string;
  context: ContextType;
  currentTableId?: string;
  currentBillId?: string;
  awaitingInput?: AwaitingInput | null;
  messageTarget?: {
    chatId: number;
    messageId?: number;
  };
}

export type ContextType =
  | 'idle'
  | 'viewing_tables'
  | 'viewing_table'
  | 'viewing_bill'
  | 'viewing_menu'
  | 'awaiting_input';

export interface AwaitingInput {
  type: AwaitingInputType;
  billId: string;
  data?: Record<string, unknown>;
}

export type AwaitingInputType =
  | 'add_item_name'
  | 'add_item_price'
  | 'add_item_qty'
  | 'add_item_from_menu'
  | 'edit_qty'
  | 'table_name'
  | 'menu_item_name'
  | 'menu_item_price'
  | 'menu_item_cat_name'
  | 'staff_name'
  | 'venue_name';

export type MyContext = import('grammy').Context & SessionFlavor<SessionData>;

export function createInitialSession(): SessionData {
  return {
    context: 'idle',
  };
}

export function setContext(session: SessionData, context: ContextType, extras?: Partial<SessionData>): void {
  session.context = context;
  if (extras) {
    Object.assign(session, extras);
  }
}

export function setAwaitingInput(session: SessionData, input: AwaitingInput): void {
  session.context = 'awaiting_input';
  session.awaitingInput = input;
}

export function clearAwaitingInput(session: SessionData): void {
  session.awaitingInput = null;
  session.context = 'idle';
}
