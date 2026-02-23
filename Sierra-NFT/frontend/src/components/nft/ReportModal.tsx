/**
 * ReportModal - Report submission modal for NFTs and Collections
 *
 * Categories: SCAM (Scam/Fraud), COPYRIGHT (Copyright Infringement), INAPPROPRIATE (Inappropriate Content)
 * Submits POST /reports to backend API
 */

'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { ReportTargetType, ReportCategory } from '@/types/nft';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
}

const categories: { value: ReportCategory; label: string; description: string }[] = [
  { value: 'SCAM', label: 'Scam / Fraud', description: 'Fraudulent content or phishing attempts' },
  { value: 'COPYRIGHT', label: 'Copyright Infringement', description: 'Unauthorized reproduction or stolen content' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate Content', description: 'Violent, hateful, or offensive content' },
];

export function ReportModal({ isOpen, onClose, targetType, targetId }: ReportModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedCategory) {
      toast.error('Please select a report reason');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/reports', {
        targetType,
        targetId,
        category: selectedCategory,
        description: description.trim() || undefined,
      });
      toast.success('Report submitted successfully');
      setSelectedCategory(null);
      setDescription('');
      onClose();
    } catch (error: any) {
      if (error?.status === 401) {
        toast.error('Please sign in to submit a report');
      } else {
        toast.error(error?.message || 'Failed to submit report');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md mx-4 rounded-lg border border-border bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            {targetType === 'NFT' ? 'Report NFT' : 'Report Collection'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Category Selection */}
        <div className="space-y-3 mb-6">
          <p className="text-sm font-medium text-foreground">Report Reason</p>
          {categories.map((cat) => (
            <label
              key={cat.value}
              className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                selectedCategory === cat.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/30'
              }`}
            >
              <input
                type="radio"
                name="reportCategory"
                value={cat.value}
                checked={selectedCategory === cat.value}
                onChange={() => setSelectedCategory(cat.value)}
                className="mt-0.5 accent-primary"
              />
              <div>
                <p className="text-sm font-medium text-foreground">{cat.label}</p>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Additional Details (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please provide more details..."
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedCategory || isSubmitting}
            className="flex-1 rounded-lg bg-destructive py-2.5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
