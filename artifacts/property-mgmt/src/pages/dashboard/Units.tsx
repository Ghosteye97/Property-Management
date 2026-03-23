import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  customFetch,
  type Document,
  type Invoice,
  type MaintenanceRequest,
  type Unit,
  getListUnitsQueryKey,
  useCreateUnit,
  useGetComplex,
  useListDocuments,
  useListInvoices,
  useListMaintenanceRequests,
  useListUnits,
  useUpdateUnit,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CircleDollarSign,
  Download,
  Edit2,
  FileText,
  Home,
  Import,
  Mail,
  MapPin,
  Phone,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  UserRound,
  Wrench,
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useComplexCurrency } from "@/lib/complex-currency";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const PRIMARY_USE_OPTIONS = [
  "Residential",
  "Commercial",
  "Mixed Use",
  "Staff Accommodation",
  "Storage",
] as const;

const CORRESPONDENCE_PREFERENCES = [
  "Email",
  "Phone",
  "WhatsApp",
  "Post",
  "Agent Collection",
] as const;

const UNIT_IMPORT_FIELDS = [
  { key: "unitNumber", label: "Unit Number", required: true },
  { key: "status", label: "Status", required: false },
  { key: "floor", label: "Floor", required: false },
  { key: "size", label: "Size (sqm)", required: false },
  { key: "primaryUse", label: "Primary Use", required: false },
  { key: "ownershipStartDate", label: "Ownership Start Date", required: false },
  { key: "ownerName", label: "Owner Name", required: false },
  { key: "ownerEmail", label: "Owner Email", required: false },
  { key: "ownerPhone", label: "Owner Phone", required: false },
  { key: "correspondencePreference", label: "Correspondence Preference", required: false },
  { key: "correspondenceAddress", label: "Correspondence Address", required: false },
  { key: "participationQuota", label: "Participation Quota", required: false },
  { key: "parkingBay", label: "Parking Bay", required: false },
  { key: "storeroomNumber", label: "Storeroom Number", required: false },
  { key: "utilityMeterNumber", label: "Utility Meter Number", required: false },
  { key: "tenantName", label: "Tenant Name", required: false },
  { key: "tenantEmail", label: "Tenant Email", required: false },
  { key: "tenantPhone", label: "Tenant Phone", required: false },
  { key: "isTrustee", label: "Is Trustee", required: false },
  { key: "trusteeRole", label: "Trustee Role", required: false },
  { key: "trusteeStartDate", label: "Trustee Start Date", required: false },
  { key: "trusteeNotes", label: "Trustee Notes", required: false },
  { key: "monthlyLevy", label: "Monthly Levy", required: false },
  { key: "notes", label: "Notes", required: false },
] as const;

type ImportFieldKey = (typeof UNIT_IMPORT_FIELDS)[number]["key"];
type ParsedImportRow = Record<string, string>;
type ImportMapping = Partial<Record<ImportFieldKey, string>>;

