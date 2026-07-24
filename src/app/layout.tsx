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
  title: "OpenTunes - Modern Music Platform",
  description: "Upload and share your music with the world",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} bg-canvas font-sans text-ink antialiased`}>
        <SessionProvider>
          <PlayerProvider>
            <Navbar />
            <main className="min-h-screen pb-32 pt-20 md:pl-64 md:pt-0">{children}</main>
          </PlayerProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
