import { WalletGuard } from '@/components/wallet/WalletGuard';
import { MintForm } from '@/components/nft/MintForm';

export default function MintPage() {
  return (
    <WalletGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Mint NFT</h1>
          <MintForm />
        </div>
      </div>
    </WalletGuard>
  );
}
