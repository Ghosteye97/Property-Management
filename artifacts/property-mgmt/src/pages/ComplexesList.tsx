import { useState } from "react";
import { Link } from "wouter";
import { 
  useListComplexes, 
  useCreateComplex,
  getListComplexesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, ArrowRight, MapPin, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function ComplexesList() {
  const { data: complexes, isLoading } = useListComplexes();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      {/* Hero Header */}
      <div className="bg-primary pt-20 pb-32 px-6 relative overflow-hidden">
        {/* Abstract pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-primary-foreground">
              <h1 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight mb-3">Portfolio Overview</h1>
              <p className="text-primary-foreground/80 text-lg max-w-xl">Manage all your residential and commercial properties from a single, unified command center.</p>
            </div>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <button className="bg-white text-primary px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  New Complex
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="font-display">Add Property</DialogTitle>
                </DialogHeader>
                <CreateComplexForm onSuccess={() => setIsCreateOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-20 pb-20">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="bg-card h-64 rounded-2xl animate-pulse shadow-sm" />)}
          </div>
        ) : complexes?.length === 0 ? (
          <div className="bg-card rounded-2xl shadow-xl border border-border p-16 text-center max-w-2xl mx-auto">
            <Building2 className="w-20 h-20 text-muted-foreground/30 mx-auto mb-6" />
            <h3 className="text-2xl font-display font-bold text-foreground mb-2">No properties yet</h3>
            <p className="text-muted-foreground mb-8">Get started by creating your first residential complex or HOA.</p>
            <button onClick={() => setIsCreateOpen(true)} className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold shadow-md inline-flex items-center gap-2">
              <Plus className="w-5 h-5" /> Add Property
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {complexes?.map(complex => (
              <Link 
                key={complex.id}
                href={`/complexes/${complex.id}`}
                className="group block bg-card rounded-2xl shadow-md border border-border overflow-hidden hover:shadow-xl hover:border-primary/30 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <span className="bg-secondary text-secondary-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
                      {complex.type}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold font-display text-foreground mb-2 group-hover:text-primary transition-colors">{complex.name}</h3>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{complex.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4 shrink-0" />
                      <span>{complex.numberOfUnits} Units</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-muted/30 px-6 py-4 border-t border-border flex items-center justify-between text-sm font-semibold text-primary">
                  Manage Property
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateComplexForm({ onSuccess }: { onSuccess: () => void }) {
  const createMutation = useCreateComplex();
  const queryClient = useQueryClient();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      data: {
        name: formData.get("name") as string,
        type: formData.get("type") as any,
        address: formData.get("address") as string,
        numberOfUnits: Number(formData.get("numberOfUnits")),
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListComplexesQueryKey() });
        onSuccess();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Complex Name</label>
        <input required name="name" className="w-full p-2.5 border rounded-xl" placeholder="e.g. Sunset Villas" />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Type</label>
        <select required name="type" className="w-full p-2.5 border rounded-xl bg-background">
          <option value="Sectional Title">Sectional Title</option>
          <option value="HOA">Homeowners Association (HOA)</option>
          <option value="Residential">Standard Residential</option>
          <option value="Commercial">Commercial</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Address</label>
        <textarea required name="address" rows={2} className="w-full p-2.5 border rounded-xl resize-none" placeholder="Full physical address" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Number of Units</label>
        <input required type="number" name="numberOfUnits" className="w-full p-2.5 border rounded-xl" placeholder="e.g. 24" />
      </div>

      <div className="pt-4 flex justify-end">
        <button 
          type="submit" 
          disabled={createMutation.isPending}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium shadow hover:shadow-lg transition-all disabled:opacity-50"
        >
          {createMutation.isPending ? "Creating..." : "Create Property"}
        </button>
      </div>
    </form>
  );
}
