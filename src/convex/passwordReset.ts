import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const initiate = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      // Don't reveal if user exists
      return { success: true };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    // Invalidate old codes
    const oldCodes = await ctx.db
      .query("passwordResetCodes")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();
    
    for (const oldCode of oldCodes) {
      await ctx.db.delete(oldCode._id);
    }

    await ctx.db.insert("passwordResetCodes", {
      email: args.email,
      code,
      expiresAt,
    });

    // Schedule email sending
    await ctx.scheduler.runAfter(0, internal.email.sendPasswordReset, {
      email: args.email,
      code,
    });

    return { success: true };
  },
});

export const verify = mutation({
  args: { email: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("passwordResetCodes")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .filter((q) => q.eq(q.field("code"), args.code))
      .first();

    if (!record) {
      return { success: false, error: "Invalid code" };
    }

    if (Date.now() > record.expiresAt) {
      return { success: false, error: "Code expired" };
    }

    return { success: true };
  },
});
