import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact - Infini" };
export const dynamic = "force-dynamic";

export default function ContactPage() {
  const support = process.env.SUPPORT_EMAIL || "the Infini beta administrator";
  return (
    <article className="mx-auto max-w-3xl px-5 py-10 md:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Infini beta</p>
      <h1 className="mt-3 text-3xl font-bold text-ink">Contact the beta team</h1>
      <p className="mt-5 text-sm leading-7 text-ink">For access requests, account support, content removal, copyright reports, or security issues, contact {support}. Include enough detail for us to identify the relevant account or track, but never send a password or session token.</p>
    </article>
  );
}
