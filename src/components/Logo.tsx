import { cn } from '@/lib/utils';
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image src="/logo.svg" alt="Unique Investor Logo" width={32} height={32} />
      <span className={cn("text-xl font-bold font-headline", className && className.includes('text-') ? '' : 'text-primary')}>
        Unique Investor
      </span>
    </div>
  );
}
