import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { customFetch, useListUnits } from "@workspace/api-client-react";
import {
  ArrowRight,
  Inbox as InboxIcon,
  Link2,
  Mail,
  MailPlus,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type InboxAccount = {
  id: number;
  provider: string;
  emailAddress: string;
  displayName?: string;
  syncStatus: string;
  connectedAt: string;
  lastSyncedAt?: string;
};

type InboxEmail = {
  id: number;
  unitId?: number;
  unitNumber?: string;
  ownerName?: string;
  tenantName?: string;
  direction: "Inbound" | "Outbound";
  subject: string;
  bodyPreview?: string;
  contactEmail: string;
  mailboxAddress?: string;
  participants?: string;
  isUnread: boolean;
  matchedStatus: "matched" | "unmatched";
  receivedAt: string;
};

type InboxPayload = {
  accounts: InboxAccount[];
  matched: InboxEmail[];
  unmatched: InboxEmail[];
};

export function Inbox({ complexId }: { complexId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: units } = useListUnits(complexId);
  const [linkSelections, setLinkSelections] = useState<Record<number, string>>({});

  const inboxQuery = useQuery({
    queryKey: ["inbox", complexId],
    queryFn: () =>
      customFetch<InboxPayload>(`/api/complexes/${complexId}/inbox`, {
        method: "GET",
      }),
  });

  const createAccount = useMutation({
    mutationFn: (data: { provider: string; emailAddress: string; displayName?: string }) =>
      customFetch(`/api/complexes/${complexId}/inbox/accounts`, {
        method: "POST",
        responseType: "json",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox", complexId] });
      toast({
        title: "Mailbox Profile Added",
        description: "The mailbox profile has been saved. Live provider sync can be layered onto this next.",
      });
    },
  });

  const createEmailActivity = useMutation({
    mutationFn: (data: {
      accountId?: number;
      mailboxAddress?: string;
      direction: "Inbound" | "Outbound";
      subject: string;
      bodyPreview?: string;
      contactEmail: string;
      participants?: string;
      receivedAt?: string;
      isUnread?: boolean;
    }) =>
      customFetch(`/api/complexes/${complexId}/inbox/emails`, {
        method: "POST",
        responseType: "json",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox", complexId] });
      toast({
        title: "Email Activity Logged",
        description: "Matched email activity has been refreshed in the inbox.",
      });
    },
  });

  const linkEmail = useMutation({
    mutationFn: (data: { emailId: number; unitId: number }) =>
      customFetch(`/api/complexes/${complexId}/inbox/emails/${data.emailId}/link`, {
        method: "POST",
        responseType: "json",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId: data.unitId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox", complexId] });
      setLinkSelections({});
      toast({
        title: "Email Linked",
        description: "The email activity is now attached to the selected unit.",
      });
    },
  });

  const matchedEmails = inboxQuery.data?.matched || [];
  const unmatchedEmails = inboxQuery.data?.unmatched || [];
  const accounts = inboxQuery.data?.accounts || [];

  const summary = useMemo(
    () => ({
      matched: matchedEmails.length,
      unread: matchedEmails.filter((email) => email.isUnread).length,
      unmatched: unmatchedEmails.length,
      accounts: accounts.length,
    }),
    [accounts.length, matchedEmails, unmatchedEmails.length],
  );

  const handleAccountSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    createAccount.mutate({
      provider: String(formData.get("provider") ?? ""),
      emailAddress: String(formData.get("emailAddress") ?? "").trim(),
      displayName: String(formData.get("displayName") ?? "").trim() || undefined,
    });
    event.currentTarget.reset();
  };

  const handleActivitySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    createEmailActivity.mutate({
      accountId: formData.get("accountId") ? Number(formData.get("accountId")) : undefined,
      mailboxAddress: String(formData.get("mailboxAddress") ?? "").trim() || undefined,
      direction: formData.get("direction") as "Inbound" | "Outbound",
      subject: String(formData.get("subject") ?? "").trim(),
      bodyPreview: String(formData.get("bodyPreview") ?? "").trim() || undefined,
      contactEmail: String(formData.get("contactEmail") ?? "").trim(),
      participants: String(formData.get("participants") ?? "").trim() || undefined,
      receivedAt: String(formData.get("receivedAt") ?? "").trim() || undefined,
      isUnread: formData.get("isUnread") === "on",
    });
    event.currentTarget.reset();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Inbox</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          This is a filtered operational inbox. Only emails that match owner or tenant emails on units are shown in the main feed, so the team stays focused on property-linked communication instead of a full mailbox clone.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Matched Emails" value={summary.matched} />
        <SummaryCard label="Unread" value={summary.unread} />
        <SummaryCard label="Unmatched Queue" value={summary.unmatched} />
        <SummaryCard label="Mailbox Profiles" value={summary.accounts} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold font-display">Mailbox Profiles</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Save the mailbox identities the team wants to use in-app. This filtered inbox foundation is ready for later Gmail / Outlook provider sync.
              </p>
            </div>

            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Provider">
                  <select name="provider" defaultValue="Gmail" className="w-full rounded-xl border bg-background p-3">
                    <option value="Gmail">Gmail</option>
                    <option value="Outlook">Outlook / Microsoft 365</option>
                    <option value="IMAP">Other / IMAP</option>
                  </select>
                </Field>
                <Field label="Display Name">
                  <input name="displayName" className="w-full rounded-xl border p-3" placeholder="Portfolio Team" />
                </Field>
              </div>

              <Field label="Mailbox Email">
                <input required type="email" name="emailAddress" className="w-full rounded-xl border p-3" placeholder="support@company.com" />
              </Field>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={createAccount.isPending}
                  className="rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground shadow transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
                >
                  {createAccount.isPending ? "Saving..." : "Add Mailbox Profile"}
                </button>
              </div>
            </form>

            <div className="mt-5 space-y-3">
              {accounts.length === 0 ? (
                <EmptyState message="No mailbox profiles added yet." />
              ) : (
                accounts.map((account) => (
                  <div key={account.id} className="rounded-xl border bg-muted/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{account.displayName || account.emailAddress}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{account.provider} • {account.emailAddress}</p>
                      </div>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        {account.syncStatus}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold font-display">Log Email Activity</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Capture inbound or outbound email activity now. Matching logic links it to the right unit when the contact email exists on the Units tab.
              </p>
            </div>

            <form onSubmit={handleActivitySubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Mailbox Profile">
                  <select name="accountId" defaultValue="" className="w-full rounded-xl border bg-background p-3">
                    <option value="">Choose saved mailbox profile</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.emailAddress}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Direction">
                  <select name="direction" defaultValue="Inbound" className="w-full rounded-xl border bg-background p-3">
                    <option value="Inbound">Inbound</option>
                    <option value="Outbound">Outbound</option>
                  </select>
                </Field>
              </div>

              <Field label="Fallback Mailbox Address">
                <input name="mailboxAddress" type="email" className="w-full rounded-xl border p-3" placeholder="support@company.com" />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Matched Contact Email">
                  <input required name="contactEmail" type="email" className="w-full rounded-xl border p-3" placeholder="owner@resident.com" />
                </Field>
                <Field label="Received / Sent At">
                  <input name="receivedAt" type="datetime-local" className="w-full rounded-xl border p-3" />
                </Field>
              </div>

              <Field label="Subject">
                <input required name="subject" className="w-full rounded-xl border p-3" placeholder="Levy query for Unit 4" />
              </Field>

              <Field label="Participants">
                <input name="participants" className="w-full rounded-xl border p-3" placeholder="owner@resident.com; support@company.com" />
              </Field>

              <Field label="Email Preview">
                <textarea name="bodyPreview" rows={4} className="w-full rounded-xl border p-3 resize-none" placeholder="Short body preview or note..." />
              </Field>

              <label className="flex items-center gap-3 rounded-xl border bg-muted/20 px-4 py-3 text-sm">
                <input type="checkbox" name="isUnread" defaultChecked className="h-4 w-4" />
                Mark as unread
              </label>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={createEmailActivity.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground shadow transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
                >
                  <MailPlus className="h-4 w-4" />
                  {createEmailActivity.isPending ? "Saving..." : "Log Email Activity"}
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold font-display">Matched Inbox</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Only email activity linked to known unit contacts appears here.
                </p>
              </div>
              <button
                type="button"
                onClick={() => inboxQuery.refetch()}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>

            <div className="space-y-3">
              {inboxQuery.isLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : matchedEmails.length === 0 ? (
                <EmptyState message="No matched email activity yet. Once a contact email matches a unit record, it will appear here." />
              ) : (
                matchedEmails.map((email) => (
                  <div key={email.id} className="rounded-xl border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{email.subject}</p>
                          {email.isUnread ? (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                              Unread
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                          {email.direction} • {email.contactEmail}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">{email.bodyPreview || "No preview saved."}</p>
                      </div>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        {formatDateTime(email.receivedAt)}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {email.unitNumber ? (
                        <Link
                          href={`/complexes/${complexId}/units`}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                        >
                          Unit {email.unitNumber}
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      ) : null}
                      {email.ownerName ? (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                          {email.ownerName}
                        </span>
                      ) : null}
                      {email.mailboxAddress ? (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                          via {email.mailboxAddress}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold font-display">Unmatched Review Queue</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep unmatched emails out of the main inbox, but let admins review and link them when needed.
              </p>
            </div>

            <div className="space-y-3">
              {unmatchedEmails.length === 0 ? (
                <EmptyState message="No unmatched emails need review right now." />
              ) : (
                unmatchedEmails.map((email) => (
                  <div key={email.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <TriangleAlert className="h-4 w-4 text-amber-600" />
                          <p className="font-semibold text-foreground">{email.subject}</p>
                        </div>
                        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                          {email.direction} • {email.contactEmail}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">{email.bodyPreview || "No preview saved."}</p>
                      </div>
                      <span className="rounded-full bg-background px-2.5 py-1 text-xs text-muted-foreground">
                        {formatDateTime(email.receivedAt)}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <select
                        value={linkSelections[email.id] || ""}
                        onChange={(event) =>
                          setLinkSelections((current) => ({
                            ...current,
                            [email.id]: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border bg-background p-3 md:max-w-sm"
                      >
                        <option value="">Select unit to link...</option>
                        {(units || []).map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            Unit {unit.unitNumber}
                            {unit.ownerName ? ` • ${unit.ownerName}` : ""}
                          </option>
                        ))}
                      </select>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const unitId = Number(linkSelections[email.id] || "");
                            if (!Number.isNaN(unitId) && unitId > 0) {
                              linkEmail.mutate({ emailId: email.id, unitId });
                            }
                          }}
                          disabled={linkEmail.isPending}
                          className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                        >
                          <Link2 className="h-4 w-4" />
                          Link to Unit
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
      <InboxIcon className="mx-auto mb-3 h-10 w-10 opacity-30" />
      {message}
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
