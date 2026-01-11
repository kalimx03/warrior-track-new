"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { google } from "googleapis";
import { internal } from "./_generated/api";

// OAuth2 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:5173/auth/google/callback";

// Create OAuth2 client
function getOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
}

// Generate OAuth URL
export const getAuthUrl = action({
  args: {
    provider: v.union(v.literal("calendar"), v.literal("sheets"), v.literal("drive")),
  },
  handler: async (ctx, args) => {
    const oauth2Client = getOAuth2Client();

    const scopes = {
      calendar: ["https://www.googleapis.com/auth/calendar"],
      sheets: ["https://www.googleapis.com/auth/spreadsheets"],
      drive: ["https://www.googleapis.com/auth/drive.file"],
    };

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes[args.provider],
      prompt: "consent",
    });

    return authUrl;
  },
});

// Handle OAuth callback
export const handleCallback = action({
  args: {
    code: v.string(),
    provider: v.union(v.literal("calendar"), v.literal("sheets"), v.literal("drive")),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.runQuery(internal.googleIntegrationsHelpers.getUserId);
    if (!userId) throw new Error("Unauthorized");

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(args.code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Failed to get tokens");
    }

    // Get user email
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    await ctx.runMutation(internal.googleIntegrationsHelpers.saveTokens, {
      userId,
      provider: args.provider,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date || Date.now() + 3600000,
      email: userInfo.data.email || undefined,
    });

    return { success: true };
  },
});

// Export attendance to Google Calendar
export const exportToCalendar = action({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; results: Array<{ success: boolean; eventId?: string | null | undefined; error?: string }> }> => {
    const userId = await ctx.runQuery(internal.googleIntegrationsHelpers.getUserId);
    if (!userId) throw new Error("Unauthorized");

    // Get tokens
    const integration = await ctx.runQuery(internal.googleIntegrationsHelpers.getIntegration, {
      userId,
      provider: "calendar" as const,
    });

    if (!integration) {
      throw new Error("Google Calendar not connected. Please authorize first.");
    }

    // Get course and sessions
    const course = await ctx.runQuery(internal.googleIntegrationsHelpers.getCourse, {
      courseId: args.courseId,
    });

    if (!course) throw new Error("Course not found");

    const sessions = await ctx.runQuery(internal.googleIntegrationsHelpers.getCourseSessions, {
      courseId: args.courseId,
    });

    // Initialize Google Calendar API
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Create events for each session
    const results: Array<{ success: boolean; eventId?: string | null | undefined; error?: string }> = [];
    for (const session of sessions) {
      const event = {
        summary: `${course.name} - ${session.type}`,
        description: `Course: ${course.code}\nType: ${session.type}`,
        start: {
          dateTime: new Date(session.startTime).toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: new Date(
            session.endTime || session.startTime + 3600000
          ).toISOString(),
          timeZone: "UTC",
        },
      };

      try {
        const response = await calendar.events.insert({
          calendarId: "primary",
          requestBody: event,
        });
        results.push({ success: true, eventId: response.data.id });
      } catch (error) {
        results.push({ success: false, error: String(error) });
      }
    }

    return { success: true, results };
  },
});

// Export attendance report to Google Sheets
export const exportToSheets = action({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; spreadsheetId?: string; url?: string }> => {
    const userId = await ctx.runQuery(internal.googleIntegrationsHelpers.getUserId);
    if (!userId) throw new Error("Unauthorized");

    // Get tokens
    const integration = await ctx.runQuery(internal.googleIntegrationsHelpers.getIntegration, {
      userId,
      provider: "sheets" as const,
    });

    if (!integration) {
      throw new Error("Google Sheets not connected. Please authorize first.");
    }

    // Get course report
    const course = await ctx.runQuery(internal.googleIntegrationsHelpers.getCourse, {
      courseId: args.courseId,
    });

    if (!course) throw new Error("Course not found");

    const report = await ctx.runQuery(internal.googleIntegrationsHelpers.getCourseReport, {
      courseId: args.courseId,
    });

    // Initialize Google Sheets API
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
    });

    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    // Create new spreadsheet
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `${course.name} - Attendance Report`,
        },
        sheets: [
          {
            properties: {
              title: "Attendance Summary",
            },
          },
        ],
      },
    });

    const spreadsheetId: string | null | undefined = spreadsheet.data.spreadsheetId;

    if (!spreadsheetId) throw new Error("Failed to create spreadsheet");

    // Prepare data
    const headers = [["Student Name", "Email", "Sessions Attended", "Total Sessions", "Percentage"]];
    const data = report.map((r: any) => [
      r.student.name || "Unknown",
      r.student.email || "",
      r.attended,
      r.total,
      `${r.percentage.toFixed(2)}%`,
    ]);

    // Write data
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Attendance Summary!A1:E1",
      valueInputOption: "RAW",
      requestBody: {
        values: headers,
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Attendance Summary!A2:E${data.length + 1}`,
      valueInputOption: "RAW",
      requestBody: {
        values: data,
      },
    });

    // Format header
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.2,
                    green: 0.4,
                    blue: 0.8,
                  },
                  textFormat: {
                    foregroundColor: {
                      red: 1,
                      green: 1,
                      blue: 1,
                    },
                    bold: true,
                  },
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)",
            },
          },
        ],
      },
    });

    return {
      success: true,
      spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  },
});

// Disconnect Google integration
export const disconnect = action({
  args: {
    provider: v.union(v.literal("calendar"), v.literal("sheets"), v.literal("drive")),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.runQuery(internal.googleIntegrationsHelpers.getUserId);
    if (!userId) throw new Error("Unauthorized");

    await ctx.runMutation(internal.googleIntegrationsHelpers.removeIntegration, {
      userId,
      provider: args.provider,
    });

    return { success: true };
  },
});
