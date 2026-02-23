import { Suspense } from 'react';
import { WalletGuard } from '@/components/wallet/WalletGuard';
import { CreateCollectionForm } from '@/components/collection/CreateCollectionForm';

export default function CreateCollectionPage() {
  return (
    <WalletGuard>
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <div className="mb-10">
            <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Create <span className="sierra-gradient-text">Collection</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Deploy your NFT collection on WorldLand blockchain
            </p>
          </div>
          <Suspense>
            <CreateCollectionForm />
          </Suspense>
        </div>
      </div>
    </WalletGuard>
  );
}
