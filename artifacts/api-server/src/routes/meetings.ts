import { Router } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { meetingResolutionsTable, meetingsTable } from "@workspace/db";
import {
  CreateMeetingBody,
  CreateMeetingParams,
  CreateMeetingResolutionBody,
  CreateMeetingResolutionParams,
  ListMeetingsParams,
  UpdateMeetingBody,
  UpdateMeetingParams,
  UpdateMeetingResolutionBody,
  UpdateMeetingResolutionParams,
} from "@workspace/api-zod";

const router = Router({ mergeParams: true });

const toDate = (value: string | Date | undefined) => {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
};

router.get("/", async (req, res) => {
  const { complexId } = ListMeetingsParams.parse(req.params);

  const meetings = await db
    .select()
    .from(meetingsTable)
    .where(eq(meetingsTable.complexId, complexId))
    .orderBy(desc(meetingsTable.scheduledAt), desc(meetingsTable.createdAt));

  const meetingIds = meetings.map((meeting) => meeting.id);
  const resolutions =
    meetingIds.length > 0
      ? await db
          .select()
          .from(meetingResolutionsTable)
          .where(inArray(meetingResolutionsTable.meetingId, meetingIds))
          .orderBy(desc(meetingResolutionsTable.createdAt))
      : [];

  const resolutionMap = new Map<number, typeof resolutions>();
  for (const resolution of resolutions) {
    const existing = resolutionMap.get(resolution.meetingId) ?? [];
    existing.push(resolution);
    resolutionMap.set(resolution.meetingId, existing);
  }

  return res.json(
    meetings.map((meeting) => ({
      ...meeting,
      resolutions: resolutionMap.get(meeting.id) ?? [],
    })),
  );
});

router.post("/", async (req, res) => {
  const { complexId } = CreateMeetingParams.parse(req.params);
  const body = CreateMeetingBody.parse({
    ...req.body,
    scheduledAt: toDate(req.body.scheduledAt),
  });

  const [meeting] = await db
    .insert(meetingsTable)
    .values({
      ...body,
      complexId,
    })
    .returning();

  return res.status(201).json({ ...meeting, resolutions: [] });
});

router.put("/:meetingId", async (req, res) => {
  const { complexId, meetingId } = UpdateMeetingParams.parse(req.params);
  const body = UpdateMeetingBody.parse({
    ...req.body,
    scheduledAt: toDate(req.body.scheduledAt),
  });

  const [meeting] = await db
    .update(meetingsTable)
    .set(body)
    .where(
      and(eq(meetingsTable.complexId, complexId), eq(meetingsTable.id, meetingId)),
    )
    .returning();

  if (!meeting) {
    return res.status(404).json({ error: "Meeting not found" });
  }

  const resolutions = await db
    .select()
    .from(meetingResolutionsTable)
    .where(eq(meetingResolutionsTable.meetingId, meeting.id))
    .orderBy(desc(meetingResolutionsTable.createdAt));

  return res.json({ ...meeting, resolutions });
});

router.post("/:meetingId/resolutions", async (req, res) => {
  const { complexId, meetingId } = CreateMeetingResolutionParams.parse(req.params);
  const body = CreateMeetingResolutionBody.parse({
    ...req.body,
    effectiveDate: toDate(req.body.effectiveDate),
  });

  const [meeting] = await db
    .select({ id: meetingsTable.id })
    .from(meetingsTable)
    .where(
      and(eq(meetingsTable.id, meetingId), eq(meetingsTable.complexId, complexId)),
    );

  if (!meeting) {
    return res.status(404).json({ error: "Meeting not found" });
  }

  const [resolution] = await db
    .insert(meetingResolutionsTable)
    .values({
      ...body,
      meetingId,
    })
    .returning();

  return res.status(201).json(resolution);
});

router.put("/:meetingId/resolutions/:resolutionId", async (req, res) => {
  const { complexId, meetingId, resolutionId } =
    UpdateMeetingResolutionParams.parse(req.params);
  const body = UpdateMeetingResolutionBody.parse({
    ...req.body,
    effectiveDate: toDate(req.body.effectiveDate),
  });

  const [meeting] = await db
    .select({ id: meetingsTable.id })
    .from(meetingsTable)
    .where(
      and(eq(meetingsTable.id, meetingId), eq(meetingsTable.complexId, complexId)),
    );

  if (!meeting) {
    return res.status(404).json({ error: "Meeting not found" });
  }

  const [resolution] = await db
    .update(meetingResolutionsTable)
    .set(body)
    .where(
      and(
        eq(meetingResolutionsTable.id, resolutionId),
        eq(meetingResolutionsTable.meetingId, meetingId),
      ),
    )
    .returning();

  if (!resolution) {
    return res.status(404).json({ error: "Resolution not found" });
  }

  return res.json(resolution);
});

export default router;
