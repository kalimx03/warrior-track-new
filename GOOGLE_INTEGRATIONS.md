# Google Integrations for LOKYODHA Attendance System

This document explains how to set up and use Google Calendar and Google Sheets integrations for exporting attendance data.

## Features

- **Google Calendar Export**: Export all attendance sessions to your Google Calendar
- **Google Sheets Export**: Generate detailed attendance reports in Google Sheets format

## Setup Instructions

### 1. Create Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Google Calendar API
   - Google Sheets API
   - Google OAuth2 API

### 2. Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Web application** as the application type
4. Add the following authorized redirect URIs:
   ```
   http://localhost:5173/auth/google/callback
   https://your-production-domain.com/auth/google/callback
   ```
5. Click **Create** and note down:
   - Client ID
   - Client Secret

### 3. Configure Environment Variables

Add the following to your API Keys in the VLY dashboard:

```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback  (optional)
```

### 4. Database Schema

The integration uses a `googleIntegrations` table to store OAuth tokens securely:

```typescript
googleIntegrations: defineTable({
  userId: v.id("users"),
  provider: v.union(v.literal("calendar"), v.literal("sheets"), v.literal("drive")),
  accessToken: v.string(),
  refreshToken: v.string(),
  expiresAt: v.number(),
  email: v.optional(v.string()),
})
```

## How to Use

### For Faculty/Instructors

1. **Navigate to Integrations Tab**
   - Go to Dashboard > Select a Course > Integrations tab

2. **Connect Google Account**
   - Click "Connect Calendar" or "Connect Sheets"
   - Authorize the application in the popup window
   - Grant necessary permissions

3. **Export to Google Calendar**
   - Click "Export to Calendar"
   - All course sessions will be added to your primary Google Calendar
   - Each event includes course name, type (LAB/THEORY), and timing

4. **Export to Google Sheets**
   - Click "Export to Sheets"
   - A new spreadsheet will be created with:
     - Student names and emails
     - Attendance statistics
     - Attendance percentages
   - The spreadsheet URL will open automatically

## API Reference

### Backend Functions

#### `getAuthUrl`
Generates OAuth authorization URL for connecting Google services.

```typescript
const authUrl = await ctx.runAction(api.googleIntegrations.getAuthUrl, {
  provider: "calendar" | "sheets"
});
```

#### `handleCallback`
Handles OAuth callback and stores tokens.

```typescript
await ctx.runAction(api.googleIntegrations.handleCallback, {
  code: "auth_code_from_google",
  provider: "calendar" | "sheets"
});
```

#### `exportToCalendar`
Exports all course sessions to Google Calendar.

```typescript
const result = await ctx.runAction(api.googleIntegrations.exportToCalendar, {
  courseId: "course_id"
});
```

#### `exportToSheets`
Creates a new Google Sheet with attendance report.

```typescript
const result = await ctx.runAction(api.googleIntegrations.exportToSheets, {
  courseId: "course_id"
});
// Returns: { success: true, spreadsheetId: "...", url: "..." }
```

#### `disconnect`
Removes stored tokens and disconnects integration.

```typescript
await ctx.runAction(api.googleIntegrations.disconnect, {
  provider: "calendar" | "sheets"
});
```

## Security Considerations

- All tokens are stored securely in the Convex database
- OAuth flow uses industry-standard authorization code flow
- Tokens are scoped to only necessary permissions:
  - Calendar: `https://www.googleapis.com/auth/calendar`
  - Sheets: `https://www.googleapis.com/auth/spreadsheets`
- Refresh tokens are used to maintain long-term access

## Troubleshooting

### "Google Calendar not connected" Error
- Ensure you've authorized the application
- Check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set correctly
- Verify the redirect URI matches your configuration

### "Failed to create spreadsheet" Error
- Ensure Google Sheets API is enabled in your Google Cloud project
- Check that the user has granted spreadsheet permissions
- Verify the OAuth token hasn't expired

### Authorization Window Blocked
- Disable popup blockers for your domain
- Try using the authorization link directly in a new tab

## Future Enhancements

Potential additions:
- Google Drive integration for PDF reports
- Automatic calendar sync (create events as sessions are scheduled)
- Email notifications via Gmail API
- Shared calendar for students

## Support

For issues or questions:
1. Check the console for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure APIs are enabled in Google Cloud Console
4. Contact support with error logs if issues persist
