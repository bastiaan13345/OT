"use client";

import Link from "next/link";
import { Music2, User, Mail, Lock } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { registerCreator } from "@/lib/actions";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 shadow-xl shadow-brand-600/30">
            <Music2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Join OpenTunes</h1>
          <p className="mt-1 text-sm text-zinc-500">Create a listener and creator account</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface-800 p-8">
          <form action={registerCreator} className="flex flex-col gap-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Display name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input name="name" placeholder="Artist or listener name" className="pl-11" required />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input name="email" type="email" placeholder="you@example.com" className="pl-11" required />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input name="password" type="password" minLength={8} placeholder="At least 8 characters" className="pl-11" required />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full">
              Create account
            </Button>
            <p className="text-center text-sm text-zinc-500">
              Already have an account?{" "}
              <Link href="/admin/login" className="font-medium text-brand-400 hover:text-brand-300">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
