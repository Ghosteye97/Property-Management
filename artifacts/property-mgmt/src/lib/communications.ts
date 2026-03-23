import type { Document, Meeting, Unit } from "@workspace/api-client-react";

export type RecipientScope = "All Units" | "All Owners" | "Trustees" | "Selected Units";

export function getAudienceStats(
  units: Unit[],
  scope: RecipientScope,
  selectedUnitIds: number[] = [],
) {
  const selectedUnits =
    scope === "Selected Units"
      ? units.filter((unit) => selectedUnitIds.includes(unit.id))
      : units;

  if (scope === "All Units" || scope === "Selected Units") {
    const baseUnits = selectedUnits;
    return {
      recipientCount: baseUnits.length,
      missingEmailCount: baseUnits.filter(
        (unit) => !unit.ownerEmail && !unit.tenantEmail,
      ).length,
      audienceLabel: scope === "Selected Units" ? "selected units" : "all units",
    };
  }

  if (scope === "Trustees") {
    const trusteeUnits = selectedUnits.filter((unit) => unit.isTrustee);
    return {
      recipientCount: trusteeUnits.length,
      missingEmailCount: trusteeUnits.filter((unit) => !unit.ownerEmail).length,
      audienceLabel: "trustees",
    };
  }

  const ownerUnits = selectedUnits.filter((unit) => Boolean(unit.ownerName || unit.ownerEmail));
  return {
    recipientCount: ownerUnits.length,
    missingEmailCount: ownerUnits.filter((unit) => !unit.ownerEmail).length,
    audienceLabel: "all owners",
  };
}

export function appendLinkedDocuments(body: string, documents: Document[]) {
  if (!documents.length) return body.trim();

  const docLines = documents.map((document) => `- ${document.name} (${document.category})`);
  return `${body.trim()}\n\nLinked documents:\n${docLines.join("\n")}`;
}

export function buildMeetingNoticeDraft(meeting: Meeting) {
  const subject = `${meeting.meetingType}: ${meeting.title}`;
  const lines = [
    `Meeting notice for ${meeting.title}.`,
    "",
    `Date & time: ${formatMeetingDate(meeting.scheduledAt)}`,
    `Venue / link: ${meeting.venue || "To be confirmed"}`,
    "",
    "Agenda:",
    meeting.agenda || "Agenda to follow.",
  ];

  return {
    subject,
    body: lines.join("\n"),
  };
}

export function formatMeetingDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
