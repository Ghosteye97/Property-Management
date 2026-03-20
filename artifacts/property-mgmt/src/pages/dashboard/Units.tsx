import { useState } from "react";
import { 
  type Unit,
  useListUnits, 
  useCreateUnit, 
  useUpdateUnit,
  getListUnitsQueryKey,
  useGetComplex,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Building2, Edit2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useComplexCurrency } from "@/lib/complex-currency";

export function Units({ complexId }: { complexId: number }) {
  const { data: units, isLoading } = useListUnits(complexId);
  const { data: complex } = useGetComplex(complexId);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const currencyCode = useComplexCurrency();
  const isSectionalTitle = complex?.type === "Sectional Title";

  const handleEditDialogChange = (open: boolean) => {
    if (!open) {
      setSelectedUnit(null);
    }
  };

  const filteredUnits = units?.filter((u) => 
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
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[920px]">
              <DialogHeader>
                <DialogTitle>Add New Unit</DialogTitle>
              </DialogHeader>
            <UnitForm
              complexId={complexId}
              isSectionalTitle={isSectionalTitle}
              onSuccess={() => setIsCreateOpen(false)}
            />
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
                      <div className="text-sm font-medium flex items-center gap-2">
                        {unit.ownerName || <span className="text-muted-foreground italic">No owner</span>}
                        {unit.isTrustee && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                            {unit.trusteeRole || "Trustee"}
                          </span>
                        )}
                      </div>
                      {unit.tenantName && <div className="text-xs text-muted-foreground mt-0.5">T: {unit.tenantName}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{formatCurrency(unit.monthlyLevy || 0, currencyCode)}/mo</div>
                      <div className={`text-xs font-medium mt-0.5 ${(unit.outstandingBalance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        Bal: {formatCurrency(unit.outstandingBalance || 0, currencyCode)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Dialog
                        open={selectedUnit?.id === unit.id}
                        onOpenChange={handleEditDialogChange}
                      >
                        <DialogTrigger asChild>
                          <button 
                            onClick={() => setSelectedUnit(unit)}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors inline-flex opacity-0 group-hover:opacity-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[920px]">
                          <DialogHeader>
                            <DialogTitle>Edit Unit {unit.unitNumber}</DialogTitle>
                          </DialogHeader>
                          {selectedUnit?.id === unit.id && (
                            <UnitForm
                              complexId={complexId}
                              isSectionalTitle={isSectionalTitle}
                              unit={selectedUnit}
                              onSuccess={() => setSelectedUnit(null)}
                            />
                          )}
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

function UnitForm({
  complexId,
  unit,
  isSectionalTitle,
  onSuccess,
}: {
  complexId: number;
  unit?: Unit;
  isSectionalTitle: boolean;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const createMutation = useCreateUnit();
  const updateMutation = useUpdateUnit();

  const getOptionalString = (formData: FormData, key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value === "" ? undefined : value;
  };

  const getOptionalNumber = (formData: FormData, key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value === "" ? undefined : Number(value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      unitNumber: String(formData.get("unitNumber") ?? "").trim(),
      floor: getOptionalString(formData, "floor"),
      size: getOptionalNumber(formData, "size"),
      status: formData.get("status") as any,
      ownerName: getOptionalString(formData, "ownerName"),
      ownerEmail: getOptionalString(formData, "ownerEmail"),
      ownerPhone: getOptionalString(formData, "ownerPhone"),
      tenantName: getOptionalString(formData, "tenantName"),
      tenantEmail: getOptionalString(formData, "tenantEmail"),
      tenantPhone: getOptionalString(formData, "tenantPhone"),
      isTrustee: isSectionalTitle ? formData.get("isTrustee") === "on" : false,
      trusteeRole: isSectionalTitle ? getOptionalString(formData, "trusteeRole") : undefined,
      trusteeStartDate: isSectionalTitle ? getOptionalString(formData, "trusteeStartDate") : undefined,
      trusteeNotes: isSectionalTitle ? getOptionalString(formData, "trusteeNotes") : undefined,
      monthlyLevy: getOptionalNumber(formData, "monthlyLevy"),
      notes: getOptionalString(formData, "notes"),
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
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-border bg-muted/10 p-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Unit Details</h4>
          <div className="grid gap-4 sm:grid-cols-2">
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
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-muted/10 p-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Owner Details</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <input name="ownerName" defaultValue={unit?.ownerName} className="w-full p-2 border rounded-lg" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input type="email" name="ownerEmail" defaultValue={unit?.ownerEmail} className="w-full p-2 border rounded-lg" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Phone</label>
              <input name="ownerPhone" defaultValue={unit?.ownerPhone} className="w-full p-2 border rounded-lg" />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-muted/10 p-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tenant Details</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <input name="tenantName" defaultValue={unit?.tenantName} className="w-full p-2 border rounded-lg" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input type="email" name="tenantEmail" defaultValue={unit?.tenantEmail} className="w-full p-2 border rounded-lg" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Phone</label>
              <input name="tenantPhone" defaultValue={unit?.tenantPhone} className="w-full p-2 border rounded-lg" />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-muted/10 p-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Financial & Notes</h4>
          <div className="space-y-2">
            <label className="text-sm font-medium">Monthly Levy</label>
            <input type="number" step="0.01" name="monthlyLevy" defaultValue={unit?.monthlyLevy} className="w-full p-2 border rounded-lg" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">General Notes</label>
            <textarea name="notes" rows={5} defaultValue={unit?.notes} className="w-full rounded-lg border p-2 resize-none" />
          </div>
        </section>

        {isSectionalTitle && (
          <section className="space-y-4 rounded-xl border border-border bg-muted/10 p-4 lg:col-span-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Sectional Title Governance</h4>
            <label className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 text-sm">
              <input type="checkbox" name="isTrustee" defaultChecked={Boolean(unit?.isTrustee)} className="h-4 w-4" />
              This owner currently serves as a trustee for the body corporate
            </label>
            <div className="grid gap-4 lg:grid-cols-[0.9fr_0.7fr_1.4fr]">
              <div className="space-y-2">
                <label className="text-sm font-medium">Trustee Role</label>
                <select name="trusteeRole" defaultValue={unit?.trusteeRole || ""} className="w-full p-2 border rounded-lg bg-background">
                  <option value="">Select role</option>
                  <option value="Chairperson">Chairperson</option>
                  <option value="Secretary">Secretary</option>
                  <option value="Treasurer">Treasurer</option>
                  <option value="Trustee">Trustee</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <input type="date" name="trusteeStartDate" defaultValue={unit?.trusteeStartDate} className="w-full p-2 border rounded-lg" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Trustee Notes</label>
                <textarea
                  name="trusteeNotes"
                  rows={3}
                  defaultValue={unit?.trusteeNotes}
                  className="w-full rounded-lg border p-2 resize-none"
                  placeholder="Election notes, term comments, alternate contact details, or committee remarks."
                />
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="sticky bottom-0 flex justify-end border-t border-border bg-background/95 pt-4 backdrop-blur">
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
