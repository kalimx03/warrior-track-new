import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const courseId = await ctx.db.insert("courses", {
      name: args.name,
      code: args.code,
      description: args.description,
      facultyId: userId,
    });
    return courseId;
  },
});

export const listByFaculty = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("courses")
      .withIndex("by_faculty", (q) => q.eq("facultyId", userId))
      .collect();
  },
});

export const listEnrolled = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_student", (q) => q.eq("studentId", userId))
      .collect();

    const courses = await Promise.all(
      enrollments.map(async (e) => await ctx.db.get(e.courseId))
    );

    return courses.filter((c) => c !== null);
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("courses").collect();
  },
});

export const enroll = mutation({
  args: { courseId: v.id("courses") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const existing = await ctx.db
      .query("enrollments")
      .withIndex("by_course_and_student", (q) =>
        q.eq("courseId", args.courseId).eq("studentId", userId)
      )
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("enrollments", {
      courseId: args.courseId,
      studentId: userId,
    });
  },
});

export const update = mutation({
  args: {
    courseId: v.id("courses"),
    name: v.string(),
    code: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    
    const course = await ctx.db.get(args.courseId);
    if (!course || course.facultyId !== userId) throw new Error("Unauthorized");

    await ctx.db.patch(args.courseId, {
      name: args.name,
      code: args.code,
      description: args.description,
    });
  },
});