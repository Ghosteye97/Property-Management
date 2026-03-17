import { useState } from "react";
import { 
  useListMaintenanceRequests, 
  useCreateMaintenanceRequest,
  useUpdateMaintenanceRequest,
  useListUnits,
  getListMaintenanceRequestsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Wrench, Plus, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";

export function Maintenance({ complexId }: { complexId: number }) {
  const { data: requests, isLoading } = useListMaintenanceRequests(complexId);
  const { data: units } = useListUnits(complexId);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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
                  <div key={req.id} className="bg-card rounded-xl p-4 shadow-sm border border-border hover:shadow-md transition-all group">
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
                      
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        {status === 'Open' && (
                          <button onClick={() => handleStatusChange(req.id, 'In Progress')} className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200">Start</button>
                        )}
                        {status === 'In Progress' && (
                          <button onClick={() => handleStatusChange(req.id, 'Completed')} className="text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200">Done</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
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
