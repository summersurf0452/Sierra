'use client';

import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';

export interface Step {
  label: string;
  description?: string;
  status: 'pending' | 'current' | 'completed' | 'error';
}

interface ProgressStepperProps {
  steps: Step[];
}

export function ProgressStepper({ steps }: ProgressStepperProps) {
  return (
    <div className="space-y-6">
      {steps.map((step, index) => (
        <div key={index} className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            {step.status === 'pending' && (
              <Circle className="h-8 w-8 text-gray-400" />
            )}
            {step.status === 'current' && (
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            )}
            {step.status === 'completed' && (
              <CheckCircle2 className="h-8 w-8 text-green-500 animate-in fade-in duration-300" />
            )}
            {step.status === 'error' && (
              <XCircle className="h-8 w-8 text-red-500" />
            )}
          </div>

          {/* Label and Description */}
          <div className="flex-1 pt-1">
            <div
              className={`text-lg font-medium ${
                step.status === 'completed'
                  ? 'text-green-500'
                  : step.status === 'error'
                    ? 'text-red-500'
                    : step.status === 'current'
                      ? 'text-blue-500'
                      : 'text-gray-400'
              }`}
            >
              {step.label}
            </div>
            {step.description && (
              <div className="mt-1 text-sm text-gray-400">
                {step.description}
              </div>
            )}
          </div>

          {/* Connector line */}
          {index < steps.length - 1 && (
            <div className="absolute left-[1rem] mt-12 h-6 w-0.5 bg-gray-700" />
          )}
        </div>
      ))}
    </div>
  );
}