export function Units({ complexId }: { complexId: number }) {
  const { data: units, isLoading } = useListUnits(complexId);
  const { data: complex } = useGetComplex(complexId);
  const { data: invoices } = useListInvoices(complexId);
  const { data: maintenanceRequests } = useListMaintenanceRequests(complexId);
  const { data: documents } = useListDocuments(complexId);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [profileUnitId, setProfileUnitId] = useState<number | null>(null);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const currencyCode = useComplexCurrency();
  const isSectionalTitle = complex?.type === "Sectional Title";

  const filteredUnits = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return units || [];

    return (units || []).filter((unit) =>
      [
        unit.unitNumber,
        unit.ownerName,
        unit.ownerEmail,
        unit.tenantName,
        unit.primaryUse,
        unit.parkingBay,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [search, units]);

  const activeProfileUnit = useMemo(
    () => (units || []).find((unit) => unit.id === profileUnitId) ?? null,
    [profileUnitId, units],
  );

  const summary = useMemo(() => {
    const list = units || [];
    const occupied = list.filter((unit) => unit.status === "Occupied").length;
    const trustees = list.filter((unit) => unit.isTrustee).length;
    const inArrears = list.filter((unit) => (unit.outstandingBalance || 0) > 0).length;
    const needsAttention = list.filter((unit) => getAttentionFlags(unit).length > 0).length;

    return {
      total: list.length,
      occupied,
      trustees,
      inArrears,
      needsAttention,
    };
  }, [units]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Units</h1>
          <p className="mt-2 text-muted-foreground">
            Review owner readiness, levy exposure, governance status, and recent activity for every unit in one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 self-start rounded-xl border border-border bg-card px-4 py-2.5 font-medium text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-muted hover:shadow-md">
                <Import className="h-4 w-4" />
                Import Units
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[1040px]">
              <DialogHeader>
                <DialogTitle>Import Units</DialogTitle>
              </DialogHeader>
              <UnitImportDialog
                complexId={complexId}
                isSectionalTitle={isSectionalTitle}
                onSuccess={() => setIsImportOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 self-start rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-foreground shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <Plus className="h-4 w-4" />
                Add Unit
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[980px]">
              <DialogHeader>
                <DialogTitle>Add New Unit</DialogTitle>
              </DialogHeader>
              <UnitForm
                complexId={complexId}
                isSectionalTitle={isSectionalTitle}
                onSuccess={() => setIsCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Total Units" value={summary.total} tone="default" />
        <SummaryCard label="Occupied" value={summary.occupied} tone="success" />
        <SummaryCard label="Trustee Units" value={summary.trustees} tone="info" />
        <SummaryCard label="In Arrears" value={summary.inArrears} tone="warning" />
        <SummaryCard label="Needs Attention" value={summary.needsAttention} tone="danger" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search unit, owner, tenant, use type, or parking..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
          ))
        ) : filteredUnits.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            <Building2 className="mx-auto mb-4 h-12 w-12 opacity-20" />
            No units found.
          </div>
        ) : (
          filteredUnits.map((unit) => {
            const flags = getAttentionFlags(unit);
            const unitInvoices = (invoices || []).filter((invoice) => invoice.unitId === unit.id);
            const unitRequests = (maintenanceRequests || []).filter((request) => request.unitId === unit.id);
            const unitDocuments = (documents || []).filter((document) => document.unitId === unit.id);

            return (
              <button
                key={unit.id}
                type="button"
                onClick={() => setProfileUnitId(unit.id)}
                className="group rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      Unit Profile
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <h2 className="text-2xl font-display font-bold text-foreground">
                        {unit.unitNumber}
                      </h2>
                      <StatusBadge status={unit.status} />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditUnit(unit);
                    }}
                    className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {unit.isTrustee ? (
                    <ProfileBadge icon={ShieldCheck} label={unit.trusteeRole || "Trustee"} tone="info" />
                  ) : null}
                  {flags.map((flag) => (
                    <ProfileBadge key={flag} icon={AlertTriangle} label={flag} tone="warning" />
                  ))}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <MiniPanel
                    icon={UserRound}
                    label="Owner"
                    value={unit.ownerName || "Owner not captured"}
                    subvalue={unit.ownerEmail || unit.ownerPhone || "Profile incomplete"}
                  />
                  <MiniPanel
                    icon={Home}
                    label="Occupancy"
                    value={unit.tenantName || (unit.status === "Occupied" ? "Tenant not captured" : "No tenant linked")}
                    subvalue={unit.primaryUse || "Primary use not set"}
                  />
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <MetricTile
                    label="Levy"
                    value={formatCurrency(unit.monthlyLevy || 0, currencyCode)}
                  />
                  <MetricTile
                    label="Balance"
                    value={formatCurrency(unit.outstandingBalance || 0, currencyCode)}
                    tone={(unit.outstandingBalance || 0) > 0 ? "danger" : "success"}
                  />
                  <MetricTile
                    label="Activity"
                    value={`${unitInvoices.length + unitRequests.length + unitDocuments.length}`}
                    subvalue="linked items"
                  />
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
                  <span>
                    {unitDocuments.length} docs • {unitRequests.length} requests • {unitInvoices.length} invoices
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-primary">
                    Open profile
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      <Dialog
        open={Boolean(activeProfileUnit)}
        onOpenChange={(open) => {
          if (!open) {
            setProfileUnitId(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[1040px]">
          {activeProfileUnit ? (
            <UnitProfileDialog
              complexId={complexId}
              unit={activeProfileUnit}
              invoices={invoices || []}
              maintenanceRequests={maintenanceRequests || []}
              documents={documents || []}
              currencyCode={currencyCode}
              isSectionalTitle={isSectionalTitle}
              onEdit={() => {
                setProfileUnitId(null);
                setEditUnit(activeProfileUnit);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editUnit)}
        onOpenChange={(open) => {
          if (!open) {
            setEditUnit(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[980px]">
          <DialogHeader>
            <DialogTitle>Edit Unit {editUnit?.unitNumber}</DialogTitle>
          </DialogHeader>
          {editUnit ? (
            <UnitForm
              complexId={complexId}
              isSectionalTitle={isSectionalTitle}
              unit={editUnit}
              onSuccess={() => setEditUnit(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UnitProfileDialog({
  complexId,
  unit,
  invoices,
  maintenanceRequests,
  documents,
  currencyCode,
  isSectionalTitle,
  onEdit,
}: {
  complexId: number;
  unit: Unit;
  invoices: Invoice[];
  maintenanceRequests: MaintenanceRequest[];
  documents: Document[];
  currencyCode: string;
  isSectionalTitle: boolean;
  onEdit: () => void;
}) {
  const unitInvoices = useMemo(
    () =>
      invoices
        .filter((invoice) => invoice.unitId === unit.id)
        .slice()
        .sort((left, right) => new Date(right.dueDate).getTime() - new Date(left.dueDate).getTime()),
    [invoices, unit.id],
  );

  const unitMaintenance = useMemo(
    () =>
      maintenanceRequests
        .filter((request) => request.unitId === unit.id)
        .slice()
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [maintenanceRequests, unit.id],
  );

  const unitDocuments = useMemo(
    () =>
      documents
        .filter((document) => document.unitId === unit.id)
        .slice()
        .sort((left, right) => new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime()),
    [documents, unit.id],
  );

  const openMaintenance = unitMaintenance.filter((request) => request.status !== "Completed").length;
  const overdueInvoices = unitInvoices.filter((invoice) => invoice.status === "Overdue").length;

  return (
    <>
      <DialogHeader className="border-b border-border pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Unit Profile
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <DialogTitle className="text-3xl font-display font-bold">
                Unit {unit.unitNumber}
              </DialogTitle>
              <StatusBadge status={unit.status} />
              {unit.isTrustee ? (
                <ProfileBadge icon={ShieldCheck} label={unit.trusteeRole || "Trustee"} tone="info" />
              ) : null}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {unit.ownerName || "Owner not captured"} {unit.primaryUse ? `• ${unit.primaryUse}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/complexes/${complexId}/billing`}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Receipt className="h-4 w-4" />
              Open Billing
            </Link>
            <Link
              href={`/complexes/${complexId}/maintenance`}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Wrench className="h-4 w-4" />
              Open Maintenance
            </Link>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Edit2 className="h-4 w-4" />
              Edit Unit
            </button>
          </div>
        </div>
      </DialogHeader>

      <div className="grid gap-3 pt-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={CircleDollarSign}
          label="Monthly Levy"
          value={formatCurrency(unit.monthlyLevy || 0, currencyCode)}
          tone="default"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Outstanding Balance"
          value={formatCurrency(unit.outstandingBalance || 0, currencyCode)}
          tone={(unit.outstandingBalance || 0) > 0 ? "danger" : "success"}
        />
        <MetricCard
          icon={Wrench}
          label="Open Maintenance"
          value={String(openMaintenance)}
          tone={openMaintenance > 0 ? "warning" : "default"}
        />
        <MetricCard
          icon={Receipt}
          label="Overdue Invoices"
          value={String(overdueInvoices)}
          tone={overdueInvoices > 0 ? "danger" : "default"}
        />
      </div>

      <Tabs defaultValue="overview" className="mt-5">
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts & Governance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <InfoPanel title="Unit Snapshot" description="Current profile and operational details tied to this unit.">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailRow label="Floor" value={unit.floor || "Not set"} />
                <DetailRow label="Size" value={unit.size ? `${unit.size} sqm` : "Not set"} />
                <DetailRow label="Primary Use" value={unit.primaryUse || "Not set"} />
                <DetailRow label="Ownership Start" value={formatDisplayDate(unit.ownershipStartDate)} />
                <DetailRow label="Participation Quota" value={unit.participationQuota ? String(unit.participationQuota) : "Not set"} />
                <DetailRow label="Correspondence" value={unit.correspondencePreference || "Not set"} />
                <DetailRow label="Parking Bay" value={unit.parkingBay || "Not set"} />
                <DetailRow label="Storeroom" value={unit.storeroomNumber || "Not set"} />
                <DetailRow label="Utility Meter" value={unit.utilityMeterNumber || "Not set"} />
              </div>
            </InfoPanel>

            <InfoPanel title="Attention Flags" description="Quick scan of what still needs admin follow-up.">
              <div className="flex flex-wrap gap-2">
                {getAttentionFlags(unit).length > 0 ? (
                  getAttentionFlags(unit).map((flag) => (
                    <ProfileBadge key={flag} icon={AlertTriangle} label={flag} tone="warning" />
                  ))
                ) : (
                  <ProfileBadge icon={ShieldCheck} label="Profile looks healthy" tone="success" />
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MiniPanel
                  icon={Receipt}
                  label="Invoices"
                  value={`${unitInvoices.length} total`}
                  subvalue={unitInvoices[0] ? `Latest due ${formatDisplayDate(unitInvoices[0].dueDate)}` : "No invoices yet"}
                />
                <MiniPanel
                  icon={FileText}
                  label="Documents"
                  value={`${unitDocuments.length} linked`}
                  subvalue={unitDocuments[0] ? unitDocuments[0].name : "No documents linked"}
                />
              </div>

              {unit.notes ? (
                <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Notes
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{unit.notes}</p>
                </div>
              ) : null}
            </InfoPanel>
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <InfoPanel title="Owner Details" description="Primary ownership and communication details for this unit.">
              <div className="space-y-3">
                <ContactRow icon={UserRound} label="Owner" value={unit.ownerName || "Not captured"} />
                <ContactRow icon={Mail} label="Email" value={unit.ownerEmail || "Not captured"} />
                <ContactRow icon={Phone} label="Phone" value={unit.ownerPhone || "Not captured"} />
                <ContactRow icon={MapPin} label="Correspondence Address" value={unit.correspondenceAddress || "Not captured"} />
              </div>
            </InfoPanel>

            <InfoPanel title="Occupancy & Governance" description="Current occupant and sectional title role details.">
              <div className="space-y-3">
                <ContactRow icon={Home} label="Tenant" value={unit.tenantName || "Not captured"} />
                <ContactRow icon={Mail} label="Tenant Email" value={unit.tenantEmail || "Not captured"} />
                <ContactRow icon={Phone} label="Tenant Phone" value={unit.tenantPhone || "Not captured"} />
                <ContactRow
                  icon={ShieldCheck}
                  label="Trustee"
                  value={
                    unit.isTrustee
                      ? `${unit.trusteeRole || "Trustee"}${unit.trusteeStartDate ? ` since ${formatDisplayDate(unit.trusteeStartDate)}` : ""}`
                      : "No active trustee appointment"
                  }
                />
              </div>

              {isSectionalTitle && unit.trusteeNotes ? (
                <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Trustee Notes
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{unit.trusteeNotes}</p>
                </div>
              ) : null}
            </InfoPanel>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-3">
            <InfoPanel title="Recent Invoices" description="Levy and billing activity for this unit.">
              <div className="space-y-3">
                {unitInvoices.slice(0, 4).map((invoice) => (
                  <ActivityRow
                    key={invoice.id}
                    title={`${invoice.type} • ${formatCurrency(invoice.amount, currencyCode)}`}
                    subtitle={`Due ${formatDisplayDate(invoice.dueDate)}`}
                    badge={invoice.status}
                  />
                ))}
                {unitInvoices.length === 0 ? <EmptyStateLine label="No invoices linked yet." /> : null}
              </div>
            </InfoPanel>

            <InfoPanel title="Maintenance" description="Operational requests tied to this unit.">
              <div className="space-y-3">
                {unitMaintenance.slice(0, 4).map((request) => (
                  <ActivityRow
                    key={request.id}
                    title={request.title}
                    subtitle={`${request.category} • ${formatDisplayDate(request.createdAt)}`}
                    badge={request.status}
                  />
                ))}
                {unitMaintenance.length === 0 ? <EmptyStateLine label="No maintenance requests linked yet." /> : null}
              </div>
            </InfoPanel>

            <InfoPanel title="Documents" description="Registry forms, owner records, and support files.">
              <div className="space-y-3">
                {unitDocuments.slice(0, 4).map((document) => (
                  <ActivityRow
                    key={document.id}
                    title={document.name}
                    subtitle={`${document.category} • ${formatDisplayDate(document.uploadedAt)}`}
                    badge={document.sourceType === "registry_form" ? "Registry" : "Upload"}
                  />
                ))}
                {unitDocuments.length === 0 ? <EmptyStateLine label="No documents linked yet." /> : null}
              </div>
            </InfoPanel>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

function UnitImportDialog({
  complexId,
  isSectionalTitle,
  onSuccess,
}: {
  complexId: number;
  isSectionalTitle: boolean;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedFileName, setSelectedFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<ParsedImportRow[]>([]);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    created: number;
    skipped: number;
    failed: number;
    failures: string[];
  } | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    setImportSummary(null);

    if (!file) {
      setSelectedFileName("");
      setParsedRows([]);
      setAvailableColumns([]);
      setPreviewRows([]);
      setMapping({});
      return;
    }

    try {
      const rows = await parseUnitImportFile(file);
      const nonEmptyRows = rows.filter((row) =>
        Object.values(row).some((value) => value.trim() !== ""),
      );

      if (nonEmptyRows.length === 0) {
        toast({
          title: "No Import Data Found",
          description: "The selected file did not contain any unit rows to import.",
          variant: "destructive",
        });
        return;
      }

      const columns = Array.from(
        new Set(nonEmptyRows.flatMap((row) => Object.keys(row)).filter(Boolean)),
      );

      setSelectedFileName(file.name);
      setParsedRows(nonEmptyRows);
      setAvailableColumns(columns);
      setPreviewRows(nonEmptyRows.slice(0, 5));
      setMapping(getAutoMapping(columns));
    } catch (error) {
      toast({
        title: "Unable to Read File",
        description: error instanceof Error ? error.message : "Please use a CSV or XLSX file.",
        variant: "destructive",
      });
      setSelectedFileName("");
      setParsedRows([]);
      setAvailableColumns([]);
      setPreviewRows([]);
      setMapping({});
    }
  };

  const handleImport = async () => {
    if (!mapping.unitNumber) {
      toast({
        title: "Unit Number Mapping Required",
        description: "Please map the Unit Number field before finishing the import.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportSummary(null);

    try {
      let created = 0;
      let skipped = 0;
      let failed = 0;
      const failures: string[] = [];

      for (const [index, row] of parsedRows.entries()) {
        const payload = buildUnitImportPayload(row, mapping, isSectionalTitle);
        const rowNumber = index + 2;

        if (!payload) {
          skipped += 1;
          continue;
        }

        try {
          await customFetch(`/api/complexes/${complexId}/units`, {
            method: "POST",
            responseType: "json",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          created += 1;
        } catch (error) {
          failed += 1;
          failures.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : "Unable to create unit"}`);
        }
      }

      await queryClient.invalidateQueries({ queryKey: getListUnitsQueryKey(complexId) });

      const summary = { created, skipped, failed, failures: failures.slice(0, 6) };
      setImportSummary(summary);

      toast({
        title: "Unit Import Complete",
        description: `${created} imported, ${failed} failed${skipped ? `, ${skipped} skipped` : ""}.`,
        variant: failed > 0 ? "destructive" : undefined,
      });

      if (created > 0 && failed === 0) {
        onSuccess();
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleTemplateDownload = () => {
    const blob = new Blob([buildUnitImportTemplateCsv()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "unit-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pt-2">
      <div className="grid gap-4 rounded-2xl border border-border bg-muted/15 p-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Upload and Map Your Unit File</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload a CSV or Excel file, map the columns to the unit fields below, then finish the import. Use the template if you want a clean starting point.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <Import className="h-4 w-4" />
              Select CSV or XLSX
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={handleTemplateDownload}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              Download Template
            </button>
          </div>
          {selectedFileName ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Selected file: <span className="font-medium text-foreground">{selectedFileName}</span>
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Import Notes
          </p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>`Unit Number` is required.</li>
            <li>`Status` defaults to `Vacant` if left unmapped.</li>
            <li>Dates should be in `YYYY-MM-DD` format.</li>
            <li>Trustee fields can be left blank for non-sectional-title imports.</li>
          </ul>
        </div>
      </div>

      {availableColumns.length > 0 ? (
        <>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Field Mapping</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Match each unit field to the correct column in your file before importing.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {UNIT_IMPORT_FIELDS.map((field) => (
                <Field
                  key={field.key}
                  label={`${field.label}${field.required ? " *" : ""}`}
                >
                  <select
                    value={mapping[field.key] || ""}
                    onChange={(event) =>
                      setMapping((current) => ({
                        ...current,
                        [field.key]: event.target.value || undefined,
                      }))
                    }
                    className="w-full rounded-lg border bg-background p-2"
                  >
                    <option value="">Not mapped</option>
                    {availableColumns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground">Preview</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              First {previewRows.length} row{previewRows.length === 1 ? "" : "s"} from your file.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                    {availableColumns.map((column) => (
                      <th key={column} className="px-3 py-2 font-semibold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewRows.map((row, index) => (
                    <tr key={index}>
                      {availableColumns.map((column) => (
                        <td key={column} className="px-3 py-2 text-foreground">
                          {row[column] || <span className="text-muted-foreground">-</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {importSummary ? (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground">Import Result</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {importSummary.created} imported, {importSummary.failed} failed, {importSummary.skipped} skipped.
          </p>
          {importSummary.failures.length > 0 ? (
            <div className="mt-3 space-y-2 rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-700">
              {importSummary.failures.map((failure) => (
                <div key={failure}>{failure}</div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="sticky bottom-0 flex justify-end border-t border-border bg-background/95 pt-4 backdrop-blur">
        <button
          type="button"
          onClick={handleImport}
          disabled={isImporting || availableColumns.length === 0}
          className="rounded-xl bg-primary px-6 py-2 font-medium text-primary-foreground shadow transition-all hover:shadow-lg disabled:opacity-50"
        >
          {isImporting ? "Importing..." : "Finish Import"}
        </button>
      </div>
    </div>
  );
}

function UnitForm({
  complexId,
  unit,
  isSectionalTitle,
  onSuccess,
}: {
  complexId: number;
  unit?: Unit;
  isSectionalTitle: boolean;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const createMutation = useCreateUnit();
  const updateMutation = useUpdateUnit();

  const getOptionalString = (formData: FormData, key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value === "" ? undefined : value;
  };

  const getOptionalNumber = (formData: FormData, key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    if (value === "") return undefined;

    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = {
      unitNumber: String(formData.get("unitNumber") ?? "").trim(),
      floor: getOptionalString(formData, "floor"),
      size: getOptionalNumber(formData, "size"),
      status: String(formData.get("status") ?? "Vacant") as Unit["status"],
      primaryUse: getOptionalString(formData, "primaryUse"),
      ownershipStartDate: getOptionalString(formData, "ownershipStartDate"),
      correspondencePreference: getOptionalString(formData, "correspondencePreference"),
      correspondenceAddress: getOptionalString(formData, "correspondenceAddress"),
      participationQuota: getOptionalNumber(formData, "participationQuota"),
      parkingBay: getOptionalString(formData, "parkingBay"),
      storeroomNumber: getOptionalString(formData, "storeroomNumber"),
      utilityMeterNumber: getOptionalString(formData, "utilityMeterNumber"),
      ownerName: getOptionalString(formData, "ownerName"),
      ownerEmail: getOptionalString(formData, "ownerEmail"),
      ownerPhone: getOptionalString(formData, "ownerPhone"),
      tenantName: getOptionalString(formData, "tenantName"),
      tenantEmail: getOptionalString(formData, "tenantEmail"),
      tenantPhone: getOptionalString(formData, "tenantPhone"),
      isTrustee: isSectionalTitle ? formData.get("isTrustee") === "on" : false,
      trusteeRole: isSectionalTitle ? getOptionalString(formData, "trusteeRole") : undefined,
      trusteeStartDate: isSectionalTitle ? getOptionalString(formData, "trusteeStartDate") : undefined,
      trusteeNotes: isSectionalTitle ? getOptionalString(formData, "trusteeNotes") : undefined,
      monthlyLevy: getOptionalNumber(formData, "monthlyLevy"),
      notes: getOptionalString(formData, "notes"),
    };

    if (unit) {
      updateMutation.mutate(
        { complexId, unitId: unit.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListUnitsQueryKey(complexId) });
            onSuccess();
          },
        },
      );
      return;
    }

    createMutation.mutate(
      { complexId, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUnitsQueryKey(complexId) });
          onSuccess();
        },
      },
    );
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      <div className="grid gap-6 lg:grid-cols-2">
        <FormSection title="Unit Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Unit Number *">
              <input required name="unitNumber" defaultValue={unit?.unitNumber} className="w-full rounded-lg border p-2" />
            </Field>
            <Field label="Status *">
              <select required name="status" defaultValue={unit?.status || "Vacant"} className="w-full rounded-lg border bg-background p-2">
                <option value="Occupied">Occupied</option>
                <option value="Vacant">Vacant</option>
                <option value="Under Maintenance">Under Maintenance</option>
              </select>
            </Field>
            <Field label="Floor">
              <input name="floor" defaultValue={unit?.floor} className="w-full rounded-lg border p-2" />
            </Field>
            <Field label="Size (sqm)">
              <input type="number" name="size" defaultValue={unit?.size} className="w-full rounded-lg border p-2" />
            </Field>
            <Field label="Primary Use">
              <select name="primaryUse" defaultValue={unit?.primaryUse || ""} className="w-full rounded-lg border bg-background p-2">
                <option value="">Select use</option>
                {PRIMARY_USE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ownership Start">
              <input type="date" name="ownershipStartDate" defaultValue={unit?.ownershipStartDate} className="w-full rounded-lg border p-2" />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Owner Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner Name">
              <input name="ownerName" defaultValue={unit?.ownerName} className="w-full rounded-lg border p-2" />
            </Field>
            <Field label="Owner Email">
              <input type="email" name="ownerEmail" defaultValue={unit?.ownerEmail} className="w-full rounded-lg border p-2" />
            </Field>
            <Field label="Owner Phone" className="sm:col-span-2">
              <input name="ownerPhone" defaultValue={unit?.ownerPhone} className="w-full rounded-lg border p-2" />
            </Field>
            <Field label="Correspondence Preference">
              <select
                name="correspondencePreference"
                defaultValue={unit?.correspondencePreference || ""}
                className="w-full rounded-lg border bg-background p-2"
              >
                <option value="">Select preference</option>
                {CORRESPONDENCE_PREFERENCES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Participation Quota">
              <input type="number" step="0.0001" name="participationQuota" defaultValue={unit?.participationQuota} className="w-full rounded-lg border p-2" />
            </Field>
            <Field label="Correspondence Address" className="sm:col-span-2">
              <textarea
                name="correspondenceAddress"
                rows={3}
                defaultValue={unit?.correspondenceAddress}
                className="w-full resize-none rounded-lg border p-2"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Tenant Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tenant Name">
              <input name="tenantName" defaultValue={unit?.tenantName} className="w-full rounded-lg border p-2" />
            </Field>
            <Field label="Tenant Email">
              <input type="email" name="tenantEmail" defaultValue={unit?.tenantEmail} className="w-full rounded-lg border p-2" />
            </Field>
            <Field label="Tenant Phone" className="sm:col-span-2">
              <input name="tenantPhone" defaultValue={unit?.tenantPhone} className="w-full rounded-lg border p-2" />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Financial & Asset Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Monthly Levy">
              <input type="number" step="0.01" name="monthlyLevy" defaultValue={unit?.monthlyLevy} className="w-full rounded-lg border p-2" />
            </Field>
            <Field label="Parking Bay">
              <input name="parkingBay" defaultValue={unit?.parkingBay} className="w-full rounded-lg border p-2" />
            </Field>
            <Field label="Storeroom">
              <input name="storeroomNumber" defaultValue={unit?.storeroomNumber} className="w-full rounded-lg border p-2" />
            </Field>
            <Field label="Utility Meter Ref">
              <input name="utilityMeterNumber" defaultValue={unit?.utilityMeterNumber} className="w-full rounded-lg border p-2" />
            </Field>
            <Field label="General Notes" className="sm:col-span-2">
              <textarea name="notes" rows={4} defaultValue={unit?.notes} className="w-full resize-none rounded-lg border p-2" />
            </Field>
          </div>
        </FormSection>

        {isSectionalTitle ? (
          <section className="space-y-4 rounded-xl border border-border bg-muted/10 p-4 lg:col-span-2">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Sectional Title Governance
            </h4>
            <label className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 text-sm">
              <input type="checkbox" name="isTrustee" defaultChecked={Boolean(unit?.isTrustee)} className="h-4 w-4" />
              This owner currently serves as a trustee for the body corporate
            </label>
            <div className="grid gap-4 lg:grid-cols-[0.9fr_0.7fr_1.4fr]">
              <Field label="Trustee Role">
                <select name="trusteeRole" defaultValue={unit?.trusteeRole || ""} className="w-full rounded-lg border bg-background p-2">
                  <option value="">Select role</option>
                  <option value="Chairperson">Chairperson</option>
                  <option value="Secretary">Secretary</option>
                  <option value="Treasurer">Treasurer</option>
                  <option value="Trustee">Trustee</option>
                </select>
              </Field>
              <Field label="Start Date">
                <input type="date" name="trusteeStartDate" defaultValue={unit?.trusteeStartDate} className="w-full rounded-lg border p-2" />
              </Field>
              <Field label="Trustee Notes">
                <textarea
                  name="trusteeNotes"
                  rows={3}
                  defaultValue={unit?.trusteeNotes}
                  className="w-full resize-none rounded-lg border p-2"
                  placeholder="Election notes, term comments, alternate contact details, or committee remarks."
                />
              </Field>
            </div>
          </section>
        ) : null}
      </div>

      <div className="sticky bottom-0 flex justify-end border-t border-border bg-background/95 pt-4 backdrop-blur">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-primary px-6 py-2 font-medium text-primary-foreground shadow transition-all hover:shadow-lg disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save Unit"}
        </button>
      </div>
    </form>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "success" | "info" | "warning" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-sm",
        tone === "default" && "border-border bg-card",
        tone === "success" && "border-emerald-200 bg-emerald-50/70",
        tone === "info" && "border-blue-200 bg-blue-50/70",
        tone === "warning" && "border-amber-200 bg-amber-50/80",
        tone === "danger" && "border-rose-200 bg-rose-50/80",
      )}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-3xl font-display font-bold text-foreground">{value}</div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: string;
  tone: "default" | "success" | "warning" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-sm",
        tone === "default" && "border-border bg-card",
        tone === "success" && "border-emerald-200 bg-emerald-50/70",
        tone === "warning" && "border-amber-200 bg-amber-50/70",
        tone === "danger" && "border-rose-200 bg-rose-50/70",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-background p-2 shadow-sm">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  subvalue,
  tone = "default",
}: {
  label: string;
  value: string;
  subvalue?: string;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-base font-semibold",
          tone === "default" && "text-foreground",
          tone === "success" && "text-emerald-700",
          tone === "danger" && "text-rose-700",
        )}
      >
        {value}
      </div>
      {subvalue ? <div className="mt-1 text-xs text-muted-foreground">{subvalue}</div> : null}
    </div>
  );
}

function MiniPanel({
  icon: Icon,
  label,
  value,
  subvalue,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  subvalue: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{subvalue}</div>
    </div>
  );
}

function InfoPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/10 p-3">
      <div className="rounded-lg bg-background p-2 shadow-sm">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
      </div>
    </div>
  );
}

function ActivityRow({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle: string;
  badge: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-foreground">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
        </div>
        <Badge variant="outline" className="border-border bg-background text-foreground">
          {badge}
        </Badge>
      </div>
    </div>
  );
}

function EmptyStateLine({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border border-border bg-muted/10 p-4">
      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      {children}
    </section>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function ProfileBadge({
  icon: Icon,
  label,
  tone,
}: {
  icon: typeof AlertTriangle;
  label: string;
  tone: "success" | "warning" | "info";
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 border px-2.5 py-1",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
        tone === "info" && "border-blue-200 bg-blue-50 text-blue-700",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function StatusBadge({ status }: { status: Unit["status"] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border px-2.5 py-1",
        status === "Occupied" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        status === "Vacant" && "border-slate-200 bg-slate-50 text-slate-700",
        status === "Under Maintenance" && "border-amber-200 bg-amber-50 text-amber-700",
      )}
    >
      {status}
    </Badge>
  );
}

function getAttentionFlags(unit: Unit) {
  const flags: string[] = [];

  if (!unit.ownerName) flags.push("Owner missing");
  if (!unit.ownerEmail) flags.push("Owner email missing");
  if ((unit.outstandingBalance || 0) > 0) flags.push("Arrears");

  return flags;
}

function formatDisplayDate(value?: string) {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function parseUnitImportFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("The file does not contain any sheets.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
    raw: false,
  });

  if (extension !== "csv" && extension !== "xlsx") {
    throw new Error("Please upload a CSV or XLSX file.");
  }

  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [String(key).trim(), String(value ?? "").trim()]),
    ),
  );
}

function getAutoMapping(columns: string[]): ImportMapping {
  const normalizedColumns = columns.map((column) => ({
    original: column,
    normalized: normalizeImportHeader(column),
  }));

  const aliasMap: Record<ImportFieldKey, string[]> = {
    unitNumber: ["unitnumber", "unit", "unitno", "unitnumbernumber", "unit_number"],
    status: ["status", "occupancystatus"],
    floor: ["floor", "level"],
    size: ["size", "sizesqm", "sqm", "area"],
    primaryUse: ["primaryuse", "use", "unittype"],
    ownershipStartDate: ["ownershipstartdate", "ownershipstart", "transferdate", "startdate"],
    ownerName: ["ownername", "owner", "fullname"],
    ownerEmail: ["owneremail", "email"],
    ownerPhone: ["ownerphone", "phone", "ownercontact"],
    correspondencePreference: ["correspondencepreference", "contactpreference"],
    correspondenceAddress: ["correspondenceaddress", "postaladdress", "address"],
    participationQuota: ["participationquota", "pq", "quota"],
    parkingBay: ["parkingbay", "parking", "parkingnumber"],
    storeroomNumber: ["storeroomnumber", "storeroom", "store"],
    utilityMeterNumber: ["utilitymeternumber", "meternumber", "meter"],
    tenantName: ["tenantname", "tenant"],
    tenantEmail: ["tenantemail"],
    tenantPhone: ["tenantphone", "tenantcontact"],
    isTrustee: ["istrustee", "trustee"],
    trusteeRole: ["trusteerole", "committeeposition"],
    trusteeStartDate: ["trusteestartdate", "trusteestart"],
    trusteeNotes: ["trusteenotes"],
    monthlyLevy: ["monthlylevy", "levy", "levyamount"],
    notes: ["notes", "comments"],
  };

  return UNIT_IMPORT_FIELDS.reduce<ImportMapping>((accumulator, field) => {
    const match = normalizedColumns.find((column) =>
      aliasMap[field.key].includes(column.normalized),
    );

    if (match) {
      accumulator[field.key] = match.original;
    }

    return accumulator;
  }, {});
}

function buildUnitImportPayload(
  row: ParsedImportRow,
  mapping: ImportMapping,
  isSectionalTitle: boolean,
) {
  const getValue = (key: ImportFieldKey) => {
    const column = mapping[key];
    if (!column) return "";
    return String(row[column] || "").trim();
  };

  const unitNumber = getValue("unitNumber");
  if (!unitNumber) return null;

  return {
    unitNumber,
    status: normalizeUnitStatus(getValue("status")) || "Vacant",
    floor: emptyToUndefined(getValue("floor")),
    size: toOptionalNumber(getValue("size")),
    primaryUse: emptyToUndefined(getValue("primaryUse")),
    ownershipStartDate: normalizeDateString(getValue("ownershipStartDate")),
    ownerName: emptyToUndefined(getValue("ownerName")),
    ownerEmail: emptyToUndefined(getValue("ownerEmail")),
    ownerPhone: emptyToUndefined(getValue("ownerPhone")),
    correspondencePreference: emptyToUndefined(getValue("correspondencePreference")),
    correspondenceAddress: emptyToUndefined(getValue("correspondenceAddress")),
    participationQuota: toOptionalNumber(getValue("participationQuota")),
    parkingBay: emptyToUndefined(getValue("parkingBay")),
    storeroomNumber: emptyToUndefined(getValue("storeroomNumber")),
    utilityMeterNumber: emptyToUndefined(getValue("utilityMeterNumber")),
    tenantName: emptyToUndefined(getValue("tenantName")),
    tenantEmail: emptyToUndefined(getValue("tenantEmail")),
    tenantPhone: emptyToUndefined(getValue("tenantPhone")),
    isTrustee: isSectionalTitle ? toBoolean(getValue("isTrustee")) : false,
    trusteeRole: isSectionalTitle ? emptyToUndefined(getValue("trusteeRole")) : undefined,
    trusteeStartDate: isSectionalTitle ? normalizeDateString(getValue("trusteeStartDate")) : undefined,
    trusteeNotes: isSectionalTitle ? emptyToUndefined(getValue("trusteeNotes")) : undefined,
    monthlyLevy: toOptionalNumber(getValue("monthlyLevy")),
    notes: emptyToUndefined(getValue("notes")),
  };
}

function buildUnitImportTemplateCsv() {
  const headers = UNIT_IMPORT_FIELDS.map((field) => field.key);
  const sampleRow = [
    "1",
    "Occupied",
    "Ground",
    "85",
    "Residential",
    "2026-01-15",
    "Jane Owner",
    "jane@example.com",
    "0821234567",
    "Email",
    "PO Box 123, Cape Town",
    "2.4567",
    "B12",
    "S4",
    "MTR-1001",
    "John Tenant",
    "john@example.com",
    "0827654321",
    "TRUE",
    "Trustee",
    "2026-02-01",
    "Current trustee representative",
    "1850",
    "Imported sample row",
  ];

  return `${headers.join(",")}\n${sampleRow.map(escapeCsvValue).join(",")}\n`;
}

function normalizeImportHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function emptyToUndefined(value: string) {
  return value.trim() === "" ? undefined : value.trim();
}

function toOptionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toBoolean(value: string) {
  return ["true", "yes", "y", "1", "on"].includes(value.trim().toLowerCase());
}

function normalizeUnitStatus(value: string): Unit["status"] | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "occupied") return "Occupied";
  if (normalized === "vacant") return "Vacant";
  if (normalized === "under maintenance" || normalized === "undermaintenance") {
    return "Under Maintenance";
  }
  return undefined;
}

function normalizeDateString(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return trimmed;
  }

  return date.toISOString().slice(0, 10);
}

function escapeCsvValue(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
