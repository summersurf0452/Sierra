'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateCollection } from '@/hooks/useCreateCollection';
import { TransactionModal } from '@/components/transaction/TransactionModal';
import { Button } from '@/components/ui/button';
import { Upload, X, ImagePlus, GripVertical, Trash2 } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_BATCH_FILES = 50;

const createCollectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .max(10, 'Symbol must be 10 characters or less')
    .toUpperCase(),
  description: z.string().max(2000, 'Description must be 2000 characters or less').optional(),
  coverImage: z
    .custom<FileList>()
    .optional()
    .refine(
      (files) => !files || files.length === 0 || files[0]?.size <= MAX_FILE_SIZE,
      'File size must be 10MB or less',
    ),
  royaltyPercentage: z
    .number()
    .min(0, 'Royalty must be 0% or more')
    .max(10, 'Royalty must be 10% or less'),
  contractType: z.enum(['ERC721', 'ERC1155']),
});

type CreateCollectionFormData = z.infer<typeof createCollectionSchema>;

interface BatchNftItem {
  id: string;
  file: File;
  preview: string;
  name: string;
  description: string;
}

export function CreateCollectionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { create, status, error, result, steps, reset } = useCreateCollection();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [batchItems, setBatchItems] = useState<BatchNftItem[]>([]);
  const [dragOverBatch, setDragOverBatch] = useState(false);

  const defaultType = searchParams.get('type') === 'ERC1155' ? 'ERC1155' : 'ERC721';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<CreateCollectionFormData>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: {
      royaltyPercentage: 0,
      contractType: defaultType as 'ERC721' | 'ERC1155',
    },
  });

  const watchContractType = watch('contractType');
  const watchImage = watch('coverImage');

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

  // Batch file handler
  const addBatchFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(f => f.type.startsWith('image/') && f.size <= MAX_FILE_SIZE);

    const newItems: BatchNftItem[] = imageFiles.map((file, idx) => {
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      return {
        id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        preview: URL.createObjectURL(file),
        name: baseName.charAt(0).toUpperCase() + baseName.slice(1),
        description: '',
      };
    });

    setBatchItems(prev => {
      const combined = [...prev, ...newItems];
      return combined.slice(0, MAX_BATCH_FILES);
    });
  }, []);

  const removeBatchItem = (id: string) => {
    setBatchItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const updateBatchItem = (id: string, field: 'name' | 'description', value: string) => {
    setBatchItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Drag and drop for batch
  const handleBatchDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverBatch(false);
    if (e.dataTransfer.files.length > 0) {
      addBatchFiles(e.dataTransfer.files);
    }
  }, [addBatchFiles]);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      batchItems.forEach(item => URL.revokeObjectURL(item.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: CreateCollectionFormData) => {
    try {
      const createResult = await create({
        name: data.name,
        symbol: data.symbol,
        royaltyPercentage: data.royaltyPercentage,
        description: data.description,
        coverImage: data.coverImage?.[0],
        contractType: data.contractType,
        batchItems: batchItems.length > 0 ? batchItems.map(item => ({
          file: item.file,
          name: item.name,
          description: item.description,
        })) : undefined,
      });

      // Redirect to collection page or mint page
      setTimeout(() => {
        if (createResult.collectionId) {
          router.push('/mint');
        }
      }, 2000);
    } catch (err) {
      console.error('Create collection failed:', err);
    }
  };

  const isModalOpen = status !== 'idle';

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Contract Type Toggle */}
        <div>
          <label className="block text-sm font-medium mb-3 text-foreground">Contract Type</label>
          <div className="flex rounded-xl overflow-hidden border border-border">
            <button
              type="button"
              onClick={() => setValue('contractType', 'ERC721')}
              className={`flex-1 py-3 px-4 text-sm font-semibold transition-all duration-200 ${
                watchContractType === 'ERC721'
                  ? 'bg-primary text-primary-foreground shadow-inner'
                  : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              ERC-721 (Unique)
            </button>
            <button
              type="button"
              onClick={() => setValue('contractType', 'ERC1155')}
              className={`flex-1 py-3 px-4 text-sm font-semibold transition-all duration-200 ${
                watchContractType === 'ERC1155'
                  ? 'bg-primary text-primary-foreground shadow-inner'
                  : 'bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              ERC-1155 (Edition)
            </button>
          </div>
        </div>

        {/* Cover Image Upload */}
        <div>
          <label className="block text-sm font-medium mb-3 text-foreground">
            Cover Image
          </label>
          <div className="relative">
            <input
              {...register('coverImage')}
              type="file"
              accept="image/*"
              className="hidden"
              id="cover-image-upload"
            />
            <label
              htmlFor="cover-image-upload"
              className="flex flex-col items-center justify-center w-full h-52 border-2 border-dashed border-border/60 rounded-xl cursor-pointer bg-card/50 hover:bg-accent/50 hover:border-primary/30 transition-all duration-300"
            >
              {imagePreview ? (
                <div className="relative w-full h-full">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setValue('coverImage', undefined);
                      setImagePreview(null);
                    }}
                    className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-sm rounded-full hover:bg-black/80 transition-colors"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 p-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      Click or drag to upload
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF • Max 10MB</p>
                  </div>
                </div>
              )}
            </label>
          </div>
          {errors.coverImage && (
            <p className="mt-2 text-sm text-destructive">
              {errors.coverImage.message as string}
            </p>
          )}
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2 text-foreground">
            Name *
          </label>
          <input
            {...register('name')}
            type="text"
            id="name"
            placeholder="e.g. Sierra Art Collection"
            className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        {/* Symbol */}
        <div>
          <label htmlFor="symbol" className="block text-sm font-medium mb-2 text-foreground">
            Symbol *
          </label>
          <input
            {...register('symbol')}
            type="text"
            id="symbol"
            placeholder="e.g. SIERRA"
            className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all uppercase placeholder:text-muted-foreground/50 placeholder:normal-case"
          />
          {errors.symbol && (
            <p className="mt-1 text-sm text-destructive">{errors.symbol.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2 text-foreground">
            Description
          </label>
          <textarea
            {...register('description')}
            id="description"
            rows={4}
            placeholder="Tell the world about your collection..."
            className="w-full px-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none placeholder:text-muted-foreground/50"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-destructive">{errors.description.message}</p>
          )}
        </div>

        {/* Royalty Percentage */}
        <div>
          <label htmlFor="royaltyPercentage" className="block text-sm font-medium mb-3 text-foreground">
            Royalty
          </label>
          <div className="flex items-center gap-4">
            <input
              {...register('royaltyPercentage', { valueAsNumber: true })}
              type="range"
              id="royaltyPercentage"
              min="0"
              max="10"
              step="0.1"
              className="flex-1"
            />
            <div className="w-20 text-center px-3 py-2.5 bg-card border border-border rounded-xl font-mono text-sm font-semibold text-primary">
              {watch('royaltyPercentage')?.toFixed(1)}%
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Creator royalty on secondary sales (max 10%)
          </p>
          {errors.royaltyPercentage && (
            <p className="mt-1 text-sm text-destructive">
              {errors.royaltyPercentage.message}
            </p>
          )}
        </div>

        {/* ===== Batch NFT Upload Section ===== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Batch NFT Upload
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Add multiple artworks to mint as NFTs in this collection (optional, up to {MAX_BATCH_FILES})
              </p>
            </div>
            {batchItems.length > 0 && (
              <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                {batchItems.length} item{batchItems.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Batch Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOverBatch(true); }}
            onDragLeave={() => setDragOverBatch(false)}
            onDrop={handleBatchDrop}
            className={`relative border-2 border-dashed rounded-xl transition-all duration-300 ${
              dragOverBatch
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-border/60 bg-card/30 hover:border-primary/30'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              id="batch-upload"
              onChange={(e) => {
                if (e.target.files) addBatchFiles(e.target.files);
                e.target.value = '';
              }}
            />

            {batchItems.length === 0 ? (
              <label htmlFor="batch-upload" className="flex flex-col items-center gap-3 p-8 cursor-pointer">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <ImagePlus className="h-6 w-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    Drag & drop multiple images or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Each image becomes an NFT in this collection
                  </p>
                </div>
              </label>
            ) : (
              <div className="p-4 space-y-3">
                {/* Batch Items List */}
                {batchItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 bg-card/80 rounded-xl border border-border/50 group hover:border-primary/20 transition-all"
                  >
                    {/* Number */}
                    <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-xs font-bold text-primary mt-1">
                      {index + 1}
                    </div>

                    {/* Thumbnail */}
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={item.preview}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Name & Description */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateBatchItem(item.id, 'name', e.target.value)}
                        placeholder="NFT Name"
                        className="w-full text-sm px-3 py-1.5 bg-transparent border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 transition-colors"
                      />
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateBatchItem(item.id, 'description', e.target.value)}
                        placeholder="Description (optional)"
                        className="w-full text-xs px-3 py-1.5 bg-transparent border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 transition-colors text-muted-foreground"
                      />
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeBatchItem(item.id)}
                      className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {/* Add More Button */}
                {batchItems.length < MAX_BATCH_FILES && (
                  <label
                    htmlFor="batch-upload"
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-border/50 cursor-pointer text-sm text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Add more images
                  </label>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={status !== 'idle' && status !== 'error'}
          className="w-full sierra-btn-primary !rounded-xl h-12 text-base font-semibold"
        >
          {status === 'idle' || status === 'error'
            ? batchItems.length > 0
              ? `Create Collection with ${batchItems.length} NFT${batchItems.length !== 1 ? 's' : ''}`
              : 'Create Collection'
            : 'Creating...'}
        </Button>
      </form>

      {/* Transaction Modal */}
      <TransactionModal
        open={isModalOpen}
        title="Create Collection"
        steps={steps}
        error={error}
        success={status === 'success'}
        successMessage={
          batchItems.length > 0
            ? `Collection created with ${batchItems.length} NFT${batchItems.length !== 1 ? 's' : ''}!`
            : 'Collection has been created successfully!'
        }
        onClose={() => {
          reset();
          router.push('/mint');
        }}
        onRetry={() => {
          reset();
        }}
      />
    </>
  );
}
