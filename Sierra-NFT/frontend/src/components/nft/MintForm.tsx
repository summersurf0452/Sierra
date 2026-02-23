'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMintNFT } from '@/hooks/useMintNFT';
import { useMintNFT1155 } from '@/hooks/useMintNFT1155';
import { TransactionModal } from '@/components/transaction/TransactionModal';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { Upload, X } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const mintSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
  image: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, 'Please select an image')
    .refine(
      (files) => files?.[0]?.size <= MAX_FILE_SIZE,
      'File size must be 10MB or less',
    ),
  collectionIndex: z.string().min(1, 'Please select a collection'),
  nftType: z.enum(['ERC721', 'ERC1155']),
  amount: z.number().min(1, 'Edition amount must be at least 1').optional(),
});

type MintFormData = z.infer<typeof mintSchema>;

interface Collection {
  id: string;
  onChainId: number;
  name: string;
  symbol: string;
  contractType: 'ERC721' | 'ERC1155';
}

export function MintForm() {
  const router = useRouter();
  const { address } = useAccount();
  const erc721Mint = useMintNFT();
  const erc1155Mint = useMintNFT1155();

  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<MintFormData>({
    resolver: zodResolver(mintSchema),
    defaultValues: {
      nftType: 'ERC721',
      amount: 1,
    },
  });

  const watchImage = watch('image');
  const watchNftType = watch('nftType');

  // Determine which mint hook to use
  const activeMint = watchNftType === 'ERC1155' ? erc1155Mint : erc721Mint;
  const { status, error, result, steps, reset } = activeMint;

  // Filter collections by nftType
  const collections = allCollections.filter((c) => c.contractType === watchNftType);

  // Load user's collections
  useEffect(() => {
    if (address) {
      loadCollections();
    }
  }, [address]);

  const loadCollections = async () => {
    try {
      setLoadingCollections(true);
      const res = await api.get<{ data: Collection[] }>(
        `/collections/creator/${address}`,
      );
      setAllCollections(res.data || []);
    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setLoadingCollections(false);
    }
  };

  // Reset collection selection when nftType changes
  useEffect(() => {
    setValue('collectionIndex', '');
  }, [watchNftType, setValue]);

  // Update image preview
  useEffect(() => {
    if (watchImage && watchImage.length > 0) {
      const file = watchImage[0];
      const url = URL.createObjectURL(file);
      setImagePreview(url);

      return () => URL.revokeObjectURL(url);
    } else {
      setImagePreview(null);
    }
  }, [watchImage]);

  const onSubmit = async (data: MintFormData) => {
    try {
      const selected = collections[Number(data.collectionIndex)];
      if (!selected) return;

      let mintResult;

      if (data.nftType === 'ERC1155') {
        mintResult = await erc1155Mint.mint({
          name: data.name,
          description: data.description || '',
          image: data.image[0],
          onChainId: selected.onChainId,
          collectionId: selected.id,
          amount: data.amount || 1,
        });
      } else {
        mintResult = await erc721Mint.mint({
          name: data.name,
          description: data.description || '',
          image: data.image[0],
          onChainId: selected.onChainId,
          collectionId: selected.id,
        });
      }

      // Redirect to NFT detail page
      router.push(`/nft/${mintResult.nftId}`);
    } catch (err) {
      console.error('Mint failed:', err);
    }
  };

  const handleViewNFT = () => {
    if (result?.nftId) {
      router.push(`/nft/${result.nftId}`);
    }
  };

  const isModalOpen = status !== 'idle';

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* NFT Type Toggle */}
        <div>
          <label className="block text-sm font-medium mb-2">NFT Type</label>
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button
              type="button"
              onClick={() => setValue('nftType', 'ERC721')}
              className={`flex-1 py-2.5 px-4 text-sm font-semibold transition ${
                watchNftType === 'ERC721'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-accent'
              }`}
            >
              ERC-721 (Single)
            </button>
            <button
              type="button"
              onClick={() => setValue('nftType', 'ERC1155')}
              className={`flex-1 py-2.5 px-4 text-sm font-semibold transition ${
                watchNftType === 'ERC1155'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-accent'
              }`}
            >
              ERC-1155 (Edition)
            </button>
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">Image</label>

          <div className="relative">
            <input
              {...register('image')}
              type="file"
              accept="image/*"
              className="hidden"
              id="image-upload"
            />

            <label
              htmlFor="image-upload"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer bg-card hover:bg-muted transition-colors"
            >
              {imagePreview ? (
                <div className="relative w-full h-full">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-contain rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setValue('image', null as any);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 right-2 p-2 bg-gray-950 rounded-full hover:bg-accent"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 p-6">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click or drag to upload an image
                  </p>
                  <p className="text-xs text-muted-foreground">Max 10MB</p>
                </div>
              )}
            </label>
          </div>

          {errors.image && (
            <p className="mt-1 text-sm text-red-500">
              {errors.image.message as string}
            </p>
          )}
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">
            Name *
          </label>
          <input
            {...register('name')}
            type="text"
            id="name"
            placeholder="Enter NFT name"
            className="w-full px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium mb-2"
          >
            Description
          </label>
          <textarea
            {...register('description')}
            id="description"
            rows={4}
            placeholder="Enter NFT description (optional)"
            className="w-full px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-500">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Edition Amount (ERC-1155 only) */}
        {watchNftType === 'ERC1155' && (
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium mb-2"
            >
              Edition Amount *
            </label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number"
              id="amount"
              min={1}
              placeholder="Amount to mint (e.g. 10)"
              className="w-full px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Mint multiple copies of the same NFT
            </p>
            {errors.amount && (
              <p className="mt-1 text-sm text-red-500">
                {errors.amount.message}
              </p>
            )}
          </div>
        )}

        {/* Collection Select */}
        <div>
          <label
            htmlFor="collectionId"
            className="block text-sm font-medium mb-2"
          >
            Collection *
            <span className="text-xs text-muted-foreground ml-2">
              (Showing {watchNftType === 'ERC1155' ? 'ERC-1155' : 'ERC-721'} collections only)
            </span>
          </label>

          {loadingCollections ? (
            <div className="text-sm text-muted-foreground">Loading collections...</div>
          ) : collections.length === 0 ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {watchNftType === 'ERC1155'
                  ? 'No ERC-1155 collections found. Please create a collection first.'
                  : 'Please create a collection first'}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/collections/create?type=${watchNftType}`)}
              >
                Create Collection
              </Button>
            </div>
          ) : (
            <>
              <select
                {...register('collectionIndex')}
                id="collectionIndex"
                className="w-full px-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a collection</option>
                {collections.map((collection, idx) => (
                  <option key={collection.id} value={idx}>
                    {collection.name}{collection.symbol ? ` (${collection.symbol})` : ''}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="link"
                onClick={() => router.push(`/collections/create?type=${watchNftType}`)}
                className="mt-2"
              >
                + Create New Collection
              </Button>
            </>
          )}

          {errors.collectionIndex && (
            <p className="mt-1 text-sm text-red-500">
              {errors.collectionIndex.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={status !== 'idle' && status !== 'error'}
          className="w-full"
        >
          {status === 'idle' || status === 'error'
            ? watchNftType === 'ERC1155'
              ? 'Mint ERC-1155 NFT'
              : 'Mint NFT'
            : 'Minting...'}
        </Button>
      </form>

      {/* Transaction Modal */}
      <TransactionModal
        open={isModalOpen}
        title={watchNftType === 'ERC1155' ? 'Mint ERC-1155 NFT' : 'Mint NFT'}
        steps={steps}
        error={error}
        success={status === 'success'}
        successMessage="NFT has been minted successfully!"
        onClose={() => {
          reset();
          handleViewNFT();
        }}
        onRetry={() => {
          reset();
        }}
        onViewNFT={handleViewNFT}
      />
    </>
  );
}
