import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Check, Clock3, Inbox, UserRound } from "lucide-react";
import { authOptions, APPROVAL_ADMIN_EMAIL } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveUser } from "@/lib/actions";
import { Button } from "@/components/ui/Button";

export default async function AccountRequestsPage() {
  const session = await getServerSession(authOptions);
  const isApprovalAdmin =
    session?.user.role === "ADMIN" &&
    session.user.email?.trim().toLowerCase() === APPROVAL_ADMIN_EMAIL;

  if (!session) redirect("/admin/login");
  if (!isApprovalAdmin) redirect("/admin");

  const requests = await prisma.user.findMany({
    where: { approved: false, role: "CREATOR" },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              <Inbox className="h-4 w-4" aria-hidden="true" /> Admin queue
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Account requests</h1>
            <p className="mt-2 max-w-xl text-muted">Review creator accounts before they can publish music on Infini.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-line bg-canvas px-4 py-2 text-sm text-muted">
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            <span>{requests.length} waiting</span>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-line bg-canvas shadow-sm">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-24 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-soft">
                <Check className="h-7 w-7 text-ink" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold text-ink">All caught up</h2>
              <p className="mt-1 text-sm text-muted">There are no account requests waiting for review.</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {requests.map((request) => (
                <div key={request.id} className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-soft text-muted">
                      <UserRound className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{request.name}</p>
                      <p className="truncate text-sm text-muted">{request.email}</p>
                      <p className="mt-1 text-xs text-faint">
                        Requested {request.createdAt.toLocaleDateString(undefined, { dateStyle: "medium" })}
                      </p>
                    </div>
                  </div>
                  <form action={approveUser.bind(null, request.id)}>
                    <Button type="submit" size="sm" className="w-full sm:w-auto">
                      <Check className="h-4 w-4" aria-hidden="true" /> Approve account
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
