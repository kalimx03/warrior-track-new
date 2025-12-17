import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    courseId: v.id("courses"),
    type: v.union(v.literal("LAB"), v.literal("THEORY")),
    code: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    // Deactivate other active sessions for this course by this user if any
    const activeSessions = await ctx.db
      .query("sessions")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    for (const session of activeSessions) {
      await ctx.db.patch(session._id, { isActive: false, endTime: Date.now() });
    }

    // Generate code if not provided
    let sessionCode = args.code;
    if (!sessionCode) {
      if (args.type === "THEORY") {
        // 6-digit PIN
        sessionCode = Math.floor(100000 + Math.random() * 900000).toString();
      } else if (args.type === "LAB") {
        // UUID-like secret for QR
        sessionCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      }
    }

    const sessionId = await ctx.db.insert("sessions", {
      courseId: args.courseId,
      startTime: Date.now(),
      type: args.type,
      code: sessionCode,
      isActive: true,
      createdBy: userId,
    });

    return sessionId;
  },
});

export const end = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    await ctx.db.patch(args.sessionId, {
      isActive: false,
      endTime: Date.now(),
    });
  },
});

export const getActive = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  },
});

export const getRecent = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .order("desc")
      .take(5);

    // Enrich with attendance count
    const sessionsWithStats = await Promise.all(
      sessions.map(async (session) => {
        const attendanceCount = await ctx.db
          .query("attendance")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect()
          .then((results) => results.length);
        
        return {
          ...session,
          attendanceCount,
        };
      })
    );

    return sessionsWithStats;
  },
});