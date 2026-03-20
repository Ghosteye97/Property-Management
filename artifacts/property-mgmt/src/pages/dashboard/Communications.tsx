import { useEffect, useState } from "react";
import {
  type Communication,
  type Unit,
  getListCommunicationsQueryKey,
  useCreateCommunication,
  useGetComplex,
  useListCommunications,
  useListUnits,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Megaphone, Mail, Users, ShieldCheck } from "lucide-react";

type RecipientScope = "All Units" | "All Owners" | "Trustees" | "Selected Units";

export function Communications({ complexId }: { complexId: number }) {
  const { data: complex } = useGetComplex(complexId);
  const { data: units, isLoading: unitsLoading } = useListUnits(complexId);
  const { data: communications, isLoading: communicationsLoading } = useListCommunications(complexId);
  const createMutation = useCreateCommunication();
  const queryClient = useQueryClient();
  const [recipientScope, setRecipientScope] = useState<RecipientScope>("All Owners");

  const isSectionalTitle = complex?.type === "Sectional Title";
  const ownerUnits = (units || []).filter((unit: Unit) => Boolean(unit.ownerName || unit.ownerEmail));
  const trusteeUnits = (units || []).filter((unit: Unit) => unit.isTrustee);

  const audienceCards = isSectionalTitle
    ? [
        { label: "Owners", value: ownerUnits.length, icon: Users, hint: "Meeting and notice audience" },
        { label: "Trustees", value: trusteeUnits.length, icon: ShieldCheck, hint: "Committee contacts" },
      ]
    : [{ label: "Units", value: units?.length || 0, icon: Users, hint: "General communication audience" }];

  useEffect(() => {
    setRecipientScope(isSectionalTitle ? "All Owners" : "All Units");
  }, [isSectionalTitle]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const selectedUnitIds = formData
      .getAll("unitIds")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value));

    createMutation.mutate(
      {
        complexId,
        data: {
          subject: String(formData.get("subject") ?? "").trim(),
          body: String(formData.get("body") ?? "").trim(),
          type: formData.get("type") as "Newsletter" | "Notice" | "Reminder" | "Emergency" | "Other",
          sentTo: recipientScope,
          unitIds: recipientScope === "Selected Units" ? selectedUnitIds : undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCommunicationsQueryKey(complexId) });
          event.currentTarget.reset();
          setRecipientScope(isSectionalTitle ? "All Owners" : "All Units");
        },
      },
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Communications</h1>
          <p className="text-muted-foreground mt-2">
            {isSectionalTitle
              ? "Track owner and trustee communications for the body corporate."
              : "Log notices and updates sent to the complex."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {audienceCards.map(({ label, value, icon: Icon, hint }) => (
          <div key={label} className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold text-foreground">{value}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold font-display">New Communication</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isSectionalTitle
                ? "Use this for owner notices, trustee updates, and meeting-related messaging."
                : "Capture the core details of a notice or reminder sent to the complex."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select name="type" defaultValue="Notice" className="w-full rounded-xl border bg-background p-3">
                  <option value="Newsletter">Newsletter</option>
                  <option value="Notice">Notice</option>
                  <option value="Reminder">Reminder</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Audience</label>
                <select
                  name="sentTo"
                  value={recipientScope}
                  onChange={(event) => setRecipientScope(event.target.value as RecipientScope)}
                  className="w-full rounded-xl border bg-background p-3"
                >
                  {isSectionalTitle ? (
                    <>
                      <option value="All Owners">All Owners</option>
                      <option value="Trustees">Trustees</option>
                      <option value="Selected Units">Selected Units</option>
                    </>
                  ) : (
                    <>
                      <option value="All Units">All Units</option>
                      <option value="Selected Units">Selected Units</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <input required name="subject" className="w-full rounded-xl border p-3" placeholder="AGM notice, levy reminder, emergency update..." />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <textarea
                required
                name="body"
                rows={7}
                className="w-full rounded-xl border p-3 resize-none"
                placeholder={isSectionalTitle ? "Draft the owner or trustee communication..." : "Draft the message..."}
              />
            </div>

            {recipientScope === "Selected Units" && (
              <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Select units</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isSectionalTitle
                      ? "Use this when only specific owners should receive the notice."
                      : "Target only the relevant units for this communication."}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(units || []).map((unit: Unit) => (
                    <label key={unit.id} className="flex items-start gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
                      <input type="checkbox" name="unitIds" value={unit.id} className="mt-1 h-4 w-4" />
                      <span>
                        <span className="block font-medium text-foreground">Unit {unit.unitNumber}</span>
                        <span className="block text-xs text-muted-foreground">
                          {unit.ownerName || unit.tenantName || "No contact captured"}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground shadow transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                {createMutation.isPending ? "Saving..." : "Save Communication"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold font-display">Communication Log</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Recent notices and reminders saved for this complex.
            </p>
          </div>

          <div className="space-y-3">
            {communicationsLoading || unitsLoading ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : !communications?.length ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                <Megaphone className="mx-auto mb-3 h-10 w-10 opacity-30" />
                No communications have been saved yet.
              </div>
            ) : (
              communications
                .slice()
                .reverse()
                .map((communication: Communication) => (
                  <div key={communication.id} className="rounded-xl border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{communication.subject}</p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                          {communication.type} • {communication.sentTo}
                        </p>
                      </div>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        {communication.recipientCount || 0} recipients
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{communication.body}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Logged {format(new Date(communication.createdAt), "dd MMM yyyy, HH:mm")}
                    </p>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
