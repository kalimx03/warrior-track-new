import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Search, Filter, Users, QrCode } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

export function FacultySessionHistory({ courseId }: { courseId: Id<"courses"> }) {
  const [typeFilter, setTypeFilter] = useState<"ALL" | "LAB" | "THEORY">("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [durationFilter, setDurationFilter] = useState<"ALL" | "short" | "long">("ALL");

  // Convert date string to timestamp range if present
  const dateRange = dateFilter ? {
    startDate: new Date(dateFilter).setHours(0, 0, 0, 0),
    endDate: new Date(dateFilter).setHours(23, 59, 59, 999)
  } : {};

  const sessions = useQuery(api.sessions.search, {
    courseId,
    type: typeFilter === "ALL" ? undefined : typeFilter,
    duration: durationFilter === "ALL" ? undefined : durationFilter,
    ...dateRange,
    limit: 50
  });

  return (
    <Card className="elevation-1 border-none">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Session Archives
            </CardTitle>
            <CardDescription>Search and filter past operations</CardDescription>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative w-[140px]">
              <Input 
                type="date" 
                className="h-8 text-xs"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <Filter className="h-3 w-3 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="THEORY">Theory</SelectItem>
                <SelectItem value="LAB">Lab</SelectItem>
              </SelectContent>
            </Select>
            <Select value={durationFilter} onValueChange={(v: any) => setDurationFilter(v)}>
              <SelectTrigger className="w-[110px] h-8 text-xs">
                <Clock className="h-3 w-3 mr-2" />
                <SelectValue placeholder="Duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Any Duration</SelectItem>
                <SelectItem value="short">&lt; 1 Hour</SelectItem>
                <SelectItem value="long">&ge; 1 Hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Date & Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Attendance</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!sessions ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading archives...
                  </TableCell>
                </TableRow>
              ) : sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No sessions found matching criteria
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session) => (
                  <TableRow key={session._id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(session.startTime).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={session.type === 'LAB' ? 'secondary' : 'outline'} className="gap-1">
                        {session.type === 'LAB' ? <QrCode className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                        {session.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {session.endTime 
                          ? `${Math.round((session.endTime - session.startTime) / (1000 * 60))} mins`
                          : "Active"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                        {session.type === 'THEORY' ? session.code : 'QR Code'}
                      </code>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {session.attendanceCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={session.isActive ? "default" : "secondary"} className={session.isActive ? "bg-green-500 hover:bg-green-600" : ""}>
                        {session.isActive ? "Active" : "Ended"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}