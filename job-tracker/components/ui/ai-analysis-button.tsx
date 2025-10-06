'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Brain, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';

interface AIAnalysisButtonProps {
  onClick: () => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  showAnimation?: boolean;
  onCancel?: () => void;
  cancelable?: boolean;
}

export function AIAnalysisButton({
  onClick,
  loading = false,
  disabled = false,
  label = 'Analyze',
  variant = 'outline',
  size = 'default',
  className = '',
  showAnimation = true,
  onCancel,
  cancelable = true,
}: AIAnalysisButtonProps) {
  const [isLoading, setIsLoading] = useState(loading);
  const [catAnimation, setCatAnimation] = useState<any>(null);

  useEffect(() => {
    setIsLoading(loading);
  }, [loading]);

  useEffect(() => {
    // Lazy load the cat animation only when needed
    if (showAnimation && isLoading) {
      import('@/public/animations/cat-loading.json')
        .then((animationData) => {
          setCatAnimation(animationData.default);
        })
        .catch(() => {
          // Fallback if animation fails to load
          setCatAnimation(null);
        });
    }
  }, [showAnimation, isLoading]);

  const handleClick = async () => {
    if (isLoading && cancelable && onCancel) {
      onCancel();
      setIsLoading(false);
      return;
    }

    if (!isLoading && !disabled) {
      setIsLoading(true);
      try {
        await onClick();
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="relative inline-block">
      <Button
        onClick={handleClick}
        disabled={disabled && !isLoading}
        variant={variant}
        size={size}
        className={`
          border-gray-300 bg-white text-black hover:bg-gray-50
          ${isLoading && cancelable ? 'hover:bg-red-50' : ''}
          ${className}
        `}
      >
        {isLoading ? (
          <>
            {cancelable ? (
              <>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            )}
          </>
        ) : (
          <>
            <Brain className="mr-2 h-4 w-4" />
            {label}
          </>
        )}
      </Button>

      {/* Cat Loading Animation Overlay */}
      <AnimatePresence>
        {showAnimation && isLoading && catAnimation && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-20 left-1/2 transform -translate-x-1/2 pointer-events-none z-50"
          >
            <div className="bg-white rounded-lg shadow-lg p-2 border border-gray-200">
              <Lottie
                animationData={catAnimation}
                loop
                autoplay
                style={{ width: 60, height: 60 }}
              />
              <div className="text-xs text-gray-600 text-center mt-1">
                Thinking...
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}