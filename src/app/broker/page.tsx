"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function BrokerPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to welcome page as the default broker landing page
    router.replace('/broker/welcome');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to Welcome Page...</p>
      </div>
    </div>
  );
}
