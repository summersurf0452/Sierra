import type { Metadata } from 'next';
import { Web3Provider } from '@/components/providers/Web3Provider';
import { LayoutContent } from '@/components/layout/LayoutContent';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sierra | WorldLand NFT Marketplace',
  description:
    'NFT Marketplace on WorldLand Blockchain - Mint and trade ERC-721 & ERC-1155 NFTs',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <Web3Provider>
          <LayoutContent>{children}</LayoutContent>
        </Web3Provider>
      </body>
    </html>
  );
}
