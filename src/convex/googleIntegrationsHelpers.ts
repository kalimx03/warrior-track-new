import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Internal queries and mutations (NOT in "use node" context)

export const getUserId = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await getAuthUserId(ctx);
  },
});

export const saveTokens = internalMutation({
  args: {
    userId: v.id("users"),
    provider: v.union(v.literal("calendar"), v.literal("sheets"), v.literal("drive")),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if integration exists
    const existing = await ctx.db
      .query("googleIntegrations")
      .withIndex("by_user_and_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        email: args.email,
      });
    } else {
      await ctx.db.insert("googleIntegrations", {
        userId: args.userId,
        provider: args.provider,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        email: args.email,
      });
    }
  },
});

export const getIntegration = internalQuery({
  args: {
    userId: v.id("users"),
    provider: v.union(v.literal("calendar"), v.literal("sheets"), v.literal("drive")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("googleIntegrations")
      .withIndex("by_user_and_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider)
      )
      .first();
  },
});

export const removeIntegration = internalMutation({
  args: {
    userId: v.id("users"),
    provider: v.union(v.literal("calendar"), v.literal("sheets"), v.literal("drive")),
  },
  handler: async (ctx, args) => {
    const integration = await ctx.db
      .query("googleIntegrations")
      .withIndex("by_user_and_provider", (q) =>
        q.eq("userId", args.userId).eq("provider", args.provider)
      )
      .first();

    if (integration) {
      await ctx.db.delete(integration._id);
    }
  },
});

export const getCourse = internalQuery({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.courseId);
  },
});

export const getCourseSessions = internalQuery({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
  },
});

export const getCourseReport = internalQuery({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const students = await Promise.all(
      enrollments.map((e) => ctx.db.get(e.studentId))
    );

    const report = [];
    for (const student of students) {
      if (!student) continue;
      let attended = 0;
      for (const session of sessions) {
        const att = await ctx.db
          .query("attendance")
          .withIndex("by_session_and_student", (q) =>
            q.eq("sessionId", session._id).eq("studentId", student._id)
          )
          .first();
        if (att && att.status === "PRESENT") attended++;
      }
      report.push({
        student,
        attended,
        total: sessions.length,
        percentage: sessions.length > 0 ? (attended / sessions.length) * 100 : 0,
      });
    }

    return report;
  },
});
