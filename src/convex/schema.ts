import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  USER: "user",
  MEMBER: "member",
  FACULTY: "faculty",
  STUDENT: "student",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
  v.literal(ROLES.FACULTY),
  v.literal(ROLES.STUDENT),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
      faceDescriptor: v.optional(v.array(v.number())), // Face API descriptor
    }).index("email", ["email"]), // index for the email. do not remove or modify

    courses: defineTable({
      name: v.string(),
      code: v.string(),
      description: v.optional(v.string()),
      facultyId: v.id("users"),
    }).index("by_faculty", ["facultyId"]),

    enrollments: defineTable({
      courseId: v.id("courses"),
      studentId: v.id("users"),
    }).index("by_course", ["courseId"])
      .index("by_student", ["studentId"])
      .index("by_course_and_student", ["courseId", "studentId"]),

    sessions: defineTable({
      courseId: v.id("courses"),
      startTime: v.number(),
      endTime: v.optional(v.number()),
      type: v.union(v.literal("LAB"), v.literal("THEORY")),
      code: v.optional(v.string()), // PIN for theory
      isActive: v.boolean(),
      isLocked: v.optional(v.boolean()), // New field for pausing attendance
      createdBy: v.id("users"),
      lastCodeUpdate: v.optional(v.number()),
    }).index("by_course", ["courseId"])
      .index("by_active", ["isActive"]),

    attendance: defineTable({
      sessionId: v.id("sessions"),
      studentId: v.id("users"),
      timestamp: v.number(),
      status: v.union(v.literal("PRESENT"), v.literal("ABSENT")),
    }).index("by_session", ["sessionId"])
      .index("by_student", ["studentId"])
      .index("by_session_and_student", ["sessionId", "studentId"]),

    notifications: defineTable({
      userId: v.id("users"),
      title: v.string(),
      message: v.string(),
      isRead: v.boolean(),
      type: v.union(v.literal("SESSION_START"), v.literal("SESSION_END"), v.literal("ALERT"), v.literal("INFO")),
      relatedId: v.optional(v.string()),
    }).index("by_user", ["userId"]),

    passwordResetCodes: defineTable({
      email: v.string(),
      code: v.string(),
      expiresAt: v.number(),
    }).index("by_email", ["email"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;