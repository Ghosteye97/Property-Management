import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  type Document,
  type Meeting,
  type MeetingResolution,
  getListCommunicationsQueryKey,
  useCreateMeeting,
  useCreateCommunication,
  useCreateMeetingResolution,
  useGetComplex,
  useListDocuments,
  useListUnits,
  useListMeetings,
  useUpdateMeeting,
  useUpdateMeetingResolution,
  getListMeetingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Gavel,
  Mail,
  Paperclip,
  Plus,
  TriangleAlert,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { appendLinkedDocuments, buildMeetingNoticeDraft, getAudienceStats, type RecipientScope } from "@/lib/communications";

export function Meetings({ complexId }: { complexId: number }) {
  const { data: complex } = useGetComplex(complexId);
  const { data: meetings, isLoading } = useListMeetings(complexId);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const isSectionalTitle = complex?.type === "Sectional Title";

  const summary = useMemo(() => {
    const allMeetings = meetings || [];
    return {
      total: allMeetings.length,
      upcoming: allMeetings.filter((meeting) => meeting.status === "Scheduled").length,
      completed: allMeetings.filter((meeting) => meeting.status === "Completed").length,
      resolutions: allMeetings.reduce(
        (count, meeting) => count + meeting.resolutions.length,
        0,
      ),
    };
  }, [meetings]);

  if (!isSectionalTitle) {
    return (
      <div className="p-8 max-w-5xl mx-auto animate-fade-in">
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-display font-bold text-foreground">
            Meetings & Governance
          </h1>
          <p className="mt-3 text-muted-foreground">
            This module is available for sectional title schemes. Switch the
            complex type to `Sectional Title` if you want to manage AGMs,
            trustee meetings, and resolutions here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Meetings & Governance
          </h1>
          <p className="text-muted-foreground mt-2">
            Plan AGMs and trustee meetings, capture attendance, and track
            resolutions for the body corporate.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <Plus className="h-4 w-4" />
              New Meeting
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[760px]">
            <DialogHeader>
              <DialogTitle>Schedule Meeting</DialogTitle>
            </DialogHeader>
            <MeetingForm complexId={complexId} onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Total Meetings" value={summary.total} icon={CalendarDays} />
        <SummaryCard label="Scheduled" value={summary.upcoming} icon={Users} />
        <SummaryCard label="Completed" value={summary.completed} icon={CheckCircle2} />
        <SummaryCard label="Resolutions" value={summary.resolutions} icon={Gavel} />
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border bg-card">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !meetings?.length ? (
          <div className="rounded-2xl border border-dashed bg-card px-6 py-14 text-center text-muted-foreground">
            <ClipboardList className="mx-auto mb-4 h-12 w-12 opacity-30" />
            No meetings have been scheduled yet.
          </div>
        ) : (
          meetings.map((meeting) => (
            <button
              key={meeting.id}
              type="button"
              onClick={() => setSelectedMeeting(meeting)}
              className="w-full rounded-2xl border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {meeting.meetingType}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {meeting.status}
                    </span>
                    {meeting.quorumReached && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Quorum reached
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-foreground">
                    {meeting.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {format(new Date(meeting.scheduledAt), "EEE, d MMM yyyy 'at' HH:mm")}
                    {meeting.venue ? ` • ${meeting.venue}` : ""}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm md:min-w-[220px]">
                  <StatPill label="Attendance" value={meeting.attendanceCount} />
                  <StatPill label="Resolutions" value={meeting.resolutions.length} />
                </div>
              </div>

              {meeting.agenda && (
                <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">
                  {meeting.agenda}
                </p>
              )}
            </button>
          ))
        )}
      </div>

      <Dialog open={Boolean(selectedMeeting)} onOpenChange={(open) => !open && setSelectedMeeting(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[920px]">
          {selectedMeeting ? (
            <>
              <DialogHeader>
                <DialogTitle>Meeting Details</DialogTitle>
              </DialogHeader>
              <MeetingDetails
                complexId={complexId}
                meeting={selectedMeeting}
                onClose={() => setSelectedMeeting(null)}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-muted/20 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
    </div>
  );
}

function MeetingForm({
  complexId,
  meeting,
  onSuccess,
}: {
  complexId: number;
  meeting?: Meeting;
  onSuccess: () => void;
}) {
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();
  const queryClient = useQueryClient();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = {
      title: String(formData.get("title") ?? "").trim(),
      meetingType: formData.get("meetingType") as
        | "AGM"
        | "Trustee Meeting"
        | "Special General Meeting"
        | "Other",
      status: formData.get("status") as "Draft" | "Scheduled" | "Completed" | "Cancelled",
      scheduledAt: new Date(String(formData.get("scheduledAt") ?? "")).toISOString(),
      venue: toOptionalString(formData.get("venue")),
      agenda: toOptionalString(formData.get("agenda")),
      minutes: toOptionalString(formData.get("minutes")),
      attendanceCount: Number(formData.get("attendanceCount") || 0),
      quorumReached: formData.get("quorumReached") === "on",
    };

    const onMutationSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListMeetingsQueryKey(complexId) });
      onSuccess();
    };

    if (meeting) {
      updateMeeting.mutate(
        { complexId, meetingId: meeting.id, data },
        { onSuccess: onMutationSuccess },
      );
      return;
    }

    createMeeting.mutate({ complexId, data }, { onSuccess: onMutationSuccess });
  };

  const isPending = createMeeting.isPending || updateMeeting.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Meeting Title">
          <input
            required
            name="title"
            defaultValue={meeting?.title}
            className="w-full rounded-xl border p-3"
            placeholder="Annual General Meeting 2026"
          />
        </Field>
        <Field label="Meeting Type">
          <select
            required
            name="meetingType"
            defaultValue={meeting?.meetingType || "AGM"}
            className="w-full rounded-xl border bg-background p-3"
          >
            <option value="AGM">AGM</option>
            <option value="Trustee Meeting">Trustee Meeting</option>
            <option value="Special General Meeting">Special General Meeting</option>
            <option value="Other">Other</option>
          </select>
        </Field>
        <Field label="Status">
          <select
            required
            name="status"
            defaultValue={meeting?.status || "Scheduled"}
            className="w-full rounded-xl border bg-background p-3"
          >
            <option value="Draft">Draft</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </Field>
        <Field label="Date & Time">
          <input
            required
            type="datetime-local"
            name="scheduledAt"
            defaultValue={toDateTimeLocal(meeting?.scheduledAt)}
            className="w-full rounded-xl border p-3"
          />
        </Field>
        <Field label="Venue / Link">
          <input
            name="venue"
            defaultValue={meeting?.venue}
            className="w-full rounded-xl border p-3"
            placeholder="Clubhouse or Zoom link"
          />
        </Field>
        <Field label="Attendance Count">
          <input
            type="number"
            min="0"
            name="attendanceCount"
            defaultValue={meeting?.attendanceCount ?? 0}
            className="w-full rounded-xl border p-3"
          />
        </Field>
      </div>

      <label className="flex items-center gap-3 rounded-xl border bg-muted/20 px-4 py-3 text-sm">
        <input
          type="checkbox"
          name="quorumReached"
          defaultChecked={meeting?.quorumReached}
          className="h-4 w-4"
        />
        Quorum reached
      </label>

      <Field label="Agenda">
        <textarea
          name="agenda"
          rows={5}
          defaultValue={meeting?.agenda}
          className="w-full rounded-xl border p-3 resize-none"
          placeholder="Capture agenda items, owner motions, and planned discussions."
        />
      </Field>

      <Field label="Minutes">
        <textarea
          name="minutes"
          rows={5}
          defaultValue={meeting?.minutes}
          className="w-full rounded-xl border p-3 resize-none"
          placeholder="Meeting outcome summary and key notes."
        />
      </Field>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground shadow transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
        >
          {isPending ? "Saving..." : meeting ? "Save Meeting" : "Create Meeting"}
        </button>
      </div>
    </form>
  );
}

