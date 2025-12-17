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

    // PIN Expiration Logic (5 minutes) for THEORY sessions
    if (session.type === "THEORY") {
      const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
      if (Date.now() > session.startTime + SESSION_TIMEOUT) {
        throw new Error("Session PIN has expired");
      }
      
      if (session.code !== args.code) {
        throw new Error("Invalid PIN code");
      }
    }

    // QR Code Logic for LAB sessions
    if (session.type === "LAB") {
      // For LAB, the code is the secret embedded in the QR
      if (session.code && session.code !== args.code) {
        throw new Error("Invalid QR Code");
      }
    }

    // Check if already marked
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_session_and_student", (q) =>
        q.eq("sessionId", args.sessionId).eq("studentId", userId)
      )
      .first();

    if (existing) {
      if (existing.status !== "PRESENT") {
        await ctx.db.patch(existing._id, { status: "PRESENT", timestamp: Date.now() });
      }
      return existing._id;
    }

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
    const attendances = await ctx.db
      .query("attendance")
      .withIndex("by_student", (q) => q.eq("studentId", userId))
      .collect();

    // Only count PRESENT records
    const attendanceSet = new Set(
      attendances
        .filter(a => a.status === "PRESENT")
        .map(a => a.sessionId)
    );

    let presentCount = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Sort sessions by time ascending for streak calculation
    const sortedSessions = sessions.sort((a, b) => a.startTime - b.startTime);

    for (const session of sortedSessions) {
      if (attendanceSet.has(session._id)) {
        presentCount++;
        tempStreak++;
      } else {
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        tempStreak = 0;
      }
    }
    // Check final streak
    if (tempStreak > longestStreak) longestStreak = tempStreak;

    // Calculate current streak (working backwards from most recent)
    // We only count streaks for sessions that have happened
    const pastSessions = sortedSessions.filter(s => s.startTime <= Date.now()).reverse();
    for (const session of pastSessions) {
      if (attendanceSet.has(session._id)) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      totalSessions: sessions.length,
      attendedSessions: presentCount,
      percentage: sessions.length > 0 ? (presentCount / sessions.length) * 100 : 0,
      currentStreak,
      longestStreak,
    };
  },
});

export const getStudentHistory = query({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .order("desc")
      .collect();

    const history = await Promise.all(
      sessions.map(async (session) => {
        const attendance = await ctx.db
          .query("attendance")
          .withIndex("by_session_and_student", (q) =>
            q.eq("sessionId", session._id).eq("studentId", userId)
          )
          .first();

        return {
          _id: session._id,
          startTime: session.startTime,
          type: session.type,
          status: attendance ? attendance.status : "ABSENT",
        };
      })
    );

    return history;
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

export const getTrends = query({
  args: { 
    courseId: v.id("courses"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get all sessions for the course, ordered by time
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .order("asc")
      .collect();

    // Filter by date range if provided
    const filteredSessions = sessions.filter((s) => {
      if (args.startDate && s.startTime < args.startDate) return false;
      if (args.endDate && s.startTime > args.endDate) return false;
      return true;
    });

    if (filteredSessions.length === 0) return [];

    // Get total enrolled students for capacity calculation
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_course", (q) => q.eq("courseId", args.courseId))
      .collect();
    const totalStudents = enrollments.length;

    // Calculate attendance for each session
    const trends = await Promise.all(
      filteredSessions.map(async (session) => {
        const attendanceCount = await ctx.db
          .query("attendance")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .collect()
          .then((results) => results.filter(r => r.status === "PRESENT").length);

        return {
          date: new Date(session.startTime).toLocaleDateString(),
          timestamp: session.startTime,
          attendance: attendanceCount,
          absent: totalStudents - attendanceCount,
          total: totalStudents,
          type: session.type,
        };
      })
    );

    return trends;
  },
});

export const getAllStudentAttendance = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_student", (q) => q.eq("studentId", userId))
      .collect();

    // Enrich with course info for the calendar
    const enriched = await Promise.all(
      attendance.filter(a => a.status === "PRESENT").map(async (a) => {
        const session = await ctx.db.get(a.sessionId);
        if (!session) return null;
        const course = await ctx.db.get(session.courseId);
        return {
          ...a,
          sessionType: session.type,
          courseCode: course?.code,
          courseName: course?.name,
        };
      })
    );

    return enriched.filter((a) => a !== null);
  },
});

export const getSessionAttendanceList = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const session = await ctx.db.get(args.sessionId);
    if (!session) return [];

    // Verify faculty ownership
    const course = await ctx.db.get(session.courseId);
    if (!course || course.facultyId !== userId) return [];

    // Get all enrolled students
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_course", (q) => q.eq("courseId", session.courseId))
      .collect();

    // Get attendance records for this session
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const attendanceMap = new Map(attendance.map(a => [a.studentId, a]));

    const students = await Promise.all(
      enrollments.map(async (e) => {
        const student = await ctx.db.get(e.studentId);
        if (!student) return null;
        const record = attendanceMap.get(student._id);
        return {
          studentId: student._id,
          name: student.name || student.email || "Unknown",
          email: student.email,
          status: record ? record.status : "ABSENT",
          attendanceId: record?._id,
          timestamp: record?.timestamp
        };
      })
    );

    return students.filter(s => s !== null);
  },
});

export const manualUpdate = mutation({
  args: {
    sessionId: v.id("sessions"),
    studentId: v.id("users"),
    status: v.union(v.literal("PRESENT"), v.literal("ABSENT")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    const course = await ctx.db.get(session.courseId);
    if (!course || course.facultyId !== userId) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_session_and_student", (q) =>
        q.eq("sessionId", args.sessionId).eq("studentId", args.studentId)
      )
      .first();

    if (args.status === "PRESENT") {
      if (!existing) {
        await ctx.db.insert("attendance", {
          sessionId: args.sessionId,
          studentId: args.studentId,
          timestamp: Date.now(),
          status: "PRESENT",
        });
      } else if (existing.status !== "PRESENT") {
        await ctx.db.patch(existing._id, { status: "PRESENT" });
      }
    } else {
      // Mark ABSENT
      if (existing) {
        await ctx.db.patch(existing._id, { status: "ABSENT" });
      }
    }
  },
});