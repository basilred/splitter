import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { TelegramProvider } from "@/components/TelegramProvider";

export const metadata: Metadata = {
  title: "Split Bill Mini App",
  description: "Telegram Mini App MVP for table-level split payments.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <TelegramProvider>{children}</TelegramProvider>
      </body>
    </html>
  );
}
