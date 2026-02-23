'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProgressStepper, Step } from './ProgressStepper';
import { AlertCircle } from 'lucide-react';
import { formatWeb3Error } from '@/lib/utils';

interface TransactionModalProps {
  open: boolean;
  title: string;
  steps: Step[];
  error?: string | null;
  success?: boolean;
  successMessage?: string;
  onClose?: () => void;
  onRetry?: () => void;
  onViewNFT?: () => void;
}

export function TransactionModal({
  open,
  title,
  steps,
  error,
  success,
  successMessage,
  onClose,
  onRetry,
  onViewNFT,
}: TransactionModalProps) {
  const isInProgress = steps.some((s) => s.status === 'current');

  return (
    <Dialog open={open} onOpenChange={isInProgress ? undefined : onClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          if (isInProgress) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isInProgress) {
            e.preventDefault();
          }
        }}
      >
        <div className="space-y-6">
          {/* Title */}
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>

          {/* Progress Steps */}
          <ProgressStepper steps={steps} />

          {/* Error State */}
          {error && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-500">Error Occurred</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatWeb3Error(error)}
                  </p>
                </div>
              </div>

              {onRetry && (
                <div className="mt-4">
                  <Button onClick={onRetry} variant="outline" className="w-full">
                    Retry
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Success State */}
          {success && (
            <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-green-500" />
                <p className="font-semibold text-green-500">
                  {successMessage || 'Completed successfully'}
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                {onViewNFT && (
                  <Button onClick={onViewNFT} className="flex-1">
                    View NFT
                  </Button>
                )}
                {onClose && (
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="flex-1"
                  >
                    OK
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* In Progress - no close button */}
          {isInProgress && (
            <p className="text-center text-sm text-muted-foreground">
              Transaction is in progress. Please wait...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
