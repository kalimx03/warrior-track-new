import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, QrCode, Users, AlertTriangle, BarChart3, Clock, Calendar } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { startOfWeek, startOfMonth, format, isSameWeek, isSameMonth, parseISO } from "date-fns";
import { FacultySessionHistory } from "./FacultySessionHistory";

export default function FacultyView() {
  const courses = useQuery(api.courses.listByFaculty);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">General's Command Center</h1>
        <CreateCourseDialog />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="elevation-1 border-none">
          <CardHeader>
            <CardTitle>Active Courses</CardTitle>
            <CardDescription>Manage your troops</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">{courses?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="sessions" className="space-y-4 mt-4">
          <div className="flex items-center gap-4">
            <Select value={selectedCourseId || ""} onValueChange={setSelectedCourseId}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a course to manage" />
              </SelectTrigger>
              <SelectContent>
                {courses?.map((course) => (
                  <SelectItem key={course._id} value={course._id}>
                    {course.code} - {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCourseId && (
            <SessionManager courseId={selectedCourseId as Id<"courses">} />
          )}
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          {selectedCourseId ? (
            <div className="space-y-6">
              <AttendanceTrends courseId={selectedCourseId as Id<"courses">} />
              <CourseReport courseId={selectedCourseId as Id<"courses">} />
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              Select a course to view reports
            </div>
          )}
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          {selectedCourseId ? (
            <FacultySessionHistory courseId={selectedCourseId as Id<"courses">} />
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              Select a course to view history
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateCourseDialog() {
  const createCourse = useMutation(api.courses.create);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await createCourse({
        name: formData.get("name") as string,
        code: formData.get("code") as string,
        description: formData.get("description") as string,
      });
      toast.success("Course created successfully");
      setIsOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      toast.error("Failed to create course");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <Button onClick={() => setIsOpen(!isOpen)}>
        <Plus className="mr-2 h-4 w-4" /> Deploy New Course
      </Button>
      {isOpen && (
        <Card className="absolute top-12 right-0 w-[350px] z-50 elevation-3">
          <CardHeader>
            <CardTitle>New Course Deployment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Course Name</Label>
                <Input id="name" name="name" required placeholder="e.g. Advanced Combat Tactics" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Course Code</Label>
                <Input id="code" name="code" required placeholder="e.g. CS301" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="Brief mission briefing" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deploy"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SessionManager({ courseId }: { courseId: Id<"courses"> }) {
  const activeSession = useQuery(api.sessions.getActive, { courseId });
  const recentSessions = useQuery(api.sessions.getRecent, { courseId });
  const createSession = useMutation(api.sessions.create);
  const endSession = useMutation(api.sessions.end);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartSession = async (type: "LAB" | "THEORY") => {
    setIsLoading(true);
    try {
      // Code generation is now handled in backend
      await createSession({ courseId, type });
      toast.success(`${type} Session Deployed`);
    } catch (error) {
      toast.error("Failed to start session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    setIsLoading(true);
    try {
      await endSession({ sessionId: activeSession._id });
      toast.success("Session Ended");
    } catch (error) {
      toast.error("Failed to end session");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="elevation-2 border-none bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Session Control
          </CardTitle>
          <CardDescription>Deploy attendance tracking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeSession ? (
            <div className="space-y-4">
              <div className="p-4 bg-background rounded-lg border text-center">
                <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Active Session</div>
                <div className="text-2xl font-bold text-primary">{activeSession.type}</div>
                
                {activeSession.type === "THEORY" && activeSession.code && (
                  <div className="mt-4">
                    <div className="text-sm text-muted-foreground mb-1">Access PIN</div>
                    <div className="text-4xl font-mono font-bold tracking-widest">{activeSession.code}</div>
                    <div className="text-xs text-muted-foreground mt-2">Valid for 5 minutes</div>
                  </div>
                )}

                {activeSession.type === "LAB" && activeSession.code && (
                  <div className="mt-4 flex flex-col items-center">
                    <div className="text-sm text-muted-foreground mb-2">Scan to Mark Attendance</div>
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${activeSession.code}`}
                        alt="Session QR Code"
                        className="w-32 h-32"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">Warriors must scan this code</div>
                  </div>
                )}
              </div>
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={handleEndSession}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                End Session
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Button 
                className="h-24 flex flex-col gap-2" 
                variant="outline"
                onClick={() => handleStartSession("LAB")}
                disabled={isLoading}
              >
                <QrCode className="h-6 w-6" />
                Start Lab
                <span className="text-xs font-normal text-muted-foreground">QR Code Mode</span>
              </Button>
              <Button 
                className="h-24 flex flex-col gap-2" 
                variant="outline"
                onClick={() => handleStartSession("THEORY")}
                disabled={isLoading}
              >
                <Users className="h-6 w-6" />
                Start Theory
                <span className="text-xs font-normal text-muted-foreground">PIN Code Mode</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="elevation-1 border-none">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest session logs</CardDescription>
        </CardHeader>
        <CardContent>
          {!recentSessions ? (
            <div className="text-center py-8 text-muted-foreground">Loading history...</div>
          ) : recentSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No recent sessions found</div>
          ) : (
            <div className="space-y-4">
              {recentSessions.map((session) => (
                <div key={session._id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${session.type === 'LAB' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                      {session.type === 'LAB' ? <QrCode className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{session.type} Session</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(session.startTime).toLocaleDateString()}
                        <Clock className="h-3 w-3 ml-1" />
                        {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{session.attendanceCount}</div>
                    <div className="text-xs text-muted-foreground">Present</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AttendanceTrends({ courseId }: { courseId: Id<"courses"> }) {
  const [timeRange, setTimeRange] = useState<"all" | "month" | "week">("all");
  const [aggregation, setAggregation] = useState<"day" | "week" | "month">("day");

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date();
    if (timeRange === "week") {
      const start = new Date(now);
      start.setDate(now.getDate() - 7);
      return { startDate: start.getTime(), endDate: now.getTime() };
    }
    if (timeRange === "month") {
      const start = new Date(now);
      start.setMonth(now.getMonth() - 1);
      return { startDate: start.getTime(), endDate: now.getTime() };
    }
    return { startDate: undefined, endDate: undefined };
  }, [timeRange]);

  const trends = useQuery(api.attendance.getTrends, { 
    courseId, 
    startDate: dateRange.startDate,
    endDate: dateRange.endDate 
  });

  const chartData = useMemo(() => {
    if (!trends || trends.length === 0) return [];

    if (aggregation === "day") return trends;

    // Aggregate data
    const groupedData = new Map<string, { 
      date: string; 
      timestamp: number; 
      attendance: number; 
      absent: number; 
      count: number 
    }>();

    trends.forEach((item) => {
      const date = new Date(item.timestamp);
      let key = "";
      let label = "";

      if (aggregation === "week") {
        const start = startOfWeek(date);
        key = start.toISOString();
        label = `Week of ${format(start, "MMM d")}`;
      } else if (aggregation === "month") {
        const start = startOfMonth(date);
        key = start.toISOString();
        label = format(start, "MMMM yyyy");
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          date: label,
          timestamp: new Date(key).getTime(),
          attendance: 0,
          absent: 0,
          count: 0
        });
      }

      const group = groupedData.get(key)!;
      group.attendance += item.attendance;
      group.absent += item.absent;
      group.count += 1;
    });

    // Average the stats for the period
    return Array.from(groupedData.values()).map(group => ({
      ...group,
      attendance: Math.round(group.attendance / group.count),
      absent: Math.round(group.absent / group.count),
    })).sort((a, b) => a.timestamp - b.timestamp);

  }, [trends, aggregation]);

  // Calculate summary metrics
  const metrics = useMemo(() => {
    if (!trends || trends.length === 0) return null;
    const totalAttendance = trends.reduce((acc, curr) => acc + curr.attendance, 0);
    const totalPossible = trends.reduce((acc, curr) => acc + curr.total, 0);
    const avgAttendance = totalPossible > 0 ? (totalAttendance / totalPossible) * 100 : 0;
    
    const bestSession = [...trends].sort((a, b) => b.attendance - a.attendance)[0];
    
    return {
      avg: avgAttendance.toFixed(1),
      best: bestSession ? `${bestSession.attendance}/${bestSession.total}` : "-",
      total: trends.length
    };
  }, [trends]);

  if (!trends) return <div className="p-8 text-center text-muted-foreground">Loading trends...</div>;
  if (trends.length === 0) return <div className="p-8 text-center text-muted-foreground">No attendance data available for this period</div>;

  const chartConfig = {
    attendance: {
      label: "Present",
      color: "hsl(var(--primary))",
    },
    absent: {
      label: "Absent",
      color: "hsl(var(--destructive))",
    },
  };

  return (
    <Card className="elevation-1 border-none">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Attendance Trends
            </CardTitle>
            <CardDescription>Real-time session attendance tracking</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={aggregation} onValueChange={(v: any) => setAggregation(v)}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="View By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">By Session</SelectItem>
                <SelectItem value="week">Weekly Avg</SelectItem>
                <SelectItem value="month">Monthly Avg</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {metrics && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Avg Attendance</div>
              <div className="text-2xl font-bold text-primary">{metrics.avg}%</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg border">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Sessions</div>
              <div className="text-2xl font-bold">{metrics.total}</div>
            </div>
            <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/10">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Best Turnout</div>
              <div className="text-2xl font-bold text-green-600">{metrics.best}</div>
            </div>
          </div>
        )}
        <div className="h-[300px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillAttendance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis 
                dataKey="date" 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8} 
                minTickGap={32}
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8} 
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="attendance"
                stroke="var(--color-primary)"
                fillOpacity={1}
                fill="url(#fillAttendance)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function CourseReport({ courseId }: { courseId: Id<"courses"> }) {
  const report = useQuery(api.attendance.getCourseReport, { courseId });

  if (!report) return <div className="p-4 text-center">Loading report...</div>;

  const atRisk = report.filter(r => r.percentage < 75);

  return (
    <div className="space-y-6">
      {atRisk.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5 elevation-1">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Warriors at Risk
            </CardTitle>
            <CardDescription>Attendance below 75% threshold</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {atRisk.map((r, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-background/50 rounded">
                  <span className="font-medium">{r.student?.name || r.student?.email}</span>
                  <span className="text-destructive font-bold">{r.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="elevation-1 border-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Lokyodha Status Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left font-medium">Warrior</th>
                  <th className="p-3 text-center font-medium">Attended</th>
                  <th className="p-3 text-center font-medium">Total</th>
                  <th className="p-3 text-right font-medium">Readiness Score</th>
                </tr>
              </thead>
              <tbody>
                {report.map((r, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3">{r.student?.name || r.student?.email}</td>
                    <td className="p-3 text-center">{r.attended}</td>
                    <td className="p-3 text-center">{r.total}</td>
                    <td className={`p-3 text-right font-bold ${r.percentage < 75 ? 'text-destructive' : 'text-green-600'}`}>
                      {r.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}