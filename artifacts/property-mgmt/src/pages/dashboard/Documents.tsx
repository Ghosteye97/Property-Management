import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  type Document,
  type Meeting,
  type Unit,
  customFetch,
  getListDocumentsQueryKey,
  useDeleteDocument,
  useGetComplex,
  useListDocuments,
  useListMeetings,
  useListUnits,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ExternalLink,
  FileText,
  PenSquare,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const DOCUMENT_CATEGORIES = [
  "CSOS & Compliance",
  "AGM & Meetings",
  "Owner Records",
  "Rules",
  "Insurance",
  "Financial",
  "Contract",
  "Other",
] as const;

type RegistryFormState = {
  meetingId: string;
  unitId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  correspondenceAddress: string;
  ownershipStartDate: string;
  trusteeRole: string;
  notes: string;
  signature: string;
};

const EMPTY_REGISTRY_FORM: RegistryFormState = {
  meetingId: "",
  unitId: "",
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  correspondenceAddress: "",
  ownershipStartDate: "",
  trusteeRole: "",
  notes: "",
  signature: "",
};

export function Documents({ complexId }: { complexId: number }) {
  const { data: complex } = useGetComplex(complexId);
  const { data: units } = useListUnits(complexId);
  const { data: meetings } = useListMeetings(complexId);
  const { data: documents, isLoading } = useListDocuments(complexId);
  const deleteMutation = useDeleteDocument();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingRegistryForm, setIsSavingRegistryForm] = useState(false);
  const [registryForm, setRegistryForm] = useState<RegistryFormState>(EMPTY_REGISTRY_FORM);
  const [selectedRegistryDocument, setSelectedRegistryDocument] = useState<Document | null>(null);
  const [isRegistryOpen, setIsRegistryOpen] = useState(false);

  const isSectionalTitle = complex?.type === "Sectional Title";

  const orderedDocuments = useMemo(
    () => (documents || []).slice().reverse(),
    [documents],
  );

  const registryDocuments = orderedDocuments.filter(
    (document) => document.sourceType === "registry_form",
  );

  const selectedRegistryFormData = useMemo(() => {
    if (!selectedRegistryDocument?.formData) return null;

    try {
      return JSON.parse(selectedRegistryDocument.formData) as {
        unitNumber?: string;
        meetingId?: string;
        meetingTitle?: string;
        ownerName?: string;
        ownerEmail?: string;
        ownerPhone?: string;
        correspondenceAddress?: string;
        ownershipStartDate?: string;
        trusteeRole?: string;
        notes?: string;
        signature?: string;
        submittedAt?: string;
      };
    } catch {
      return null;
    }
  }, [selectedRegistryDocument]);

  const handleUploadSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const rawUnitId = String(formData.get("unitId") ?? "").trim();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return;
    }

    setIsUploading(true);
    const fileContentBase64 = await fileToBase64(file);
    const title = String(formData.get("name") ?? "").trim() || file.name;

    try {
      await customFetch(`/api/complexes/${complexId}/documents`, {
        method: "POST",
        responseType: "json",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: title,
          category: formData.get("category"),
          sourceType: "upload",
          unitId: rawUnitId ? Number(rawUnitId) : undefined,
          fileName: file.name,
          mimeType: file.type || undefined,
          fileSize: formatBytes(file.size),
          fileContentBase64,
        }),
      });

      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(complexId) });
      event.currentTarget.reset();
    } finally {
      setIsUploading(false);
    }
  };

  const handleRegistryUnitChange = (unitId: string) => {
    const unit = (units || []).find((item) => String(item.id) === unitId);

    setRegistryForm({
      meetingId: registryForm.meetingId,
      unitId,
      ownerName: unit?.ownerName || "",
      ownerEmail: unit?.ownerEmail || "",
      ownerPhone: unit?.ownerPhone || "",
      correspondenceAddress: unit?.correspondenceAddress || "",
      ownershipStartDate: unit?.ownershipStartDate || "",
      trusteeRole: unit?.trusteeRole || "",
      notes: unit?.notes || "",
      signature: "",
    });
  };

  const handleRegistrySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!registryForm.meetingId || !registryForm.unitId || !registryForm.signature) {
      return;
    }

    const selectedUnit = (units || []).find((unit) => unit.id === Number(registryForm.unitId));
    const selectedMeeting = (meetings || []).find(
      (meeting) => meeting.id === Number(registryForm.meetingId),
    );
    const payload = {
      ...registryForm,
      meetingTitle: selectedMeeting?.title,
      unitNumber: selectedUnit?.unitNumber,
      submittedAt: new Date().toISOString(),
    };

    setIsSavingRegistryForm(true);

    try {
      await customFetch(`/api/complexes/${complexId}/documents`, {
        method: "POST",
        responseType: "json",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${selectedMeeting?.meetingType || "Meeting"} Registry Sign-In - Unit ${selectedUnit?.unitNumber || registryForm.unitId}`,
          category: "AGM & Meetings",
          sourceType: "registry_form",
          unitId: Number(registryForm.unitId),
          mimeType: "application/json",
          formData: JSON.stringify(payload),
        }),
      });

      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(complexId) });
      setRegistryForm(EMPTY_REGISTRY_FORM);
      event.currentTarget.reset();
      setIsRegistryOpen(false);
    } finally {
      setIsSavingRegistryForm(false);
    }
  };

  const handleDelete = (documentId: number) => {
    deleteMutation.mutate(
      { complexId, documentId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(complexId) });
          if (selectedRegistryDocument?.id === documentId) {
            setSelectedRegistryDocument(null);
          }
        },
      },
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Documents</h1>
        <p className="text-muted-foreground mt-2">
          {isSectionalTitle
            ? "Store sectional title compliance records, meeting packs, governance records, and supporting files."
            : "Keep document references grouped by complex and unit."}
        </p>
      </div>

      {isSectionalTitle && (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold font-display">Meeting Registry Sign-In</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use this only during a scheduled AGM or meeting so owners can sign in against the correct session on a laptop or tablet.
          </p>
          <div className="mt-4">
            <Dialog
              open={isRegistryOpen}
              onOpenChange={(open) => {
                setIsRegistryOpen(open);
                if (!open) {
                  setRegistryForm(EMPTY_REGISTRY_FORM);
                }
              }}
            >
              <DialogTrigger asChild>
                <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground shadow transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <PenSquare className="h-4 w-4" />
                  Open Meeting Sign-In
                </button>
              </DialogTrigger>
              <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[760px]">
                <DialogHeader>
                  <DialogTitle>Meeting Registry Sign-In</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleRegistrySubmit} className="space-y-5 pt-2">
                  <div className="rounded-xl border bg-muted/15 p-4">
                    <p className="text-sm font-medium text-foreground">Meeting Desk Flow</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Select the meeting first, then capture the owner&apos;s unit and signature as an attendance-style sign-in for that session.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Meeting / AGM *</label>
                    <select
                      required
                      value={registryForm.meetingId}
                      onChange={(event) =>
                        setRegistryForm((current) => ({ ...current, meetingId: event.target.value }))
                      }
                      className="w-full rounded-xl border bg-background p-3"
                    >
                      <option value="">Select meeting...</option>
                      {(meetings || []).map((meeting: Meeting) => (
                        <option key={meeting.id} value={meeting.id}>
                          {meeting.meetingType} • {meeting.title}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      This sign-in flow is only for scheduled meetings or AGMs, not a standing app requirement.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Unit *</label>
                    <select
                      required
                      value={registryForm.unitId}
                      onChange={(event) => handleRegistryUnitChange(event.target.value)}
                      className="w-full rounded-xl border bg-background p-3"
                    >
                      <option value="">Select unit...</option>
                      {(units || []).map((unit: Unit) => (
                        <option key={unit.id} value={unit.id}>
                          Unit {unit.unitNumber}
                          {unit.ownerName ? ` • ${unit.ownerName}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Owner Name">
                      <input
                        value={registryForm.ownerName}
                        onChange={(event) =>
                          setRegistryForm((current) => ({ ...current, ownerName: event.target.value }))
                        }
                        className="w-full rounded-xl border p-3"
                      />
                    </Field>
                    <Field label="Owner Email">
                      <input
                        type="email"
                        value={registryForm.ownerEmail}
                        onChange={(event) =>
                          setRegistryForm((current) => ({ ...current, ownerEmail: event.target.value }))
                        }
                        className="w-full rounded-xl border p-3"
                      />
                    </Field>
                    <Field label="Owner Phone">
                      <input
                        value={registryForm.ownerPhone}
                        onChange={(event) =>
                          setRegistryForm((current) => ({ ...current, ownerPhone: event.target.value }))
                        }
                        className="w-full rounded-xl border p-3"
                      />
                    </Field>
                    <Field label="Ownership Start Date">
                      <input
                        type="date"
                        value={registryForm.ownershipStartDate}
                        onChange={(event) =>
                          setRegistryForm((current) => ({
                            ...current,
                            ownershipStartDate: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border p-3"
                      />
                    </Field>
                  </div>

                  <Field label="Correspondence Address">
                    <textarea
                      rows={3}
                      value={registryForm.correspondenceAddress}
                      onChange={(event) =>
                        setRegistryForm((current) => ({
                          ...current,
                          correspondenceAddress: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border p-3 resize-none"
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Trustee Role">
                      <input
                        value={registryForm.trusteeRole}
                        onChange={(event) =>
                          setRegistryForm((current) => ({ ...current, trusteeRole: event.target.value }))
                        }
                        className="w-full rounded-xl border p-3"
                        placeholder="Optional"
                      />
                    </Field>
                    <Field label="Signature *">
                      <SignaturePad
                        value={registryForm.signature}
                        onChange={(signature) =>
                          setRegistryForm((current) => ({ ...current, signature }))
                        }
                      />
                    </Field>
                  </div>

                  <Field label="Notes">
                    <textarea
                      rows={3}
                      value={registryForm.notes}
                      onChange={(event) =>
                        setRegistryForm((current) => ({ ...current, notes: event.target.value }))
                      }
                      className="w-full rounded-xl border p-3 resize-none"
                    />
                  </Field>

                  <div className="flex justify-end gap-3 border-t pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegistryOpen(false);
                        setRegistryForm(EMPTY_REGISTRY_FORM);
                      }}
                      className="rounded-xl border px-5 py-3 font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingRegistryForm}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground shadow transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
                    >
                      <PenSquare className="h-4 w-4" />
                      {isSavingRegistryForm ? "Saving..." : "Save Meeting Sign-In"}
                    </button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold font-display">Upload Document</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Upload PDFs, Word documents, spreadsheets, and other supporting files for the scheme.
              </p>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Document Title</label>
                <input
                  name="name"
                  className="w-full rounded-xl border p-3"
                  placeholder="Optional title. Defaults to the uploaded file name."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <select
                    name="category"
                    defaultValue="CSOS & Compliance"
                    className="w-full rounded-xl border bg-background p-3"
                  >
                    {DOCUMENT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Related Unit</label>
                  <select
                    name="unitId"
                    defaultValue=""
                    className="w-full rounded-xl border bg-background p-3"
                  >
                    <option value="">Complex-level document</option>
                    {(units || []).map((unit: Unit) => (
                      <option key={unit.id} value={unit.id}>
                        Unit {unit.unitNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">File</label>
                <input
                  required
                  type="file"
                  name="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png"
                  className="w-full rounded-xl border bg-background p-3 file:mr-4 file:rounded-lg file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Supported for now: PDF, Word, Excel, CSV, text, and common image formats.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground shadow transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? "Uploading..." : "Upload Document"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          {isSectionalTitle && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold font-display">Saved Meeting Sign-Ins</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Attendance-style sign-in records captured during AGMs and meetings.
                </p>
              </div>

              <div className="space-y-3">
                {!registryDocuments.length ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                    <UserRound className="mx-auto mb-3 h-10 w-10 opacity-30" />
                    No meeting sign-ins saved yet.
                  </div>
                ) : (
                  registryDocuments.map((document) => {
                    const relatedUnit = units?.find((unit) => unit.id === document.unitId);

                    return (
                      <button
                        key={document.id}
                        type="button"
                        onClick={() => setSelectedRegistryDocument(document)}
                        className="w-full rounded-xl border bg-background p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{document.name}</p>
                            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                              AGM & Meetings
                              {relatedUnit ? ` • Unit ${relatedUnit.unitNumber}` : ""}
                            </p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            Meeting Sign-In
                          </span>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          Logged {format(new Date(document.uploadedAt), "dd MMM yyyy, HH:mm")}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold font-display">Document Register</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Compliance and operational records saved for this complex.
              </p>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : !orderedDocuments.length ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
                  No document records saved yet.
                </div>
              ) : (
                orderedDocuments.map((document: Document) => {
                  const relatedUnit = units?.find((unit: Unit) => unit.id === document.unitId);

                  return (
                    <div key={document.id} className="rounded-xl border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{document.name}</p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                            {document.category}
                            {relatedUnit ? ` • Unit ${relatedUnit.unitNumber}` : " • Complex"}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {document.sourceType === "registry_form"
                              ? "Structured registry form"
                              : document.fileSize || "File size not recorded"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {document.sourceType === "registry_form" ? (
                            <button
                              type="button"
                              onClick={() => setSelectedRegistryDocument(document)}
                              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                          ) : document.fileUrl ? (
                            <a
                              href={document.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleDelete(document.id)}
                            disabled={deleteMutation.isPending}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Logged {format(new Date(document.uploadedAt), "dd MMM yyyy, HH:mm")}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedRegistryDocument && selectedRegistryFormData && (
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold font-display">Meeting Sign-In Preview</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Saved meeting sign-in for unit {selectedRegistryFormData.unitNumber || "-"}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRegistryDocument(null)}
              className="rounded-lg border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              Close
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PreviewField label="Meeting" value={selectedRegistryFormData.meetingTitle} />
            <PreviewField label="Owner Name" value={selectedRegistryFormData.ownerName} />
            <PreviewField label="Owner Email" value={selectedRegistryFormData.ownerEmail} />
            <PreviewField label="Owner Phone" value={selectedRegistryFormData.ownerPhone} />
            <PreviewField label="Ownership Start Date" value={selectedRegistryFormData.ownershipStartDate} />
            <PreviewField label="Trustee Role" value={selectedRegistryFormData.trusteeRole} />
            <PreviewField label="Submitted At" value={selectedRegistryFormData.submittedAt ? format(new Date(selectedRegistryFormData.submittedAt), "dd MMM yyyy, HH:mm") : ""} />
            <PreviewField
              label="Correspondence Address"
              value={selectedRegistryFormData.correspondenceAddress}
              className="md:col-span-2"
            />
            <PreviewField label="Notes" value={selectedRegistryFormData.notes} className="md:col-span-2" />
            <SignaturePreview
              label="Signature"
              value={selectedRegistryFormData.signature}
              className="md:col-span-2"
            />
          </div>
        </div>
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

function SignaturePad({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.lineWidth = 2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111827";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (!value) return;

    const image = new Image();
    image.onload = () => {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = value;
  }, [value]);

  const getPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const { x, y } = getPosition(event);
    isDrawingRef.current = true;
    context.beginPath();
    context.moveTo(x, y);
    canvas.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const { x, y } = getPosition(event);
    context.lineTo(x, y);
    context.stroke();
  };

  const finishDrawing = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !isDrawingRef.current) return;

    isDrawingRef.current = false;
    context.closePath();
    onChange(canvas.toDataURL("image/png"));
  };

  const clearSignature = () => {
    onChange("");
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border bg-white">
        <canvas
          ref={canvasRef}
          width={640}
          height={220}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrawing}
          onPointerLeave={finishDrawing}
          className="h-44 w-full touch-none cursor-crosshair bg-white"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Draw the owner&apos;s signature directly on the screen.
        </p>
        <button
          type="button"
          onClick={clearSignature}
          className="rounded-lg border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

function PreviewField({
  label,
  value,
  className = "",
}: {
  label: string;
  value?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border bg-muted/10 p-4 ${className}`.trim()}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{value || "-"}</p>
    </div>
  );
}

function SignaturePreview({
  label,
  value,
  className = "",
}: {
  label: string;
  value?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border bg-muted/10 p-4 ${className}`.trim()}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-3 rounded-lg border bg-white p-3">
        {value ? (
          <img
            src={value}
            alt="Captured signature"
            className="h-32 w-full object-contain"
          />
        ) : (
          <p className="text-sm text-muted-foreground">No signature saved.</p>
        )}
      </div>
    </div>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",", 2)[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const formatted = size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1);
  return `${formatted} ${units[unitIndex]}`;
}
