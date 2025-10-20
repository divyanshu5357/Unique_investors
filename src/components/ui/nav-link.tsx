
"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import React from 'react';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  icon?: React.ElementType;
  className?: string;
}

export function NavLink({ href, children, icon: Icon, className }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 transition-colors hover:text-primary',
        isActive ? 'text-primary font-semibold' : 'text-muted-foreground',
        className
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </Link>
  );
}
