import { Link, useRoute } from "wouter";
import { 
  Building2, Users, Receipt, Wrench, 
  FileText, Megaphone, BarChart3, Settings, CalendarDays, Inbox,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  complexId: string;
  complexType?: string;
}

export function Sidebar({ complexId, complexType }: SidebarProps) {
  const [match, params] = useRoute("/complexes/:id/:section?");
  const currentSection = params?.section || "overview";
  const isSectionalTitle = complexType === "Sectional Title";

  const navItems = [
    { id: "overview", label: "Overview", icon: Building2 },
    { id: "units", label: "Units", icon: Users },
    { id: "billing", label: "Billing", icon: Receipt },
    { id: "maintenance", label: "Maintenance", icon: Wrench },
    ...(isSectionalTitle ? [{ id: "meetings", label: "Meetings", icon: CalendarDays }] : []),
    { id: "inbox", label: "Inbox", icon: Inbox },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "communications", label: "Communications", icon: Megaphone },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="w-64 bg-sidebar flex-shrink-0 flex flex-col h-full border-r border-sidebar-border transition-all duration-300">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border/50">
        <Link 
          href="/" 
          className="flex items-center text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium text-sm">Back to Complexes</span>
        </Link>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentSection === item.id;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.id} 
                href={`/complexes/${complexId}${item.id === 'overview' ? '' : `/${item.id}`}`}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-black/20" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 mr-3 transition-colors",
                  isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground"
                )} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-sidebar-border/50">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/50 border border-sidebar-border">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold font-display shadow-inner">
            PM
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-sidebar-foreground">PropManager</span>
            <span className="text-xs text-sidebar-foreground/60">Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
