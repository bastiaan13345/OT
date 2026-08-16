import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { PlayerProvider } from "@/components/providers/PlayerProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Infini | Independent music",
  description: "Listen to and publish independent music.",
};

const themeScript = `
  try {
    const savedTheme = localStorage.getItem("infini-theme");
    const useDark = savedTheme
      ? savedTheme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", useDark);
    document.documentElement.style.colorScheme = useDark ? "dark" : "light";
  } catch {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} bg-canvas font-sans text-ink antialiased`}>
        <SessionProvider>
          <PlayerProvider>
            <Navbar />
            <main className="min-h-screen pb-32 pt-20 md:pl-64 md:pt-0">{children}</main>
            <footer className="border-t border-line bg-soft px-5 py-6 text-center text-xs text-muted md:pl-64">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                <span>Infini beta</span>
                <a className="underline underline-offset-4 hover:text-ink" href="/privacy">Privacy</a>
                <a className="underline underline-offset-4 hover:text-ink" href="/terms">Terms</a>
                <a className="underline underline-offset-4 hover:text-ink" href="/contact">Contact</a>
              </div>
            </footer>
          </PlayerProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
