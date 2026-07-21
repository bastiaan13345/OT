"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Music2, Search, Upload, Library, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-surface-900/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 shadow-lg shadow-brand-600/30 group-hover:bg-brand-500 transition-colors">
            <Music2 className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-white tracking-tight">
            OpenTunes
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {[
            { href: "/", label: "Home" },
            { href: "/browse", label: "Browse" },
            { href: "/library", label: "Library" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === href
                  ? "text-white bg-white/10"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/browse"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Search"
          >
            <Search className="h-4.5 w-4.5" />
          </Link>
          {session ? (
            <>
              <Link
                href="/library"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Library"
              >
                <Library className="h-4.5 w-4.5" />
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="hidden sm:flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <UserCircle className="h-4 w-4" />
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/admin/login"
              className="hidden sm:flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Sign in
            </Link>
          )}
          <Link
            href="/admin"
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-brand-600/20 hover:bg-brand-500 transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
