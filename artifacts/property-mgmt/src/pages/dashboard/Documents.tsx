import {
  type Document,
  type Unit,
  getListDocumentsQueryKey,
  useCreateDocument,
  useDeleteDocument,
  useGetComplex,
  useListDocuments,
  useListUnits,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText, FolderPlus, Trash2 } from "lucide-react";

export function Documents({ complexId }: { complexId: number }) {
  const { data: complex } = useGetComplex(complexId);
  const { data: units } = useListUnits(complexId);
  const { data: documents, isLoading } = useListDocuments(complexId);
  const createMutation = useCreateDocument();
  const deleteMutation = useDeleteDocument();
  const queryClient = useQueryClient();

  const isSectionalTitle = complex?.type === "Sectional Title";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const rawUnitId = String(formData.get("unitId") ?? "").trim();

    createMutation.mutate(
      {
        complexId,
        data: {
          name: String(formData.get("name") ?? "").trim(),
          category: formData.get("category") as "Compliance" | "Contract" | "Financial" | "Rules" | "Insurance" | "Other",
          unitId: rawUnitId ? Number(rawUnitId) : undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(complexId) });
          event.currentTarget.reset();
        },
      },
    );
  };

  const handleDelete = (documentId: number) => {
    deleteMutation.mutate(
      { complexId, documentId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(complexId) });
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
            ? "Store sectional title compliance records, rule packs, and owner-facing document references."
            : "Keep document references grouped by complex and unit."}
        </p>
      </div>

      {isSectionalTitle && (
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold font-display">Registry Forms</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The next step here is a dedicated owner registry form with unit selection, signature capture, and PDF export. For today, this page gives you a live compliance document register so those records have a proper home.
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold font-display">Add Document Record</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Save a document reference now and attach real files in a later pass.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Document Name</label>
              <input required name="name" className="w-full rounded-xl border p-3" placeholder="CSOS annual return pack, AGM minutes, insurance schedule..." />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select name="category" defaultValue="Compliance" className="w-full rounded-xl border bg-background p-3">
                  <option value="Compliance">Compliance</option>
                  <option value="Contract">Contract</option>
                  <option value="Financial">Financial</option>
                  <option value="Rules">Rules</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Related Unit</label>
                <select name="unitId" defaultValue="" className="w-full rounded-xl border bg-background p-3">
                  <option value="">Complex-level document</option>
                  {(units || []).map((unit: Unit) => (
                    <option key={unit.id} value={unit.id}>
                      Unit {unit.unitNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground shadow transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
              >
                <FolderPlus className="h-4 w-4" />
                {createMutation.isPending ? "Saving..." : "Save Document"}
              </button>
            </div>
          </form>
        </div>

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
            ) : !documents?.length ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
                No document records saved yet.
              </div>
            ) : (
              documents
                .slice()
                .reverse()
                .map((document: Document) => {
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
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(document.id)}
                          disabled={deleteMutation.isPending}
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
  );
}
