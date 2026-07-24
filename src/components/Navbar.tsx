"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Clock3, Grid3X3, Home, LayoutDashboard, Library, ListMusic, LogOut, Radio, Search, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const primary = [
  { href: "/", label: "Home", icon: Home },
  { href: "/browse", label: "New & Browse", icon: Grid3X3 },
  { href: "/feed", label: "Radio & Feed", icon: Radio },
];
const library = [
  { href: "/library", label: "Your Library", icon: Library },
  { href: "/history", label: "Recently Played", icon: Clock3 },
  { href: "/library", label: "All Playlists", icon: ListMusic },
];

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Home; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2",
        active ? "bg-ink text-white" : "text-muted hover:bg-white hover:text-ink",
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const canCreate = session?.user.role === "CREATOR" || session?.user.role === "ADMIN";
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-soft/95 px-4 py-5 backdrop-blur-2xl md:flex">
        <Link
          href="/"
          aria-label="Infini home"
          className="mb-7 w-fit rounded-lg px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
        >
          <Image src="/Infini.svg" alt="" width={52} height={52} priority />
        </Link>
        <Link
          href="/browse"
          className="mb-4 flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-muted transition hover:border-ink hover:bg-panel hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
        >
          <Search className="h-5 w-5" /> Search
        </Link>
        <nav className="space-y-1">
          {primary.map((item) => <NavItem key={item.href} {...item} active={isActive(item.href)} />)}
        </nav>
        <p className="mb-2 mt-7 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Library</p>
        <nav className="space-y-1">
          {library.map((item) => <NavItem key={item.label} {...item} active={isActive(item.href)} />)}
        </nav>
        {canCreate && (
          <>
            <p className="mb-2 mt-7 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">For Artists</p>
            <NavItem href="/admin" label="Creator Studio" icon={LayoutDashboard} active={isActive("/admin")} />
          </>
        )}
        <div className="mt-auto border-t border-line pt-4">
          {session ? (
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel text-muted">
                <UserCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{session.user.name || "Listener"}</p>
                <p className="truncate text-xs text-muted">{(session.user.role || "listener").toLowerCase()}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                aria-label="Sign out"
                className="rounded-full p-2 text-faint transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/admin/login"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-white hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              <UserCircle className="h-5 w-5" /> Sign in
            </Link>
          )}
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur-2xl md:hidden">
        <Link
          href="/"
          aria-label="Infini home"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
        >
          <Image src="/Infini.svg" alt="" width={36} height={36} priority />
        </Link>
        <div className="flex items-center gap-1">
          <Link href="/browse" aria-label="Search" className="rounded-full p-2.5 text-muted transition hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
            <Search className="h-5 w-5" />
          </Link>
          <Link href="/library" aria-label="Library" className="rounded-full p-2.5 text-muted transition hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
            <Library className="h-5 w-5" />
          </Link>
          <Link href="/" aria-label="Home" className="rounded-full bg-ink p-2.5 text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2">
            <Home className="h-5 w-5" />
          </Link>
        </div>
      </header>
    </>
  );
}
