"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Clock3, Headphones, Lock, Mail, Mic2, User } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { registerUser } from "@/lib/actions";

export default function SignupPage() {
  const [accountType, setAccountType] = useState<"LISTENER" | "CREATOR">("LISTENER");

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4">
            <Image src="/Infini.svg" alt="Infini" width={72} height={72} priority />
          </div>
          <h1 className="text-2xl font-bold text-ink">Join Infini</h1>
          <p className="mt-1 text-sm text-muted">Choose how you want to use the platform</p>
        </div>

        <div className="rounded-2xl border border-line bg-panel p-8">
          <form action={registerUser} className="flex flex-col gap-5">
            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-ink">Account type</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="LISTENER"
                    checked={accountType === "LISTENER"}
                    onChange={() => setAccountType("LISTENER")}
                    className="peer sr-only"
                  />
                  <span className="flex h-full items-center gap-3 rounded-lg border border-line bg-canvas p-3 text-muted transition-colors peer-checked:border-ink peer-checked:bg-soft peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink peer-focus-visible:ring-offset-2">
                    <Headphones className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    <span>
                      <span className="block text-sm font-semibold">Listener</span>
                      <span className="block text-xs text-muted">Like, comment, playlist</span>
                    </span>
                  </span>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="CREATOR"
                    checked={accountType === "CREATOR"}
                    onChange={() => setAccountType("CREATOR")}
                    className="peer sr-only"
                  />
                  <span className="flex h-full items-center gap-3 rounded-lg border border-line bg-canvas p-3 text-muted transition-colors peer-checked:border-ink peer-checked:bg-soft peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink peer-focus-visible:ring-offset-2">
                    <Mic2 className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    <span>
                      <span className="block text-sm font-semibold">Creator</span>
                      <span className="block text-xs text-muted">Publish and analyze</span>
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>

            <div
              className={accountType === "LISTENER"
                ? "flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950"
                : "flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"}
            >
              {accountType === "LISTENER" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-700" aria-hidden="true" />
              ) : (
                <Clock3 className="mt-0.5 h-4 w-4 flex-none text-amber-700" aria-hidden="true" />
              )}
              <p>
                {accountType === "LISTENER"
                  ? "Listener accounts can sign in immediately."
                  : "Creator accounts require admin approval before sign-in."}
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-ink">Display name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <Input name="name" placeholder="Display name" className="pl-11" required />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <Input name="email" type="email" placeholder="you@example.com" className="pl-11" required />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <Input name="password" type="password" minLength={8} maxLength={72} placeholder="At least 8 characters" className="pl-11" required />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full">
              Create account
            </Button>
            <p className="text-center text-sm text-muted">
              Already have an account?{" "}
              <Link href="/admin/login" className="rounded-sm font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
