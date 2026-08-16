import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy - Infini" };
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  const support = process.env.SUPPORT_EMAIL || "the Infini beta administrator";
  return (
    <article className="mx-auto max-w-3xl px-5 py-10 md:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Infini beta</p>
      <h1 className="mt-3 text-3xl font-bold text-ink">Privacy notice</h1>
      <p className="mt-3 text-sm text-muted">Last updated August 10, 2026.</p>
      <div className="mt-8 space-y-7 text-sm leading-7 text-ink">
        <section><h2 className="text-lg font-semibold">What we store</h2><p className="mt-2">Infini stores the account name, email address, and a password hash. Creator accounts may add profile details, audio, artwork, release metadata, playlists, likes, follows, comments, and playback history.</p></section>
        <section><h2 className="text-lg font-semibold">Why we store it</h2><p className="mt-2">We use this information to authenticate accounts, deliver playback and downloads according to creator settings, maintain social features, process creator uploads, and operate the beta safely.</p></section>
        <section><h2 className="text-lg font-semibold">Storage and retention</h2><p className="mt-2">The beta runs on a single protected host with encrypted backups. Content remains until its owner deletes it or the operator removes it under the terms. Operational logs and backups are retained only for the period needed to run and recover the beta.</p></section>
        <section><h2 className="text-lg font-semibold">Your choices</h2><p className="mt-2">Contact {support} for access, correction, account deletion, or content-removal requests. Password resets and account deletion are support-assisted during the beta.</p></section>
        <section><h2 className="text-lg font-semibold">Contact</h2><p className="mt-2">Questions about this notice or a privacy request can be sent to {support}.</p></section>
      </div>
    </article>
  );
}
