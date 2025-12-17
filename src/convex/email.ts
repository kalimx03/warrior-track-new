"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { vly } from "../lib/vly-integrations";

export const sendPasswordReset = action({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      await vly.email.send({
        to: args.email,
        subject: "Password Reset Code - Warrior Track",
        text: `Your password reset code is: ${args.code}. It expires in 15 minutes.`,
        html: `<p>Your password reset code is: <strong>${args.code}</strong></p><p>It expires in 15 minutes.</p>`,
      });
      return { success: true };
    } catch (error) {
      console.error("Failed to send email:", error);
      return { success: false, error: "Failed to send email" };
    }
  },
});
