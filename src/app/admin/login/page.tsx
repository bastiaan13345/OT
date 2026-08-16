"use client";

import { useState, useEffect } from "react";
import { getSession, signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Lock, Mail, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState<"listener" | "creator" | null>(null);

  useEffect(() => {
    const accountType = new URLSearchParams(window.location.search).get("registered");
    setRegistered(accountType === "listener" || accountType === "creator" ? accountType : null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (!result?.ok || result.error) {
      setError(result?.error?.includes("PENDING_APPROVAL")
        ? "Your account is waiting for admin approval. We'll let you know when you can sign in."
        : "Invalid email or password.");
    } else {
      const session = await getSession();
      window.location.assign(session?.user.role === "LISTENER" ? "/library" : "/admin");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4">
            <Image src="/Infini.svg" alt="Infini" width={72} height={72} priority />
          </div>
          <h1 className="text-2xl font-bold text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Sign in to listen, follow artists, and manage music</p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-line bg-panel p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {registered && !error && (
              <div
                role="status"
                className={registered === "listener"
                  ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
                  : "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"}
              >
                {registered === "listener"
                  ? "Account created. You can sign in now."
                  : "Creator request received. An admin must approve it before you can sign in."}
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-medium text-ink">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11"
                  required
                />
              </div>
            </div>

            {error && (
              <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="mt-2 w-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-center text-sm text-muted">
              New to Infini?{" "}
              <Link href="/signup" className="rounded-sm font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
