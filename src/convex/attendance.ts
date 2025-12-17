import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const mark = mutation({
  args: {
    sessionId: v.id("sessions"),
    code: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    if (!session.isActive) throw new Error("Session is not active");

    if (session.type === "THEORY") {
      if (session.code !== args.code) {
        throw new Error("Invalid PIN code");
      }
    }

    // Check if already marked
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_session_and_student", (q) =>
        q.eq("sessionId", args.sessionId).eq("studentId", userId)
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("attendance", {
      sessionId: args.sessionId,
      studentId: userId,
      timestamp: Date.now(),
      status: "PRESENT",
    });
  },
});

export const getStats = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get all sessions for the course
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const sessionIds = sessions.map((s) => s._id);
    
    // Get attendance for this student in these sessions
    let presentCount = 0;
    for (const sessionId of sessionIds) {
      const attendance = await ctx.db
        .query("attendance")
        .withIndex("by_session_and_student", (q) =>
          q.eq("sessionId", sessionId).eq("studentId", userId)
        )
        .first();
      if (attendance) presentCount++;
    }

    return {
      totalSessions: sessions.length,
      attendedSessions: presentCount,
      percentage: sessions.length > 0 ? (presentCount / sessions.length) * 100 : 0,
    };
  },
});

export const getCourseReport = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Verify faculty
    const course = await ctx.db.get(args.courseId);
    if (!course || course.facultyId !== userId) return null;

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
        if (att) attended++;
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
