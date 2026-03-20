import {
  useGetFinancialReport,
  useGetOccupancyReport,
} from "@workspace/api-client-react";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { useComplexCurrency } from "@/lib/complex-currency";

const COLORS = ["#2563eb", "#f59e0b", "#10b981", "#ef4444"];

export function Reports({ complexId }: { complexId: number }) {
  const { data: fin, isLoading: finLoading } = useGetFinancialReport(complexId);
  const { data: occ, isLoading: occLoading } = useGetOccupancyReport(complexId);
  const currencyCode = useComplexCurrency();

  if (finLoading || occLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!fin || !occ) {
    return <div className="p-8">Failed to load reports.</div>;
  }

  const monthlyRevenue = Array.isArray(fin.monthlyRevenue) ? fin.monthlyRevenue : [];
  const unitsByStatus = Array.isArray(occ.unitsByStatus) ? occ.unitsByStatus : [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Analytics & Reports</h1>
        <p className="text-muted-foreground mt-1">High-level financial and occupancy metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-xl font-display font-semibold border-b pb-2">Financial Health</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card p-5 rounded-2xl border shadow-sm">
              <p className="text-sm text-muted-foreground font-medium">Total Collected</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">
                {formatCurrency(fin.totalCollected ?? 0, currencyCode)}
              </p>
            </div>

            <div className="bg-card p-5 rounded-2xl border shadow-sm">
              <p className="text-sm text-muted-foreground font-medium">Outstanding</p>
              <p className="text-2xl font-bold mt-1 text-rose-600">
                {formatCurrency(fin.totalOutstanding ?? 0, currencyCode)}
              </p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl border shadow-sm h-[300px] flex flex-col">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Revenue Trend</h3>

            <div className="flex-1 min-h-0">
              {monthlyRevenue.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">
                  No revenue data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-display font-semibold border-b pb-2">Occupancy Status</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card p-5 rounded-2xl border shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Occupancy Rate</p>
                <p className="text-2xl font-bold mt-1 text-blue-600">
                  {Math.round(occ.occupancyRate ?? 0)}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-blue-100 flex items-center justify-center font-bold text-xs text-blue-600">
                {(occ.occupiedUnits ?? 0)}/{(occ.totalUnits ?? 0)}
              </div>
            </div>

            <div className="bg-card p-5 rounded-2xl border shadow-sm">
              <p className="text-sm text-muted-foreground font-medium">Vacant Units</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">
                {occ.vacantUnits ?? 0}
              </p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl border shadow-sm h-[300px] flex flex-col items-center">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 self-start">
              Unit Distribution
            </h3>

            <div className="flex-1 w-full min-h-0">
              {unitsByStatus.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">
                  No occupancy data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={unitsByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                    >
                      {unitsByStatus.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
