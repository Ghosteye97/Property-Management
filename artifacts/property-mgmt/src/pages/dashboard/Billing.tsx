import { useState } from "react";
import { 
  useListInvoices, 
  useUpdateInvoice,
  useBulkBillingRun,
  useListUnits,
  getListInvoicesQueryKey,
  useCreateInvoice
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Receipt, Plus, Search, CheckCircle, Clock, Copy } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";

export function Billing({ complexId }: { complexId: number }) {
  const { data: invoices, isLoading } = useListInvoices(complexId);
  const { data: units } = useListUnits(complexId);
  const updateInvoice = useUpdateInvoice();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("All");
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredInvoices = invoices?.filter(i => filter === "All" || i.status === filter) || [];

  const handleMarkPaid = (id: number) => {
    updateInvoice.mutate(
      { complexId, invoiceId: id, data: { status: "Paid", paidDate: new Date().toISOString() } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey(complexId) }) }
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Billing & Invoices</h1>
          <p className="text-muted-foreground">Manage levies, special assessments, and payments.</p>
        </div>
        
        <div className="flex gap-3">
          <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 bg-secondary text-secondary-foreground border border-border px-4 py-2.5 rounded-xl font-medium shadow-sm hover:bg-secondary/80 transition-all">
                <Copy className="w-4 h-4" />
                Bulk Run
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Run Bulk Levy Billing</DialogTitle></DialogHeader>
              <BulkBillingForm complexId={complexId} onSuccess={() => setIsBulkOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium shadow-md shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <Plus className="w-4 h-4" />
                New Invoice
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Custom Invoice</DialogTitle></DialogHeader>
              <CreateInvoiceForm complexId={complexId} units={units || []} onSuccess={() => setIsCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex gap-2">
          {["All", "Pending", "Overdue", "Paid"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-background text-muted-foreground border border-border hover:bg-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <th className="px-6 py-4 font-semibold tracking-wider">Unit / Owner</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Details</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Amount</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center animate-pulse"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-muted-foreground"><Receipt className="w-12 h-12 mx-auto mb-4 opacity-20" />No invoices found.</td></tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">Unit {inv.unitNumber}</div>
                      <div className="text-sm text-muted-foreground">{inv.ownerName || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">{inv.type}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Due {format(new Date(inv.dueDate), 'MMM d, yyyy')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold">{formatCurrency(inv.amount)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                        inv.status === 'Overdue' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {inv.status === 'Paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {inv.status !== 'Paid' && <Clock className="w-3 h-3 mr-1" />}
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {inv.status !== 'Paid' && (
                        <button 
                          onClick={() => handleMarkPaid(inv.id)}
                          disabled={updateInvoice.isPending}
                          className="text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BulkBillingForm({ complexId, onSuccess }: { complexId: number, onSuccess: () => void }) {
  const bulkRun = useBulkBillingRun();
  const queryClient = useQueryClient();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    bulkRun.mutate({
      complexId,
      data: {
        type: formData.get("type") as any,
        amount: Number(formData.get("amount")),
        dueDate: formData.get("dueDate") as string,
        description: formData.get("description") as string,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey(complexId) });
        onSuccess();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <p className="text-sm text-muted-foreground mb-4">This will generate identical invoices for ALL occupied units in the complex.</p>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Type</label>
        <select required name="type" className="w-full p-2.5 border rounded-xl bg-background focus:ring-2 focus:ring-primary/20">
          <option value="Levy">Monthly Levy</option>
          <option value="Special Assessment">Special Assessment</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Amount per Unit ($)</label>
        <input required type="number" step="0.01" name="amount" className="w-full p-2.5 border rounded-xl" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Due Date</label>
        <input required type="date" name="dueDate" className="w-full p-2.5 border rounded-xl" />
      </div>

      <div className="pt-4 flex justify-end">
        <button 
          type="submit" 
          disabled={bulkRun.isPending}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium shadow hover:shadow-lg transition-all disabled:opacity-50"
        >
          {bulkRun.isPending ? "Processing..." : "Run Bulk Billing"}
        </button>
      </div>
    </form>
  );
}

function CreateInvoiceForm({ complexId, units, onSuccess }: { complexId: number, units: any[], onSuccess: () => void }) {
  const createInvoice = useCreateInvoice();
  const queryClient = useQueryClient();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createInvoice.mutate({
      complexId,
      data: {
        unitId: Number(formData.get("unitId")),
        type: formData.get("type") as any,
        amount: Number(formData.get("amount")),
        dueDate: formData.get("dueDate") as string,
        description: formData.get("description") as string,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey(complexId) });
        onSuccess();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Unit</label>
        <select required name="unitId" className="w-full p-2.5 border rounded-xl bg-background">
          <option value="">-- Choose Unit --</option>
          {units.map(u => (
            <option key={u.id} value={u.id}>Unit {u.unitNumber} ({u.ownerName || 'No owner'})</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Type</label>
          <select required name="type" className="w-full p-2.5 border rounded-xl bg-background">
            <option value="Levy">Levy</option>
            <option value="Fine">Fine</option>
            <option value="Special Assessment">Special Assessment</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Amount ($)</label>
          <input required type="number" step="0.01" name="amount" className="w-full p-2.5 border rounded-xl" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Due Date</label>
        <input required type="date" name="dueDate" className="w-full p-2.5 border rounded-xl" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description (Optional)</label>
        <input name="description" className="w-full p-2.5 border rounded-xl" placeholder="e.g. Noise violation fine" />
      </div>

      <div className="pt-4 flex justify-end">
        <button 
          type="submit" 
          disabled={createInvoice.isPending}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium shadow hover:shadow-lg transition-all disabled:opacity-50"
        >
          {createInvoice.isPending ? "Creating..." : "Create Invoice"}
        </button>
      </div>
    </form>
  );
}
