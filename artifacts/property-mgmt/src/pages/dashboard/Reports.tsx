import { 
  useGetFinancialReport, 
  useGetOccupancyReport 
} from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/utils";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function Reports({ complexId }: { complexId: number }) {
  const { data: fin, isLoading: finLoading } = useGetFinancialReport(complexId);
  const { data: occ, isLoading: occLoading } = useGetOccupancyReport(complexId);

  if (finLoading || occLoading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (!fin || !occ) return <div className="p-8">Failed to load reports.</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Analytics & Reports</h1>
        <p className="text-muted-foreground mt-1">High-level financial and occupancy metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Financial Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-display font-semibold border-b pb-2">Financial Health</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card p-5 rounded-2xl border shadow-sm">
              <p className="text-sm text-muted-foreground font-medium">Total Collected</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">{formatCurrency(fin.totalCollected)}</p>
            </div>
            <div className="bg-card p-5 rounded-2xl border shadow-sm">
              <p className="text-sm text-muted-foreground font-medium">Outstanding</p>
              <p className="text-2xl font-bold mt-1 text-rose-600">{formatCurrency(fin.totalOutstanding)}</p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl border shadow-sm h-[300px] flex flex-col">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Revenue Trend</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fin.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} tick={{fontSize: 12, fill: '#6b7280'}} />
                  <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Occupancy Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-display font-semibold border-b pb-2">Occupancy Status</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card p-5 rounded-2xl border shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Occupancy Rate</p>
                <p className="text-2xl font-bold mt-1 text-blue-600">{Math.round(occ.occupancyRate)}%</p>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-blue-100 flex items-center justify-center font-bold text-xs text-blue-600">
                {occ.occupiedUnits}/{occ.totalUnits}
              </div>
            </div>
            <div className="bg-card p-5 rounded-2xl border shadow-sm">
              <p className="text-sm text-muted-foreground font-medium">Vacant Units</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{occ.vacantUnits}</p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl border shadow-sm h-[300px] flex flex-col items-center">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 self-start">Unit Distribution</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={occ.unitsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {occ.unitsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
