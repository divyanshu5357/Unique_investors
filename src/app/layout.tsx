import type {Metadata} from 'next';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Unique Investor | Affordable Plots & Property in Greater Noida',
  description: 'Find affordable plots and unique property investment opportunities in Greater Noida with Unique Investor, the fastest-growing real estate company.',
  keywords: 'unique investor, affordable plots, property in greater noida, real estate, investment property, greater noida plots'
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn("font-body antialiased", "min-h-screen bg-background font-sans flex flex-col")}>
          <div className="flex-1">
            {children}
          </div>
          <Toaster />
      </body>
    </html>
  );
}
