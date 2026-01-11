import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, FileSpreadsheet, LogOut, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

interface GoogleIntegrationsProps {
  courseId: Id<"courses">;
}

export default function GoogleIntegrations({ courseId }: GoogleIntegrationsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const getAuthUrl = useAction(api.googleIntegrations.getAuthUrl);
  const exportToCalendar = useAction(api.googleIntegrations.exportToCalendar);
  const exportToSheets = useAction(api.googleIntegrations.exportToSheets);
  const disconnect = useAction(api.googleIntegrations.disconnect);

  const handleConnect = async (provider: "calendar" | "sheets") => {
    try {
      setLoading(provider);
      const authUrl = await getAuthUrl({ provider });

      // Open OAuth window
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      window.open(
        authUrl,
        "Google Authorization",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      toast.info(`Opening Google authorization window for ${provider}...`);
    } catch (error) {
      toast.error(`Failed to connect: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  const handleExportCalendar = async () => {
    try {
      setLoading("export-calendar");
      const result = await exportToCalendar({ courseId });

      if (result.success) {
        toast.success("Successfully exported to Google Calendar!");
      } else {
        toast.error("Some events failed to export");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to export to calendar");
    } finally {
      setLoading(null);
    }
  };

  const handleExportSheets = async () => {
    try {
      setLoading("export-sheets");
      const result = await exportToSheets({ courseId });

      if (result.success && result.url) {
        toast.success("Successfully exported to Google Sheets!");
        window.open(result.url, "_blank");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to export to sheets");
    } finally {
      setLoading(null);
    }
  };

  const handleDisconnect = async (provider: "calendar" | "sheets") => {
    try {
      setLoading(`disconnect-${provider}`);
      await disconnect({ provider });
      toast.success(`Disconnected from Google ${provider}`);
    } catch (error) {
      toast.error(`Failed to disconnect: ${error}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            Export attendance sessions to your Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={() => handleConnect("calendar")}
              disabled={loading !== null}
              variant="outline"
              size="sm"
            >
              {loading === "calendar" ? "Connecting..." : "Connect Calendar"}
            </Button>
            <Button
              onClick={handleExportCalendar}
              disabled={loading !== null}
              size="sm"
            >
              {loading === "export-calendar" ? "Exporting..." : "Export to Calendar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Note: You need to authorize access before exporting
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Google Sheets
          </CardTitle>
          <CardDescription>
            Export attendance reports to Google Sheets for analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={() => handleConnect("sheets")}
              disabled={loading !== null}
              variant="outline"
              size="sm"
            >
              {loading === "sheets" ? "Connecting..." : "Connect Sheets"}
            </Button>
            <Button
              onClick={handleExportSheets}
              disabled={loading !== null}
              size="sm"
            >
              {loading === "export-sheets" ? "Exporting..." : "Export to Sheets"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Creates a new spreadsheet with complete attendance data
          </p>
        </CardContent>
      </Card>

      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-sm">Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2 text-muted-foreground">
          <p>To enable Google integrations, add the following to your API Keys:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>GOOGLE_CLIENT_ID - Your Google OAuth Client ID</li>
            <li>GOOGLE_CLIENT_SECRET - Your Google OAuth Client Secret</li>
            <li>GOOGLE_REDIRECT_URI - OAuth callback URL (optional)</li>
          </ul>
          <p className="pt-2">
            Get these credentials from the{" "}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google Cloud Console
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
