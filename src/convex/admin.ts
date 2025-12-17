import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper to verify admin
async function checkAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthorized");
  
  const user = await ctx.db.get(userId);
  if (!user || user.role !== "admin") {
    // Double check hardcoded admin email just in case role wasn't set yet
    if (user?.email === "admin.sayyed03@gmail.com") return user;
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

export const getSystemStats = query({
  args: {},
  handler: async (ctx) => {
    await checkAdmin(ctx);

    const users = await ctx.db.query("users").collect();
    const courses = await ctx.db.query("courses").collect();
    const sessions = await ctx.db.query("sessions").collect();
    const attendance = await ctx.db.query("attendance").collect();

    const students = users.filter(u => u.role === "student");
    const faculty = users.filter(u => u.role === "faculty");

    return {
      totalUsers: users.length,
      totalStudents: students.length,
      totalFaculty: faculty.length,
      totalCourses: courses.length,
      totalSessions: sessions.length,
      totalAttendanceRecords: attendance.length,
      activeSessions: sessions.filter(s => s.isActive).length,
    };
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    await checkAdmin(ctx);
    return await ctx.db.query("users").order("desc").take(100);
  },
});

export const updateUserRole = mutation({
  args: { userId: v.id("users"), role: v.string() },
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    // Validate role
    if (!["admin", "faculty", "student", "user"].includes(args.role)) {
      throw new Error("Invalid role");
    }
    await ctx.db.patch(args.userId, { role: args.role as any });
  },
});

export const deleteUserFaceId = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    await ctx.db.patch(args.userId, { faceDescriptor: undefined });
  },
});

export const getAllSessions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    const sessions = await ctx.db.query("sessions").order("desc").take(args.limit || 50);
    
    // Enrich with course info
    return await Promise.all(sessions.map(async (s) => {
      const course = await ctx.db.get(s.courseId);
      return {
        ...s,
        courseName: course?.name,
        courseCode: course?.code,
      };
    }));
  },
});

export const getGlobalAttendanceTrends = query({
  args: {},
  handler: async (ctx) => {
    await checkAdmin(ctx);
    // Get last 7 days of sessions
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    const sessions = await ctx.db.query("sessions")
      .withIndex("by_active") // Optimization: scan active/recent
      .filter(q => q.gte(q.field("startTime"), sevenDaysAgo))
      .collect();

    // This might be heavy, in production use dedicated analytics table or scheduled aggregation
    const trends = await Promise.all(sessions.map(async (s) => {
      const attendanceCount = await ctx.db
        .query("attendance")
        .withIndex("by_session", q => q.eq("sessionId", s._id))
        .collect()
        .then(res => res.filter(r => r.status === "PRESENT").length);
      
      return {
        date: new Date(s.startTime).toLocaleDateString(),
        count: attendanceCount,
        type: s.type
      };
    }));

    return trends;
  }
});
