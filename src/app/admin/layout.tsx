import Link from "next/link";
import { Music2, LayoutDashboard, Upload, LogOut, Home, UserCircle } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen pt-16">
      {/* Sidebar */}
      <aside className="fixed top-16 bottom-0 left-0 w-64 border-r border-white/5 bg-surface-800 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600/20">
              <Music2 className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Artist Panel</p>
              <p className="text-xs text-zinc-500">OpenTunes</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-1">
          {[
            { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
            { href: "/admin/upload", label: "Upload Track", icon: Upload },
            { href: "/admin/profile", label: "Creator Profile", icon: UserCircle },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 flex flex-col gap-1">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
          >
            <Home className="h-4 w-4" />
            View Site
          </Link>
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-64 min-h-full bg-surface-900">
        {children}
      </div>
    </div>
  );
}
