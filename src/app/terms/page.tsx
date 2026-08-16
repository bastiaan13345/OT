import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms - Infini" };
export const dynamic = "force-dynamic";

export default function TermsPage() {
  const support = process.env.SUPPORT_EMAIL || "the Infini beta administrator";
  return (
    <article className="mx-auto max-w-3xl px-5 py-10 md:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Infini beta</p>
      <h1 className="mt-3 text-3xl font-bold text-ink">Beta terms</h1>
      <p className="mt-3 text-sm text-muted">Last updated August 10, 2026.</p>
      <div className="mt-8 space-y-7 text-sm leading-7 text-ink">
        <section><h2 className="text-lg font-semibold">Use of the beta</h2><p className="mt-2">Infini is an invite-only beta. Keep your credentials private, provide accurate account details, and do not attempt to access another person&apos;s account or private media.</p></section>
        <section><h2 className="text-lg font-semibold">Creator responsibility</h2><p className="mt-2">You may upload only audio, artwork, and metadata that you own or are authorized to publish. You are responsible for licenses, permissions, prices, and claims associated with your uploads.</p></section>
        <section><h2 className="text-lg font-semibold">Prohibited content and conduct</h2><p className="mt-2">Do not upload unlawful, abusive, deceptive, infringing, or malicious content; probe the service; bypass access controls; or use the beta to distribute malware or spam. The operator may hide or remove content and suspend accounts while investigating a report.</p></section>
        <section><h2 className="text-lg font-semibold">Beta availability</h2><p className="mt-2">The service is provided for evaluation and may change or become unavailable. Backups are maintained, but you should retain your own originals.</p></section>
        <section><h2 className="text-lg font-semibold">Reports</h2><p className="mt-2">Send abuse, copyright, or content-removal reports to {support} with the relevant account or track details.</p></section>
      </div>
    </article>
  );
}
