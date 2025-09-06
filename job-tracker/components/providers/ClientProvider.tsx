'use client';

export default function ClientProvider({ children }: { children: React.ReactNode }) {
  // Simply pass through children - no need for client-side detection
  // The suppressHydrationWarning on the parent handles browser extension issues
  return <>{children}</>;
}