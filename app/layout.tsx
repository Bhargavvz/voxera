import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ToasterProvider } from '@/components/providers/toaster-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Voxera - Share Your Voice',
  description: 'A social platform for sharing voice messages and connecting with others.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <ToasterProvider />
      </body>
    </html>
  );
}