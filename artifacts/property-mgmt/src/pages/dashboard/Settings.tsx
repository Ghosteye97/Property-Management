import { 
  type Unit,
  useGetComplex,
  useUpdateComplex,
  getGetComplexQueryKey,
  useListUnits,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Save, Coins, Bell, Shield, Plug, FileBarChart2, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CURRENCY_OPTIONS, getCurrencyLabel, getCurrencySymbol } from "@/lib/currency";

export function Settings({ complexId }: { complexId: number }) {
  const { data: complex, isLoading } = useGetComplex(complexId);
  const { data: units } = useListUnits(complexId);
  const updateMutation = useUpdateComplex();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading || !complex) return null;

  const trustees = (units || []).filter((unit: Unit) => unit.isTrustee);
  const isSectionalTitle = complex.type === "Sectional Title";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      complexId,
      data: {
        name: formData.get("name") as string,
        type: formData.get("type") as any,
        address: formData.get("address") as string,
        numberOfUnits: Number(formData.get("numberOfUnits")),
        currencyCode: formData.get("currencyCode") as string,
        registrationNumber: formData.get("registrationNumber") as string,
        agentName: formData.get("agentName") as string,
        agentEmail: formData.get("agentEmail") as string,
        agentPhone: formData.get("agentPhone") as string,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetComplexQueryKey(complexId) });
        toast({ title: "Settings Saved", description: "Complex details updated successfully." });
      }
    });
  };

  return (
    <div className="p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Building2 className="w-8 h-8 text-primary" /> Complex Settings
        </h1>
        <p className="text-muted-foreground mt-2">Manage fundamental details and agent information.</p>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="divide-y divide-border">
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold font-display">General Information</h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Complex Name *</label>
                <input required name="name" defaultValue={complex.name} className="w-full p-3 border rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Scheme Type *</label>
                <select required name="type" defaultValue={complex.type} className="w-full p-3 border rounded-xl bg-background">
                  <option value="Sectional Title">Sectional Title</option>
                  <option value="HOA">HOA</option>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Physical Address *</label>
              <textarea required name="address" defaultValue={complex.address} rows={3} className="w-full p-3 border rounded-xl resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Units</label>
                <input required type="number" name="numberOfUnits" defaultValue={complex.numberOfUnits} className="w-full p-3 border rounded-xl bg-muted/50 text-muted-foreground" readOnly />
                <p className="text-xs text-muted-foreground">Managed automatically via Units tab.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Registration Number</label>
                <input name="registrationNumber" defaultValue={complex.registrationNumber} className="w-full p-3 border rounded-xl" />
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 bg-muted/10">
            <h2 className="text-lg font-semibold font-display">Regional Settings</h2>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Display Currency</label>
                <select
                  name="currencyCode"
                  defaultValue={complex.currencyCode || "ZAR"}
                  className="w-full p-3 border rounded-xl bg-background"
                >
                  {CURRENCY_OPTIONS.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label} ({option.symbol})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Applied to levies, invoices, balances, and reports for this complex.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Currency</label>
                <div className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm">
                  {getCurrencyLabel(complex.currencyCode || "ZAR")} ({getCurrencySymbol(complex.currencyCode || "ZAR")})
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 bg-muted/10">
            <h2 className="text-lg font-semibold font-display">Managing Agent Details</h2>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Agent/Company Name</label>
              <input name="agentName" defaultValue={complex.agentName} className="w-full p-3 border rounded-xl" />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Support Email</label>
                <input type="email" name="agentEmail" defaultValue={complex.agentEmail} className="w-full p-3 border rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Number</label>
                <input name="agentPhone" defaultValue={complex.agentPhone} className="w-full p-3 border rounded-xl" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-muted/30 flex justify-end">
            <button 
              type="submit" 
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold shadow hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8">
        {isSectionalTitle && (
          <div className="mb-8 rounded-2xl border bg-card p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold font-display text-foreground">Trustee Register</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Trustees are captured at the unit-owner level and surfaced here for sectional title governance.
              </p>
            </div>

            {trustees.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                No trustees have been marked yet. Open a unit and enable the trustee checkbox to build the register.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="pb-3 pr-4 font-semibold">Unit</th>
                      <th className="pb-3 pr-4 font-semibold">Owner</th>
                      <th className="pb-3 pr-4 font-semibold">Role</th>
                      <th className="pb-3 pr-4 font-semibold">Start Date</th>
                      <th className="pb-3 font-semibold">Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trustees.map((trustee: Unit) => (
                      <tr key={trustee.id} className="border-b border-border/60 last:border-0">
                        <td className="py-3 pr-4 font-medium">Unit {trustee.unitNumber}</td>
                        <td className="py-3 pr-4">{trustee.ownerName || "Owner not set"}</td>
                        <td className="py-3 pr-4">{trustee.trusteeRole || "Trustee"}</td>
                        <td className="py-3 pr-4">{trustee.trusteeStartDate || "-"}</td>
                        <td className="py-3">{trustee.ownerEmail || trustee.ownerPhone || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <h2 className="text-lg font-semibold font-display text-foreground mb-1">Coming Soon</h2>
        <p className="text-sm text-muted-foreground mb-4">Features planned for future releases of the Settings module.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: Coins, label: "Currency & Regional Settings", desc: "Display currency is now configurable per complex from the settings above." },
            { icon: Bell, label: "Notification Preferences", desc: "Configure email and in-app alerts for overdue invoices, maintenance updates, and more." },
            { icon: Plug, label: "Integrations", desc: "Connect QuickBooks Online, Pastel Partner, and payment gateways." },
            { icon: FileBarChart2, label: "Report Templates", desc: "Customise and schedule automated financial and occupancy reports." },
            { icon: Shield, label: "User Roles & Permissions", desc: "Manage staff access: Admin, Finance, Support, Owner roles." },
            { icon: Palette, label: "Branding", desc: "Upload your company logo and customise the portal colour theme." },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex gap-4 p-4 bg-card border rounded-xl opacity-70">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
