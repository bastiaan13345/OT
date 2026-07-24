import Link from "next/link";
import {
  LayoutDashboard,
  Upload,
  LogOut,
  Home,
  UserCircle,
  BarChart3,
  Disc3,
  Settings2,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigation = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/upload", label: "Upload", icon: Upload },
    { href: "/admin/releases", label: "Releases", icon: Disc3 },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/profile", label: "Profile", icon: UserCircle },
    { href: "/admin/settings", label: "Settings", icon: Settings2 },
  ];

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-16 z-30 flex items-center gap-1 overflow-x-auto border-b border-line bg-white/95 px-3 py-2 backdrop-blur-xl md:top-0">
        {navigation.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-w-fit items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 sm:text-sm"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
        <span aria-hidden="true" className="mx-1 h-6 w-px flex-none bg-line" />
        <Link
          href="/"
          className="flex min-w-fit items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 sm:text-sm"
        >
          <Home className="h-4 w-4" />
          View Site
        </Link>
        <Link
          href="/api/auth/signout"
          className="flex min-w-fit items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 sm:text-sm"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Link>
      </nav>

      <div className="min-h-full bg-white">{children}</div>
    </div>
  );
}
