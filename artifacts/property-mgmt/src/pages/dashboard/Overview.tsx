import { 
  useGetComplexStats, 
  useGetComplex,
  useListMaintenanceRequests,
  useListInvoices 
} from "@workspace/api-client-react";
import { 
  Building, Users, Wallet, Wrench, ArrowUpRight, CheckCircle2, Clock 
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

export function Overview({ complexId }: { complexId: number }) {
  const { data: complex } = useGetComplex(complexId);
  const { data: stats, isLoading } = useGetComplexStats(complexId);
  const { data: maintenance } = useListMaintenanceRequests(complexId);
  const { data: invoices } = useListInvoices(complexId);

  if (isLoading || !stats) {
    return <div className="p-8 flex items-center justify-center animate-pulse"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div></div>;
  }

  const recentMaintenance = maintenance?.slice(0, 4) || [];
  const recentInvoices = invoices?.filter(i => i.status === 'Pending' || i.status === 'Overdue').slice(0, 4) || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here's what's happening at {complex?.name || 'the complex'}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Occupancy" 
          value={`${Math.round((stats.occupiedUnits / stats.totalUnits) * 100 || 0)}%`}
          subtitle={`${stats.occupiedUnits} of ${stats.totalUnits} units`}
          icon={Users}
          color="bg-blue-500/10 text-blue-600"
        />
        <StatsCard 
          title="Total Revenue" 
          value={formatCurrency(stats.totalRevenue)}
          subtitle={`${stats.collectionRate}% collection rate`}
          icon={Wallet}
          color="bg-emerald-500/10 text-emerald-600"
        />
        <StatsCard 
          title="Outstanding" 
          value={formatCurrency(stats.outstandingBalance)}
          subtitle="Requires attention"
          icon={ArrowUpRight}
          color="bg-rose-500/10 text-rose-600"
        />
        <StatsCard 
          title="Open Requests" 
          value={stats.openMaintenanceRequests.toString()}
          subtitle="Maintenance tickets"
          icon={Wrench}
          color="bg-amber-500/10 text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold font-display">Recent Maintenance</h2>
          </div>
          <div className="flex-1 overflow-auto pr-2 space-y-4">
            {recentMaintenance.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No open requests</div>
            ) : (
              recentMaintenance.map((req) => (
                <div key={req.id} className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/50 hover:bg-muted transition-colors">
                  <div className={`p-2 rounded-lg shrink-0 ${req.priority === 'Urgent' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{req.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">Unit {req.unitNumber} • {req.category}</p>
                  </div>
                  <div className="text-xs font-medium bg-background px-2 py-1 rounded-md shadow-sm border border-border">
                    {req.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold font-display">Pending Invoices</h2>
          </div>
          <div className="flex-1 overflow-auto pr-2 space-y-4">
            {recentInvoices.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 flex flex-col items-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mb-3" />
                <p>All invoices are paid up!</p>
              </div>
            ) : (
              recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/50 hover:bg-muted transition-colors">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">Unit {inv.unitNumber} • {inv.type}</p>
                    <p className="text-xs text-muted-foreground mt-1">Due {format(new Date(inv.dueDate), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-foreground">{formatCurrency(inv.amount)}</p>
                    <p className={`text-[10px] font-medium mt-1 ${inv.status === 'Overdue' ? 'text-rose-600' : 'text-amber-600'}`}>{inv.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, subtitle, icon: Icon, color }: any) {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-30 group-hover:scale-110 transition-all duration-300">
        <Icon className={`w-24 h-24 ${color.split(' ')[1]} -mr-8 -mt-8`} />
      </div>
      <div className="relative z-10">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-muted-foreground text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-display font-bold text-foreground tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-2 font-medium">{subtitle}</p>
      </div>
    </div>
  );
}
