import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'KKHoliday 雙梯次名額即時監控推播系統 (雲端 24h 全時運作 · 23~08 夜間免打擾)',
  description: '雲端 24 小時全時監控 KKHoliday 太平山山毛櫸一日遊行程名額，當梯次可售名額釋出或即將搶光時即刻發送 Telegram 推播通知；內建台灣時間 23:00~08:00 夜間免打擾保護。',
  openGraph: {
    title: 'KKHoliday 雙梯次名額即時監控推播系統 (雲端 24h 全時運作 · 23~08 夜間免打擾)',
    description: '雲端 24 小時全時監控 KKHoliday 太平山山毛櫸一日遊行程名額，當梯次可售名額釋出或即將搶光時即刻發送 Telegram 推播通知；內建台灣時間 23:00~08:00 夜間免打擾保護。',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KKHoliday 雙梯次名額即時監控推播系統 (雲端 24h 全時運作 · 23~08 夜間免打擾)',
    description: '雲端 24 小時全時監控 KKHoliday 太平山山毛櫸一日遊行程名額，當梯次可售名額釋出或即將搶光時即刻發送 Telegram 推播通知；內建台灣時間 23:00~08:00 夜間免打擾保護。',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="zh-Hant-TW">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
