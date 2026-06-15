'use client';

import { type ReactNode, useEffect } from 'react';

interface TelegramProviderProps {
  children: ReactNode;
}

export function TelegramProvider({ children }: TelegramProviderProps) {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      webApp.ready();
      webApp.expand();
      webApp.setHeaderColor('#1a1a1a');
      webApp.setBackgroundColor('#0a0a0a');
      webApp.enableClosingConfirmation();
    }
  }, []);

  return <>{children}</>;
}
