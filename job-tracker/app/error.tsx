'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { JobNekoError } from '@/components/ui/jobneko-logo';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <JobNekoError
          size={150}
          message="Oops! Something went wrong"
        />
        <p className="text-gray-500 mt-4 mb-6 max-w-md mx-auto">
          {error.message || 'An unexpected error occurred while processing your request.'}
        </p>
        <Button
          onClick={() => reset()}
          className="bg-black hover:bg-gray-800"
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}