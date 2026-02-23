import Link from 'next/link';
import Image from 'next/image';

/**
 * Footer: Site footer component with Sierra branding
 */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Sierra"
              width={500}
              height={500}
              className="h-24 w-auto opacity-80"
            />
          </div>

          {/* Links */}
          <div className="flex items-center gap-8 text-sm text-muted-foreground">
            <Link
              href="https://worldland.foundation"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-primary"
            >
              WorldLand
            </Link>
            <Link
              href="https://scan.worldland.foundation"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-primary"
            >
              Explorer
            </Link>
            <Link
              href="/explore"
              className="transition-colors hover:text-primary"
            >
              Explore
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} Sierra. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
