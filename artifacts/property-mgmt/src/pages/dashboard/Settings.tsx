import { 
  useGetComplex,
  useUpdateComplex,
  getGetComplexQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Settings({ complexId }: { complexId: number }) {
  const { data: complex, isLoading } = useGetComplex(complexId);
  const updateMutation = useUpdateComplex();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading || !complex) return null;

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
    </div>
  );
}
