import { useState } from "react";
import { 
  useListMaintenanceRequests, 
  useCreateMaintenanceRequest,
  useUpdateMaintenanceRequest,
  useListUnits,
  getListMaintenanceRequestsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Wrench, Plus, AlertTriangle, CheckCircle2, Clock, Mail, FileText, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";

export function Maintenance({ complexId }: { complexId: number }) {
  const { data: requests, isLoading } = useListMaintenanceRequests(complexId);
  const { data: units } = useListUnits(complexId);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const updateMutation = useUpdateMaintenanceRequest();
  const queryClient = useQueryClient();

  const handleStatusChange = (id: number, status: any) => {
    updateMutation.mutate(
      { complexId, requestId: id, data: { status } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMaintenanceRequestsQueryKey(complexId) }) }
    );
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'Urgent': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleRequestDialogChange = (open: boolean) => {
    if (!open) {
      setSelectedRequest(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Maintenance</h1>
          <p className="text-muted-foreground">Track and manage repair requests.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium shadow-md shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <Plus className="w-4 h-4" />
              New Request
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit Maintenance Request</DialogTitle></DialogHeader>
            <MaintenanceForm complexId={complexId} units={units || []} onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simple Kanban-ish columns */}
        {['Open', 'In Progress', 'Completed'].map(status => {
          const colRequests = requests?.filter(r => r.status === status) || [];
          
          return (
            <div key={status} className="flex flex-col bg-muted/30 rounded-2xl border border-border p-4 h-[calc(100vh-200px)]">
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  {status === 'Open' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  {status === 'In Progress' && <Clock className="w-4 h-4 text-blue-500" />}
                  {status === 'Completed' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {status}
                </h3>
                <span className="bg-background text-xs font-bold px-2 py-1 rounded-full border shadow-sm">
                  {colRequests.length}
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {colRequests.length === 0 && !isLoading && (
                  <div className="text-center p-6 text-sm text-muted-foreground border-2 border-dashed border-border rounded-xl">
                    No requests
                  </div>
                )}
                
                {colRequests.map(req => (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => setSelectedRequest(req)}
                    className="group w-full rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getPriorityColor(req.priority)}`}>
                        {req.priority}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">Unit {req.unitNumber}</span>
                    </div>
                    <h4 className="font-semibold text-sm mb-1 line-clamp-2">{req.title}</h4>
                    <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{req.description || 'No description provided.'}</p>
                    
                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Wrench className="w-3 h-3" /> {req.category}
                      </span>
                      
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {status === 'Open' && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleStatusChange(req.id, 'In Progress');
                            }}
                            className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100"
                          >
                            Start
                          </button>
                        )}
                        {status === 'In Progress' && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleStatusChange(req.id, 'Completed');
                            }}
                            className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-100"
                          >
                            Done
                          </button>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={Boolean(selectedRequest)} onOpenChange={handleRequestDialogChange}>
        <DialogContent className="sm:max-w-[720px]">
          {selectedRequest ? (
            <>
              <DialogHeader>
                <DialogTitle>Maintenance Request Details</DialogTitle>
              </DialogHeader>
              <MaintenanceRequestDetails
                complexId={complexId}
                request={selectedRequest}
                onSaved={() => setSelectedRequest(null)}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MaintenanceForm({ complexId, units, onSuccess }: { complexId: number, units: any[], onSuccess: () => void }) {
  const createMutation = useCreateMaintenanceRequest();
  const queryClient = useQueryClient();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      complexId,
      data: {
        unitId: Number(formData.get("unitId")),
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        category: formData.get("category") as any,
        priority: formData.get("priority") as any,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMaintenanceRequestsQueryKey(complexId) });
        onSuccess();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Unit</label>
        <select required name="unitId" className="w-full p-2.5 border rounded-xl bg-background">
          <option value="">Select unit...</option>
          {units.map(u => (
            <option key={u.id} value={u.id}>Unit {u.unitNumber}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Issue Title</label>
        <input required name="title" className="w-full p-2.5 border rounded-xl" placeholder="e.g. Leaking pipe in bathroom" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <select required name="category" className="w-full p-2.5 border rounded-xl bg-background">
            <option value="Plumbing">Plumbing</option>
            <option value="Electrical">Electrical</option>
            <option value="Structural">Structural</option>
            <option value="Cleaning">Cleaning</option>
            <option value="Security">Security</option>
            <option value="Landscaping">Landscaping</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Priority</label>
          <select required name="priority" className="w-full p-2.5 border rounded-xl bg-background">
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <textarea name="description" rows={4} className="w-full p-2.5 border rounded-xl resize-none" placeholder="Provide details..." />
      </div>

      <div className="pt-4 flex justify-end">
        <button 
          type="submit" 
          disabled={createMutation.isPending}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium shadow hover:shadow-lg transition-all disabled:opacity-50"
        >
          {createMutation.isPending ? "Submitting..." : "Submit Request"}
        </button>
      </div>
    </form>
  );
}

function MaintenanceRequestDetails({
  complexId,
  request,
  onSaved,
}: {
  complexId: number;
  request: any;
  onSaved: () => void;
}) {
  const updateMutation = useUpdateMaintenanceRequest();
  const queryClient = useQueryClient();
  const [contractorEmail, setContractorEmail] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    updateMutation.mutate(
      {
        complexId,
        requestId: request.id,
        data: {
          status: formData.get("status") as any,
          assignedTo: String(formData.get("assignedTo") ?? "").trim() || undefined,
          notes: String(formData.get("notes") ?? "").trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListMaintenanceRequestsQueryKey(complexId),
          });
          onSaved();
        },
      },
    );
  };

  const contractorName = request.assignedTo || "Contractor";
  const emailSubject = encodeURIComponent(
    `Maintenance Request: ${request.title} (Unit ${request.unitNumber ?? "-"})`,
  );
  const emailBody = encodeURIComponent(
    [
      `Complex request #${request.id}`,
      `Unit: ${request.unitNumber ?? "-"}`,
      `Category: ${request.category}`,
      `Priority: ${request.priority}`,
      `Status: ${request.status}`,
      "",
      "Issue description:",
      request.description || "No description provided.",
      "",
      "Internal notes:",
      request.notes || "No internal notes yet.",
    ].join("\n"),
  );
  const contractorMailto = contractorEmail.trim()
    ? `mailto:${contractorEmail.trim()}?subject=${emailSubject}&body=${emailBody}`
    : "";

  return (
    <div className="space-y-6 pt-2">
      <div className="grid gap-4 rounded-2xl border border-border bg-muted/20 p-5 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Request Summary
          </p>
          <h3 className="mt-2 text-xl font-display font-bold text-foreground">
            {request.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {request.description || "No description provided yet."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoPill label="Unit" value={`Unit ${request.unitNumber ?? "-"}`} />
          <InfoPill label="Category" value={request.category} />
          <InfoPill label="Priority" value={request.priority} />
          <InfoPill label="Opened" value={format(new Date(request.createdAt), "MMM d, yyyy")} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select
              name="status"
              defaultValue={request.status}
              className="w-full rounded-xl border border-border bg-background p-3"
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Assigned Contractor / Vendor</label>
            <div className="relative">
              <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="assignedTo"
                defaultValue={request.assignedTo}
                className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-3"
                placeholder="e.g. Apex Plumbing"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <label className="text-sm font-medium">Contractor Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={contractorEmail}
                onChange={(event) => setContractorEmail(event.target.value)}
                className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-3"
                placeholder="contractor@example.com"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Used to compose an email to the contractor from this request detail view.
            </p>
          </div>

          <div className="flex items-end">
            <a
              href={contractorMailto || undefined}
              onClick={(event) => {
                if (!contractorMailto) {
                  event.preventDefault();
                }
              }}
              className={`inline-flex h-12 items-center justify-center rounded-xl px-4 text-sm font-medium transition-all ${
                contractorMailto
                  ? "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80"
                  : "cursor-not-allowed border border-border bg-muted text-muted-foreground"
              }`}
            >
              Email Contractor
            </a>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Internal Notes</label>
          <div className="relative">
            <FileText className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
            <textarea
              name="notes"
              defaultValue={request.notes}
              rows={6}
              className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-3"
              placeholder="Capture contractor updates, access instructions, follow-ups, resident communication, and completion notes."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow transition-all hover:shadow-lg disabled:opacity-50"
          >
            {updateMutation.isPending ? "Saving..." : "Save Details"}
          </button>
        </div>
      </form>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
