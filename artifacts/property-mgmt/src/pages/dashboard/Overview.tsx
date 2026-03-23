import { Link } from "wouter";
import {
  useGetComplex,
  useGetComplexStats,
  useListCommunications,
  useListDocuments,
  useListInvoices,
  useListMaintenanceRequests,
  useListMeetings,
  useListUnits,
} from "@workspace/api-client-react";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  Mail,
  Megaphone,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { format } from "date-fns";
import { useComplexCurrency } from "@/lib/complex-currency";

type ActionItem = {
  title: string;
  detail: string;
  href: string;
  tone: "danger" | "warning" | "info";
};

type TimelineItem = {
  title: string;
  detail: string;
  href: string;
  tone: "danger" | "warning" | "info";
};

type RecentItem = {
  title: string;
  detail: string;
  meta: string;
  href: string;
};

export function Overview({ complexId }: { complexId: number }) {
  const { data: complex } = useGetComplex(complexId);
  const { data: stats, isLoading } = useGetComplexStats(complexId);
  const { data: units } = useListUnits(complexId);
  const { data: maintenance } = useListMaintenanceRequests(complexId);
  const { data: invoices } = useListInvoices(complexId);
  const { data: meetings } = useListMeetings(complexId);
  const { data: communications } = useListCommunications(complexId);
  const { data: documents } = useListDocuments(complexId);
  const currencyCode = useComplexCurrency();

  const safeStats = {
    occupiedUnits: stats?.occupiedUnits ?? 0,
    totalUnits: stats?.totalUnits ?? 0,
    totalRevenue: stats?.totalRevenue ?? 0,
    collectionRate: stats?.collectionRate ?? 0,
    outstandingBalance: stats?.outstandingBalance ?? 0,
    openMaintenanceRequests: stats?.openMaintenanceRequests ?? 0,
  };

  if (isLoading || !stats) {
    return (
      <div className="p-8 flex items-center justify-center animate-pulse">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const allUnits = units || [];
  const allMaintenance = maintenance || [];
  const allInvoices = invoices || [];
  const allMeetings = meetings || [];
  const allCommunications = communications || [];
  const allDocuments = documents || [];

  const now = new Date();
  const todayEnd = endOfDay(now);
  const weekEnd = addDays(now, 7);
  const monthEnd = addDays(now, 30);

  const overdueInvoices = allInvoices.filter((invoice) => invoice.status === "Overdue");
  const pendingInvoices = allInvoices.filter((invoice) => invoice.status === "Pending");
  const urgentMaintenance = allMaintenance.filter(
    (request) => request.priority === "Urgent" && request.status !== "Completed",
  );
  const unassignedMaintenance = allMaintenance.filter(
    (request) => request.status !== "Completed" && !request.assignedTo,
  );
  const missingOwnerEmails = allUnits.filter((unit) => !unit.ownerEmail);
  const trusteesWithoutEmails = allUnits.filter((unit) => unit.isTrustee && !unit.ownerEmail);
  const scheduledMeetings = allMeetings.filter((meeting) => meeting.status === "Scheduled");
  const meetingsWithoutNotice = scheduledMeetings.filter((meeting) => {
    const meetingTitle = meeting.title.toLowerCase();
    return !allCommunications.some((communication) =>
      communication.subject.toLowerCase().includes(meetingTitle),
    );
  });
  const unsignedRecentCommunications = allCommunications
    .slice()
    .reverse()
    .slice(0, 5);

  const occupancy =
    safeStats.totalUnits > 0
      ? Math.round((safeStats.occupiedUnits / safeStats.totalUnits) * 100)
      : 0;

  const actionItems: ActionItem[] = [];

  if (overdueInvoices.length > 0) {
    actionItems.push({
      title: `${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? "" : "s"} need follow-up`,
      detail: `${formatCurrency(
        overdueInvoices.reduce((sum, invoice) => sum + invoice.amount, 0),
        currencyCode,
      )} is already overdue.`,
      href: `/complexes/${complexId}/billing`,
      tone: "danger",
    });
  }

  if (urgentMaintenance.length > 0) {
    actionItems.push({
      title: `${urgentMaintenance.length} urgent maintenance request${urgentMaintenance.length === 1 ? "" : "s"} still open`,
      detail: "Prioritise these before they become resident escalations.",
      href: `/complexes/${complexId}/maintenance`,
      tone: "danger",
    });
  }

  if (meetingsWithoutNotice.length > 0) {
    actionItems.push({
      title: `${meetingsWithoutNotice.length} scheduled meeting${meetingsWithoutNotice.length === 1 ? "" : "s"} need a notice`,
      detail: "Prepare owner or trustee communication from the Meetings module.",
      href: `/complexes/${complexId}/meetings`,
      tone: "warning",
    });
  }

  if (missingOwnerEmails.length > 0) {
    actionItems.push({
      title: `${missingOwnerEmails.length} unit${missingOwnerEmails.length === 1 ? "" : "s"} are missing owner email`,
      detail: "These records block owner notices and meeting readiness.",
      href: `/complexes/${complexId}/units`,
      tone: "warning",
    });
  }

  if (actionItems.length === 0) {
    actionItems.push({
      title: "No critical actions are blocking you today",
      detail: "Use the quick actions below to move billing, meetings, or maintenance forward.",
      href: `/complexes/${complexId}/billing`,
      tone: "info",
    });
  }

  const todayItems: TimelineItem[] = [];
  if (overdueInvoices.length > 0) {
    todayItems.push({
      title: "Review overdue levy follow-ups",
      detail: `${overdueInvoices.length} overdue invoices are already in arrears.`,
      href: `/complexes/${complexId}/billing`,
      tone: "danger",
    });
  }
  if (urgentMaintenance.length > 0) {
    todayItems.push({
      title: "Dispatch urgent maintenance",
      detail: `${urgentMaintenance.length} urgent request${urgentMaintenance.length === 1 ? "" : "s"} still need attention.`,
      href: `/complexes/${complexId}/maintenance`,
      tone: "danger",
    });
  }
  if (todayItems.length === 0) {
    todayItems.push({
      title: "No same-day fire drills detected",
      detail: "You can focus on planned work and follow-ups today.",
      href: `/complexes/${complexId}/maintenance`,
      tone: "info",
    });
  }

  const weekItems: TimelineItem[] = [];
  const thisWeekMeetings = scheduledMeetings.filter((meeting) => {
    const when = new Date(meeting.scheduledAt);
    return when >= todayEnd && when <= weekEnd;
  });
  if (thisWeekMeetings.length > 0) {
    weekItems.push({
      title: `${thisWeekMeetings.length} meeting${thisWeekMeetings.length === 1 ? "" : "s"} coming up this week`,
      detail: "Check notices, agenda packs, and trustee / owner readiness.",
      href: `/complexes/${complexId}/meetings`,
      tone: "warning",
    });
  }
  if (unassignedMaintenance.length > 0) {
    weekItems.push({
      title: `${unassignedMaintenance.length} maintenance item${unassignedMaintenance.length === 1 ? "" : "s"} still unassigned`,
      detail: "Allocate contractors or internal responsibility this week.",
      href: `/complexes/${complexId}/maintenance`,
      tone: "warning",
    });
  }
  if (complex?.type === "Sectional Title" && trusteesWithoutEmails.length > 0) {
    weekItems.push({
      title: `${trusteesWithoutEmails.length} trustee record${trusteesWithoutEmails.length === 1 ? "" : "s"} missing email`,
      detail: "Committee communication is weaker until trustee contacts are complete.",
      href: `/complexes/${complexId}/units`,
      tone: "info",
    });
  }
  if (weekItems.length === 0) {
    weekItems.push({
      title: "This week looks planned and under control",
      detail: "No obvious weekly blockers are showing yet.",
      href: `/complexes/${complexId}/meetings`,
      tone: "info",
    });
  }

  const monthItems: TimelineItem[] = [];
  const thisMonthMeetings = scheduledMeetings.filter((meeting) => {
    const when = new Date(meeting.scheduledAt);
    return when >= todayEnd && when <= monthEnd;
  });
  if (pendingInvoices.length > 0) {
    monthItems.push({
      title: `${pendingInvoices.length} pending invoice${pendingInvoices.length === 1 ? "" : "s"} should be monitored this month`,
      detail: "Use billing to follow collections before they move to overdue.",
      href: `/complexes/${complexId}/billing`,
      tone: "info",
    });
  }
  if (thisMonthMeetings.length > 0) {
    monthItems.push({
      title: `${thisMonthMeetings.length} scheduled meeting${thisMonthMeetings.length === 1 ? "" : "s"} this month`,
      detail: "Prepare communications, supporting documents, and minutes workflow.",
      href: `/complexes/${complexId}/meetings`,
      tone: "warning",
    });
  }
  if (complex?.type === "Sectional Title" && allDocuments.filter((document) => document.category === "CSOS & Compliance").length === 0) {
    monthItems.push({
      title: "No CSOS & compliance documents uploaded yet",
      detail: "Start building the scheme’s compliance evidence library in Documents.",
      href: `/complexes/${complexId}/documents`,
      tone: "info",
    });
  }
  if (monthItems.length === 0) {
    monthItems.push({
      title: "Month-end looks relatively clean",
      detail: "Use reports and billing to stay ahead of your monthly cycle.",
      href: `/complexes/${complexId}/reports`,
      tone: "info",
    });
  }

  const recentActivity: RecentItem[] = [
    ...allMaintenance.slice().sort(sortByCreatedAt).slice(0, 3).map((request) => ({
      title: request.title,
      detail: `Maintenance • Unit ${request.unitNumber || "-"} • ${request.status}`,
      meta: formatDisplayDate(request.createdAt),
      href: `/complexes/${complexId}/maintenance`,
    })),
    ...allCommunications.slice().sort(sortByCreatedAt).slice(0, 2).map((communication) => ({
      title: communication.subject,
      detail: `Communication • ${communication.sentTo} • ${communication.recipientCount || 0} recipients`,
      meta: formatDisplayDate(communication.createdAt),
      href: `/complexes/${complexId}/communications`,
    })),
  ]
    .sort((left, right) => new Date(right.meta).getTime() - new Date(left.meta).getTime())
    .slice(0, 5);

  const quickActions = [
    {
      title: "Run Billing",
      detail: "Create invoices or process levy follow-ups.",
      href: `/complexes/${complexId}/billing`,
      icon: Receipt,
    },
    {
      title: "Send Communication",
      detail: "Prepare owner, trustee, or selected-unit notices.",
      href: `/complexes/${complexId}/communications`,
      icon: Megaphone,
    },
    {
      title: "Update Units",
      detail: "Complete owner contacts, trustee data, and unit profile gaps.",
      href: `/complexes/${complexId}/units`,
      icon: Users,
    },
    {
      title: "Manage Meetings",
      detail: complex?.type === "Sectional Title"
        ? "Handle notices, agendas, minutes, and resolutions."
        : "Review scheduled meetings and communications.",
      href: `/complexes/${complexId}/${complex?.type === "Sectional Title" ? "meetings" : "communications"}`,
      icon: CalendarClock,
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Operations Hub
          </div>
          <h1 className="mt-3 text-3xl font-display font-bold text-foreground">
            {complex?.name ?? "Complex"} Work Rhythm
          </h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Start here to see what needs action today, what is coming up this week, and what could block your monthly workflow if left untouched.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Occupancy"
          value={`${occupancy}%`}
          subtitle={`${safeStats.occupiedUnits} of ${safeStats.totalUnits} units occupied`}
          icon={Users}
          color="bg-blue-500/10 text-blue-600"
        />
        <StatsCard
          title="Collections"
          value={`${safeStats.collectionRate}%`}
          subtitle={`${formatCurrency(safeStats.totalRevenue, currencyCode)} total invoiced`}
          icon={Wallet}
          color="bg-emerald-500/10 text-emerald-600"
        />
        <StatsCard
          title="Outstanding"
          value={formatCurrency(safeStats.outstandingBalance, currencyCode)}
          subtitle={`${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? "" : "s"}`}
          icon={Receipt}
          color="bg-rose-500/10 text-rose-600"
        />
        <StatsCard
          title="Open Requests"
          value={String(safeStats.openMaintenanceRequests)}
          subtitle={`${urgentMaintenance.length} urgent request${urgentMaintenance.length === 1 ? "" : "s"}`}
          icon={Wrench}
          color="bg-amber-500/10 text-amber-600"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-rose-50 p-3 text-rose-600">
              <CircleAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display">Needs Attention</h2>
              <p className="text-sm text-muted-foreground">
                The things most likely to create resident friction, missed deadlines, or cashflow pain.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {actionItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className={cn(
                  "flex items-start justify-between gap-4 rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm",
                  item.tone === "danger" && "border-rose-200 bg-rose-50/60",
                  item.tone === "warning" && "border-amber-200 bg-amber-50/70",
                  item.tone === "info" && "border-blue-200 bg-blue-50/60",
                )}
              >
                <div>
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display">Quick Actions</h2>
              <p className="text-sm text-muted-foreground">
                Jump straight into the work professionals usually need to move next.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/10 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-background p-2 shadow-sm">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{action.title}</p>
                      <p className="text-sm text-muted-foreground">{action.detail}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <CadencePanel
          title="Today"
          icon={Clock3}
          description="What deserves same-day focus."
          items={todayItems}
        />
        <CadencePanel
          title="This Week"
          icon={CalendarClock}
          description="The work that will shape your week if left late."
          items={weekItems}
        />
        <CadencePanel
          title="This Month"
          icon={FileText}
          description="The control points that keep monthly operations clean."
          items={monthItems}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display">Recent Activity</h2>
              <p className="text-sm text-muted-foreground">
                The latest logged communications and maintenance changes across the complex.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {recentActivity.length === 0 ? (
              <EmptyPanelMessage message="Recent activity will appear here once the team starts logging communications and requests." />
            ) : (
              recentActivity.map((item) => (
                <Link
                  key={`${item.title}-${item.meta}`}
                  href={item.href}
                  className="block rounded-xl border border-border bg-muted/10 p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.meta}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display">Operational Readiness</h2>
              <p className="text-sm text-muted-foreground">
                The records that determine whether the team can actually complete their work smoothly.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <ReadinessRow
              label="Owner Emails Captured"
              value={`${allUnits.length - missingOwnerEmails.length}/${allUnits.length || 0}`}
              detail={`${missingOwnerEmails.length} missing`}
              href={`/complexes/${complexId}/units`}
            />
            <ReadinessRow
              label="Meeting Notices Prepared"
              value={`${scheduledMeetings.length - meetingsWithoutNotice.length}/${scheduledMeetings.length || 0}`}
              detail={`${meetingsWithoutNotice.length} still need notices`}
              href={`/complexes/${complexId}/meetings`}
            />
            <ReadinessRow
              label="Meeting Sign-Ins Logged"
              value={`${allDocuments.filter((document) => document.sourceType === "registry_form").length}`}
              detail="Attendance-style sign-ins captured during AGMs or meetings"
              href={`/complexes/${complexId}/documents`}
            />
            <ReadinessRow
              label="Compliance / Governance Docs"
              value={`${allDocuments.filter((document) =>
                ["CSOS & Compliance", "AGM & Meetings", "Rules"].includes(document.category),
              ).length}`}
              detail="Documents linked to key operational processes"
              href={`/complexes/${complexId}/documents`}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm group">
      <div className="absolute right-0 top-0 p-6 opacity-20 transition-all group-hover:scale-110 group-hover:opacity-30">
        <Icon className={`-mr-8 -mt-8 h-24 w-24 ${color.split(" ")[1]}`} />
      </div>
      <div className="relative z-10">
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <h3 className="mb-1 text-sm font-medium text-muted-foreground">{title}</h3>
        <p className="text-3xl font-display font-bold tracking-tight text-foreground">{value}</p>
        <p className="mt-2 text-xs font-medium text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function CadencePanel({
  title,
  description,
  items,
  icon: Icon,
}: {
  title: string;
  description: string;
  items: TimelineItem[];
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-muted/60 p-3 text-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold font-display">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className={cn(
              "block rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm",
              item.tone === "danger" && "border-rose-200 bg-rose-50/60",
              item.tone === "warning" && "border-amber-200 bg-amber-50/70",
              item.tone === "info" && "border-blue-200 bg-blue-50/60",
            )}
          >
            <p className="font-medium text-foreground">{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ReadinessRow({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/10 p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"
    >
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
    </Link>
  );
}

function EmptyPanelMessage({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
      <CheckCircle2 className="mx-auto mb-3 h-10 w-10 opacity-30" />
      {message}
    </div>
  );
}

function formatDisplayDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "dd MMM yyyy");
}

function sortByCreatedAt<
  T extends { createdAt?: string }
>(left: T, right: T) {
  return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}
