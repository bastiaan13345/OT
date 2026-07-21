import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { SessionProvider } from "@/components/providers/SessionProvider";

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
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-surface-900 text-white`}>
        <SessionProvider>
          <Navbar />
          <main className="min-h-screen pt-16 pb-24">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
