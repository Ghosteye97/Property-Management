import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Building2, ShieldCheck, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TenantSummary = {
  id: number;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  complexesCount: number;
  usersCount: number;
};

export function AdminDashboard({
  onLogout,
}: {
  onLogout: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const tenantsQuery = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () =>
      customFetch<TenantSummary[]>("/api/admin/tenants", {
        method: "GET",
        responseType: "json",
      }),
  });

  const createTenant = useMutation({
    mutationFn: (payload: {
      tenantName: string;
      slug: string;
      adminFullName: string;
      adminEmail: string;
      adminPassword: string;
    }) =>
      customFetch("/api/admin/tenants", {
        method: "POST",
        responseType: "json",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      toast({
        title: "Tenant Created",
        description: "The tenant profile and first tenant admin user were created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Unable to Create Tenant",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    createTenant.mutate({
      tenantName: String(formData.get("tenantName") ?? "").trim(),
      slug: String(formData.get("slug") ?? "").trim(),
      adminFullName: String(formData.get("adminFullName") ?? "").trim(),
      adminEmail: String(formData.get("adminEmail") ?? "").trim(),
      adminPassword: String(formData.get("adminPassword") ?? ""),
    });
    event.currentTarget.reset();
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Platform Admin
            </div>
            <h1 className="mt-3 text-4xl font-display font-bold text-foreground">
              Tenant Administration
            </h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Create and manage tenant profiles for the multi-tenant platform. Each tenant gets its own complexes, users, and operational workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="self-start rounded-xl border px-4 py-2 font-medium text-foreground transition-colors hover:bg-muted"
          >
            Sign Out
          </button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold font-display">Create Tenant</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This creates the tenant profile and its first tenant admin user.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <Field label="Tenant Name">
                <input required name="tenantName" className="w-full rounded-xl border p-3" placeholder="Acme Property Management" />
              </Field>
              <Field label="Tenant Slug">
                <input required name="slug" className="w-full rounded-xl border p-3" placeholder="acme-property-management" />
              </Field>
              <Field label="First Admin Full Name">
                <input required name="adminFullName" className="w-full rounded-xl border p-3" placeholder="Jane Portfolio Lead" />
              </Field>
              <Field label="First Admin Email">
                <input required type="email" name="adminEmail" className="w-full rounded-xl border p-3" placeholder="jane@acme.com" />
              </Field>
              <Field label="First Admin Password">
                <input required type="password" minLength={8} name="adminPassword" className="w-full rounded-xl border p-3" />
              </Field>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={createTenant.isPending}
                  className="rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground shadow transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
                >
                  {createTenant.isPending ? "Creating..." : "Create Tenant"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold font-display">Tenant Profiles</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Each tenant becomes an isolated workspace for complexes and staff users.
            </p>

            <div className="mt-5 space-y-4">
              {tenantsQuery.isLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : !tenantsQuery.data?.length ? (
                <div className="rounded-xl border border-dashed bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
                  No tenants created yet.
                </div>
              ) : (
                tenantsQuery.data.map((tenant) => (
                  <div key={tenant.id} className="rounded-2xl border bg-muted/10 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-foreground">{tenant.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{tenant.slug}</p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        {tenant.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <Stat label="Complexes" value={tenant.complexesCount} icon={Building2} />
                      <Stat label="Users" value={tenant.usersCount} icon={Users} />
                      <Stat label="Tenant" value={tenant.id} icon={ShieldCheck} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}
