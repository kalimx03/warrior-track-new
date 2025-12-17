import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { generateSessionToken } from "./helpers";

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
      isLocked: false, // Default to unlocked
      createdBy: userId,
      lastCodeUpdate: Date.now(),
    });

    // Notify enrolled students
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();

    const course = await ctx.db.get(args.courseId);

    for (const enrollment of enrollments) {
      await ctx.db.insert("notifications", {
        userId: enrollment.studentId,
        title: "Session Active",
        message: `${args.type} session started for ${course?.code || "your course"}.`,
        isRead: false,
        type: "SESSION_START",
        relatedId: sessionId,
      });
    }

    return sessionId;
  },
});

export const end = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    await ctx.db.patch(args.sessionId, {
      isActive: false,
      endTime: Date.now(),
    });

    // Notify enrolled students
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_course", (q) => q.eq("courseId", session.courseId))
      .collect();

    const course = await ctx.db.get(session.courseId);

    for (const enrollment of enrollments) {
      await ctx.db.insert("notifications", {
        userId: enrollment.studentId,
        title: "Session Ended",
        message: `The ${session.type} session for ${course?.code || "your course"} has concluded.`,
        isRead: false,
        type: "SESSION_END",
        relatedId: session._id,
      });
    }
  },
});

export const toggleLock = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    if (session.createdBy !== userId) throw new Error("Unauthorized");

    await ctx.db.patch(args.sessionId, { isLocked: !session.isLocked });
    return !session.isLocked;
  },
});

export const regenerateCode = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    if (session.createdBy !== userId) throw new Error("Unauthorized");

    let newCode;
    if (session.type === "THEORY") {
      newCode = Math.floor(100000 + Math.random() * 900000).toString();
    } else {
      newCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    await ctx.db.patch(args.sessionId, { 
      code: newCode,
      lastCodeUpdate: Date.now()
    });
    return newCode;
  },
});

export const refreshActiveTheoryCodes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

    const activeSessions = await ctx.db
      .query("sessions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    for (const session of activeSessions) {
      if (session.type === "THEORY" && !session.isLocked) {
        const lastUpdate = session.lastCodeUpdate || session.startTime;
        // If code is older than refresh interval, rotate it
        if (now - lastUpdate >= REFRESH_INTERVAL) {
           const newCode = Math.floor(100000 + Math.random() * 900000).toString();
           await ctx.db.patch(session._id, {
             code: newCode,
             lastCodeUpdate: now,
           });
        }
      }
    }
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
          .then((results) => results.filter(r => r.status === "PRESENT").length);
        
        return {
          ...session,
          attendanceCount,
        };
      })
    );

    return sessionsWithStats;
  },
});

export const getDynamicQR = query({
  args: { 
    sessionId: v.id("sessions"),
    tick: v.optional(v.number()) // Used to force refresh
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.isActive || session.type !== "LAB" || !session.code) {
      return null;
    }
    
    if (session.isLocked) {
      return "LOCKED";
    }
    
    // Generate token based on current time
    const token = await generateSessionToken(session.code, Date.now());
    return token;
  },
});

export const search = query({
  args: { 
    courseId: v.id("courses"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    type: v.optional(v.union(v.literal("LAB"), v.literal("THEORY"))),
    duration: v.optional(v.string()), // "short" (< 1hr) or "long" (>= 1hr)
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .order("desc")
      .collect();

    const filtered = sessions.filter(s => {
      if (args.startDate && s.startTime < args.startDate) return false;
      if (args.endDate && s.startTime > args.endDate) return false;
      if (args.type && s.type !== args.type) return false;
      
      if (args.duration) {
        if (!s.endTime) return false; // Only filter ended sessions
        const durationMinutes = (s.endTime - s.startTime) / (1000 * 60);
        if (args.duration === "short" && durationMinutes >= 60) return false;
        if (args.duration === "long" && durationMinutes < 60) return false;
      }
      
      return true;
    });

    const limited = filtered.slice(0, args.limit || 20);

    const sessionsWithStats = await Promise.all(
      limited.map(async (session) => {
        const attendanceCount = await ctx.db
          .query("attendance")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect()
          .then((results) => results.filter(r => r.status === "PRESENT").length);
        
        return {
          ...session,
          attendanceCount,
        };
      })
    );

    return sessionsWithStats;
  },
});