function MeetingDetails({
  complexId,
  meeting,
  onClose,
}: {
  complexId: number;
  meeting: Meeting;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: units } = useListUnits(complexId);
  const { data: documents } = useListDocuments(complexId);
  const createResolution = useCreateMeetingResolution();
  const updateResolution = useUpdateMeetingResolution();
  const createCommunication = useCreateCommunication();
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);

  const refreshMeetings = () =>
    queryClient.invalidateQueries({ queryKey: getListMeetingsQueryKey(complexId) });

  return (
    <div className="space-y-6 pt-2">
      <div className="flex justify-end">
        <Dialog open={isNoticeOpen} onOpenChange={setIsNoticeOpen}>
          <DialogTrigger asChild>
            <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">
              <Mail className="h-4 w-4" />
              Create Meeting Notice
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[820px]">
            <DialogHeader>
              <DialogTitle>Create Meeting Notice</DialogTitle>
            </DialogHeader>
            <MeetingNoticeForm
              complexId={complexId}
              meeting={meeting}
              units={units || []}
              documents={documents || []}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: getListCommunicationsQueryKey(complexId) });
                setIsNoticeOpen(false);
              }}
              createCommunication={(data, onSuccess) =>
                createCommunication.mutate(data, { onSuccess })
              }
              isPending={createCommunication.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl border bg-muted/10 p-5">
        <MeetingForm
          complexId={complexId}
          meeting={meeting}
          onSuccess={() => {
            refreshMeetings();
            onClose();
          }}
        />
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">Resolutions</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Track motions and decisions that came out of this meeting.
        </p>

        <ResolutionForm
          onSubmit={(data) =>
            createResolution.mutate(
              { complexId, meetingId: meeting.id, data },
              {
                onSuccess: () => {
                  refreshMeetings();
                },
              },
            )
          }
          isPending={createResolution.isPending}
        />

        <div className="mt-5 space-y-3">
          {meeting.resolutions.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No resolutions logged yet.
            </div>
          ) : (
            meeting.resolutions.map((resolution) => (
              <ResolutionCard
                key={resolution.id}
                resolution={resolution}
                onSave={(data) =>
                  updateResolution.mutate(
                    {
                      complexId,
                      meetingId: meeting.id,
                      resolutionId: resolution.id,
                      data,
                    },
                    {
                      onSuccess: () => {
                        refreshMeetings();
                      },
                    },
                  )
                }
                isPending={updateResolution.isPending}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ResolutionForm({
  onSubmit,
  isPending,
  resolution,
}: {
  onSubmit: (data: {
    title: string;
    status: "Proposed" | "Passed" | "Deferred" | "Rejected";
    notes?: string;
    effectiveDate?: string;
  }) => void;
  isPending: boolean;
  resolution?: MeetingResolution;
}) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onSubmit({
      title: String(formData.get("title") ?? "").trim(),
      status: formData.get("status") as "Proposed" | "Passed" | "Deferred" | "Rejected",
      notes: toOptionalString(formData.get("notes")),
      effectiveDate: toOptionalDateIso(formData.get("effectiveDate")),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-xl border bg-muted/10 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Resolution">
          <input
            required
            name="title"
            defaultValue={resolution?.title}
            className="w-full rounded-xl border p-3"
            placeholder="Approve reserve fund contribution increase"
          />
        </Field>
        <Field label="Status">
          <select
            required
            name="status"
            defaultValue={resolution?.status || "Proposed"}
            className="w-full rounded-xl border bg-background p-3"
          >
            <option value="Proposed">Proposed</option>
            <option value="Passed">Passed</option>
            <option value="Deferred">Deferred</option>
            <option value="Rejected">Rejected</option>
          </select>
        </Field>
        <Field label="Effective Date">
          <input
            type="date"
            name="effectiveDate"
            defaultValue={toDateOnly(resolution?.effectiveDate)}
            className="w-full rounded-xl border p-3"
          />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          name="notes"
          rows={3}
          defaultValue={resolution?.notes}
          className="w-full rounded-xl border p-3 resize-none"
          placeholder="Decision summary, vote context, or implementation notes."
        />
      </Field>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-primary px-5 py-2.5 font-medium text-primary-foreground shadow transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
        >
          {isPending ? "Saving..." : resolution ? "Update Resolution" : "Add Resolution"}
        </button>
      </div>
    </form>
  );
}

function MeetingNoticeForm({
  complexId,
  meeting,
  units,
  documents,
  onSuccess,
  createCommunication,
  isPending,
}: {
  complexId: number;
  meeting: Meeting;
  units: { id: number; unitNumber: string; ownerName?: string; ownerEmail?: string; tenantEmail?: string; isTrustee?: boolean }[];
  documents: Document[];
  onSuccess: () => void;
  createCommunication: (
    args: {
      complexId: number;
      data: {
        subject: string;
        body: string;
        type: "Newsletter" | "Notice" | "Reminder" | "Emergency" | "Other";
        sentTo: RecipientScope;
        unitIds?: number[];
      };
    },
    onSuccess: () => void,
  ) => void;
  isPending: boolean;
}) {
  const draft = buildMeetingNoticeDraft(meeting);
  const [recipientScope, setRecipientScope] = useState<RecipientScope>("All Owners");
  const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([]);

  const audienceStats = getAudienceStats(units as any, recipientScope, selectedUnitIds);

  const toggleUnit = (unitId: number, checked: boolean) => {
    setSelectedUnitIds((current) =>
      checked ? Array.from(new Set([...current, unitId])) : current.filter((id) => id !== unitId),
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const selectedDocumentIds = formData
      .getAll("documentIds")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value));
    const linkedDocuments = documents.filter((document) => selectedDocumentIds.includes(document.id));

    createCommunication(
      {
        complexId,
        data: {
          subject: String(formData.get("subject") ?? "").trim(),
          body: appendLinkedDocuments(String(formData.get("body") ?? "").trim(), linkedDocuments),
          type: formData.get("type") as "Newsletter" | "Notice" | "Reminder" | "Emergency" | "Other",
          sentTo: recipientScope,
          unitIds: recipientScope === "Selected Units" ? selectedUnitIds : undefined,
        },
      },
      onSuccess,
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pt-2">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Type">
          <select name="type" defaultValue="Notice" className="w-full rounded-xl border bg-background p-3">
            <option value="Notice">Notice</option>
            <option value="Reminder">Reminder</option>
            <option value="Newsletter">Newsletter</option>
            <option value="Emergency">Emergency</option>
            <option value="Other">Other</option>
          </select>
        </Field>
        <Field label="Audience">
          <select
            value={recipientScope}
            onChange={(event) => {
              setRecipientScope(event.target.value as RecipientScope);
              setSelectedUnitIds([]);
            }}
            className="w-full rounded-xl border bg-background p-3"
          >
            <option value="All Owners">All Owners</option>
            <option value="Trustees">Trustees</option>
            <option value="Selected Units">Selected Units</option>
          </select>
        </Field>
      </div>

      <Field label="Subject">
        <input
          required
          name="subject"
          defaultValue={draft.subject}
          className="w-full rounded-xl border p-3"
        />
      </Field>

      <Field label="Message">
        <textarea
          required
          name="body"
          rows={8}
          defaultValue={draft.body}
          className="w-full rounded-xl border p-3 resize-none"
        />
      </Field>

      {recipientScope === "Selected Units" ? (
        <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground">Select units</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {units.map((unit) => (
              <label key={unit.id} className="flex items-start gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedUnitIds.includes(unit.id)}
                  onChange={(event) => toggleUnit(unit.id, event.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="block font-medium text-foreground">Unit {unit.unitNumber}</span>
                  <span className="block text-xs text-muted-foreground">{unit.ownerName || "No owner captured"}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground">Recipient Readiness</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This notice targets {audienceStats.recipientCount} {audienceStats.audienceLabel}.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <TriangleAlert className="h-4 w-4" />
            Missing emails: {audienceStats.missingEmailCount}
          </div>
        </div>

        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground">Link Meeting Documents</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Select the AGM pack, agenda, minutes, or any related document to reference it in the communication log.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {documents.length > 0 ? (
          documents.slice().reverse().map((document) => (
            <label key={document.id} className="flex items-start gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
              <input type="checkbox" name="documentIds" value={document.id} className="mt-1 h-4 w-4" />
              <span>
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Paperclip className="h-3.5 w-3.5" />
                  {document.name}
                </span>
                <span className="block text-xs text-muted-foreground">{document.category}</span>
              </span>
            </label>
          ))
        ) : (
          <div className="rounded-lg border border-dashed bg-background px-3 py-4 text-sm text-muted-foreground">
            No documents uploaded yet for this complex.
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-primary px-5 py-2.5 font-medium text-primary-foreground shadow transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Meeting Notice"}
        </button>
      </div>
    </form>
  );
}

function ResolutionCard({
  resolution,
  onSave,
  isPending,
}: {
  resolution: MeetingResolution;
  onSave: (data: {
    title: string;
    status: "Proposed" | "Passed" | "Deferred" | "Rejected";
    notes?: string;
    effectiveDate?: string;
  }) => void;
  isPending: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <ResolutionForm
        resolution={resolution}
        isPending={isPending}
        onSubmit={(data) => {
          onSave(data);
          setIsEditing(false);
        }}
      />
    );
  }

  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{resolution.title}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            {resolution.status}
            {resolution.effectiveDate
              ? ` • Effective ${format(new Date(resolution.effectiveDate), "dd MMM yyyy")}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          Edit
        </button>
      </div>
      {resolution.notes && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
          {resolution.notes}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function toOptionalString(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized === "" ? undefined : normalized;
}

function toDateTimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function toDateOnly(value?: string) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function toOptionalDateIso(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized === "" ? undefined : new Date(normalized).toISOString();
}
