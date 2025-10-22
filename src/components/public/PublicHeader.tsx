import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export default function PublicHeader() {
  return (
    <header className="px-4 lg:px-6 h-16 flex items-center bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <Link href="/" className="flex items-center justify-center">
        <Logo />
      </Link>
      <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
        <Link
          href="/"
          className="text-sm font-medium hover:underline underline-offset-4"
        >
          Home
        </Link>
        <Link
          href="/explore"
          className="text-sm font-medium hover:underline underline-offset-4"
        >
          Explore Properties
        </Link>
        <Link
          href="/#contact"
          className="text-sm font-medium hover:underline underline-offset-4"
        >
          Contact
        </Link>
        <Button asChild>
            <Link href="/login">Login</Link>
        </Button>
      </nav>
    </header>
  );
}
