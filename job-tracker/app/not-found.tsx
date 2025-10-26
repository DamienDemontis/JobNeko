import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { JobNekoError } from '@/components/ui/jobneko-logo';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <JobNekoError
          size={150}
          message="Page not found"
        />
        <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-2">404 - Page Not Found</h1>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild className="bg-black hover:bg-gray-800">
          <Link href="/dashboard">
            Return to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}