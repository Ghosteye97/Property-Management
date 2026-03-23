import { useRoute, Redirect } from "wouter";
import { Sidebar } from "@/components/layout/Sidebar";
import { Overview } from "./dashboard/Overview";
import { Units } from "./dashboard/Units";
import { Billing } from "./dashboard/Billing";
import { Maintenance } from "./dashboard/Maintenance";
import { Meetings } from "./dashboard/Meetings";
import { Inbox } from "./dashboard/Inbox";
import { Reports } from "./dashboard/Reports";
import { Settings } from "./dashboard/Settings";
import { Communications } from "./dashboard/Communications";
import { Documents } from "./dashboard/Documents";
import { useGetComplex } from "@workspace/api-client-react";
import { ComplexCurrencyProvider } from "@/lib/complex-currency";

export function ComplexDashboard() {
  const [match, params] = useRoute("/complexes/:id/:section?");
  
  if (!match || !params?.id) return null;
  
  const complexId = parseInt(params.id);
  const section = params.section || "overview";
  const { data: complex } = useGetComplex(complexId);

  return (
    <ComplexCurrencyProvider currencyCode={complex?.currencyCode}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <Sidebar complexId={params.id} complexType={complex?.type} />
        
        <main className="flex-1 h-full overflow-y-auto bg-slate-50/50 dark:bg-background">
          {section === "overview" && <Overview complexId={complexId} />}
          {section === "units" && <Units complexId={complexId} />}
          {section === "billing" && <Billing complexId={complexId} />}
          {section === "maintenance" && <Maintenance complexId={complexId} />}
          {section === "meetings" && <Meetings complexId={complexId} />}
          {section === "inbox" && <Inbox complexId={complexId} />}
          {section === "reports" && <Reports complexId={complexId} />}
          {section === "settings" && <Settings complexId={complexId} />}
          {section === "documents" && <Documents complexId={complexId} />}
          {section === "communications" && <Communications complexId={complexId} />}
        </main>
      </div>
    </ComplexCurrencyProvider>
  );
}
