import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { UserCircle } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateCreatorProfile } from "@/lib/actions";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default async function CreatorProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <div className="rounded-xl border border-white/5 bg-surface-800 p-6">
          <h1 className="text-2xl font-bold text-white">Creator Profile</h1>
          <p className="mt-2 text-zinc-500">
            Admin accounts can manage platform content. Create a creator account to publish a public artist profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-8">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600/20">
          <UserCircle className="h-6 w-6 text-brand-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">Creator Profile</h1>
        <p className="mt-1 text-zinc-500">Set the public details listeners see on your artist page.</p>
      </div>

      <form action={updateCreatorProfile} className="flex flex-col gap-6 rounded-xl border border-white/5 bg-surface-800 p-6">
        <div>
          <label className="mb-2 block text-sm font-semibold text-white">Display name</label>
          <Input name="name" defaultValue={user.name} required />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-white">Bio</label>
          <textarea
            name="bio"
            defaultValue={user.bio || ""}
            rows={5}
            className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-white">Location</label>
            <Input name="location" defaultValue={user.location || ""} placeholder="City, country" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-white">Website</label>
            <Input name="website" defaultValue={user.website || ""} placeholder="https://example.com" />
          </div>
        </div>
        <Button type="submit" size="lg">Save profile</Button>
      </form>
    </div>
  );
}
