import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Outfit } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading-var',
});

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Mint — AI Chat & Agent',
  description: 'Chat with AI or let an Agent handle tasks for you',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      className={`${plusJakartaSans.variable} ${outfit.variable}`}
    >
      <body className="font-sans antialiased bg-bg text-text">{children}</body>
    </html>
  );
}
