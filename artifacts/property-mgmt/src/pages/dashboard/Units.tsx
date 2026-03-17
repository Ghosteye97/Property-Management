import { useState } from "react";
import { 
  useListUnits, 
  useCreateUnit, 
  useUpdateUnit,
  getListUnitsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Building2, Edit2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";

export function Units({ complexId }: { complexId: number }) {
  const { data: units, isLoading } = useListUnits(complexId);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);

  const filteredUnits = units?.filter(u => 
    u.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
    u.ownerName?.toLowerCase().includes(search.toLowerCase()) ||
    u.tenantName?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Units</h1>
          <p className="text-muted-foreground">Manage all units and occupants.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-medium shadow-md shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <Plus className="w-4 h-4" />
              Add Unit
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Unit</DialogTitle>
            </DialogHeader>
            <UnitForm complexId={complexId} onSuccess={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search units, owners, tenants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <th className="px-6 py-4 font-semibold tracking-wider">Unit</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Owner / Tenant</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Levy / Balance</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center animate-pulse"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>
              ) : filteredUnits.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-muted-foreground"><Building2 className="w-12 h-12 mx-auto mb-4 opacity-20" />No units found.</td></tr>
              ) : (
                filteredUnits.map((unit) => (
                  <tr key={unit.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">Unit {unit.unitNumber}</div>
                      <div className="text-xs text-muted-foreground">Floor {unit.floor || '-'} • {unit.size ? `${unit.size} sqm` : '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        unit.status === 'Occupied' ? 'bg-emerald-100 text-emerald-700' :
                        unit.status === 'Vacant' ? 'bg-slate-100 text-slate-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {unit.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">{unit.ownerName || <span className="text-muted-foreground italic">No owner</span>}</div>
                      {unit.tenantName && <div className="text-xs text-muted-foreground mt-0.5">T: {unit.tenantName}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{formatCurrency(unit.monthlyLevy || 0)}/mo</div>
                      <div className={`text-xs font-medium mt-0.5 ${(unit.outstandingBalance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        Bal: {formatCurrency(unit.outstandingBalance || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <button 
                            onClick={() => setSelectedUnit(unit)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors inline-flex opacity-0 group-hover:opacity-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Edit Unit {unit.unitNumber}</DialogTitle>
                          </DialogHeader>
                          {selectedUnit && <UnitForm complexId={complexId} unit={selectedUnit} onSuccess={() => {}} />}
                        </DialogContent>
                      </Dialog>
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

function UnitForm({ complexId, unit, onSuccess }: { complexId: number, unit?: any, onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const createMutation = useCreateUnit();
  const updateMutation = useUpdateUnit();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      unitNumber: formData.get("unitNumber") as string,
      floor: formData.get("floor") as string,
      size: Number(formData.get("size")),
      status: formData.get("status") as any,
      ownerName: formData.get("ownerName") as string,
      ownerEmail: formData.get("ownerEmail") as string,
      ownerPhone: formData.get("ownerPhone") as string,
      tenantName: formData.get("tenantName") as string,
      monthlyLevy: Number(formData.get("monthlyLevy")),
    };

    if (unit) {
      updateMutation.mutate(
        { complexId, unitId: unit.id, data },
        { onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUnitsQueryKey(complexId) });
          onSuccess();
        }}
      );
    } else {
      createMutation.mutate(
        { complexId, data },
        { onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUnitsQueryKey(complexId) });
          onSuccess();
        }}
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Unit Number *</label>
          <input required name="unitNumber" defaultValue={unit?.unitNumber} className="w-full p-2 border rounded-lg" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Status *</label>
          <select required name="status" defaultValue={unit?.status || "Vacant"} className="w-full p-2 border rounded-lg bg-background">
            <option value="Occupied">Occupied</option>
            <option value="Vacant">Vacant</option>
            <option value="Under Maintenance">Under Maintenance</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Floor</label>
          <input name="floor" defaultValue={unit?.floor} className="w-full p-2 border rounded-lg" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Size (sqm)</label>
          <input type="number" name="size" defaultValue={unit?.size} className="w-full p-2 border rounded-lg" />
        </div>
      </div>
      
      <div className="border-t pt-4 space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Owner Details</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <input name="ownerName" defaultValue={unit?.ownerName} className="w-full p-2 border rounded-lg" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input type="email" name="ownerEmail" defaultValue={unit?.ownerEmail} className="w-full p-2 border rounded-lg" />
          </div>
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Financial</h4>
        <div className="space-y-2">
          <label className="text-sm font-medium">Monthly Levy ($)</label>
          <input type="number" step="0.01" name="monthlyLevy" defaultValue={unit?.monthlyLevy} className="w-full p-2 border rounded-lg" />
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button 
          type="submit" 
          disabled={isPending}
          className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-medium shadow hover:shadow-lg transition-all disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Unit"}
        </button>
      </div>
    </form>
  );
}
