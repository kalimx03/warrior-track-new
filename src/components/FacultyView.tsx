import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, QrCode, Users, AlertTriangle, BarChart3, Clock, Calendar, Settings, Edit, Check, X, UserCheck, Maximize2, RefreshCw, Lock, Unlock, RotateCcw } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { startOfWeek, startOfMonth, format, isSameWeek, isSameMonth, parseISO } from "date-fns";
import { FacultySessionHistory } from "./FacultySessionHistory";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export default function FacultyView() {
  const courses = useQuery(api.courses.listByFaculty);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const selectedCourse = courses?.find(c => c._id === selectedCourseId);

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
            {selectedCourse && (
              <EditCourseDialog course={selectedCourse} />
            )}
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

function EditCourseDialog({ course }: { course: any }) {
  const updateCourse = useMutation(api.courses.update);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      await updateCourse({
        courseId: course._id,
        name: formData.get("name") as string,
        code: formData.get("code") as string,
        description: formData.get("description") as string,
      });
      toast.success("Course updated successfully");
      setIsOpen(false);
    } catch (error) {
      toast.error("Failed to update course");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Course Protocols</DialogTitle>
          <DialogDescription>Update course details and mission parameters.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Course Name</Label>
            <Input id="edit-name" name="name" required defaultValue={course.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-code">Course Code</Label>
            <Input id="edit-code" name="code" required defaultValue={course.code} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Input id="edit-description" name="description" defaultValue={course.description} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

function AttendanceManager({ sessionId }: { sessionId: Id<"sessions"> }) {
  const students = useQuery(api.attendance.getSessionAttendanceList, { sessionId });
  const updateStatus = useMutation(api.attendance.manualUpdate);
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = async (studentId: Id<"users">, currentStatus: string) => {
    const newStatus = currentStatus === "PRESENT" ? "ABSENT" : "PRESENT";
    try {
      await updateStatus({ sessionId, studentId, status: newStatus });
      toast.success(`Marked ${newStatus}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserCheck className="h-4 w-4" />
          Manage Attendance
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Attendance Register</DialogTitle>
          <DialogDescription>Manually update student attendance status.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4">
          {!students ? (
            <div className="text-center p-4">Loading...</div>
          ) : students.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">No students enrolled.</div>
          ) : (
            <div className="space-y-2">
              {students.map((student) => (
                <div key={student.studentId} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${student.status === 'PRESENT' ? 'bg-green-500' : 'bg-destructive'}`} />
                    <div>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-xs text-muted-foreground">{student.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={student.status === 'PRESENT' ? "default" : "outline"}
                      className={student.status === 'PRESENT' ? "bg-green-600 hover:bg-green-700" : ""}
                      onClick={() => handleToggle(student.studentId, student.status)}
                    >
                      {student.status === 'PRESENT' ? (
                        <>
                          <Check className="h-3 w-3 mr-1" /> Present
                        </>
                      ) : (
                        "Mark Present"
                      )}
                    </Button>
                    {student.status === 'PRESENT' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleToggle(student.studentId, student.status)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DynamicQRDisplay({ sessionId }: { sessionId: Id<"sessions"> }) {
  // Force refresh every 5 seconds to ensure we always have a valid token
  const [timestamp, setTimestamp] = useState(Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => setTimestamp(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  const qrToken = useQuery(api.sessions.getDynamicQR, { sessionId, tick: Math.floor(timestamp / 5000) } as any);
  const [showFullQR, setShowFullQR] = useState(false);

  if (qrToken === "LOCKED") {
    return (
      <div className="mt-4 flex flex-col items-center justify-center h-48 w-48 bg-muted/20 rounded-xl border-2 border-dashed border-muted-foreground/20">
        <Lock className="h-12 w-12 text-muted-foreground/50 mb-2" />
        <span className="text-sm font-medium text-muted-foreground">Session Locked</span>
      </div>
    );
  }

  if (!qrToken) return <div className="text-sm text-muted-foreground">Generating secure QR...</div>;

  return (
    <div className="mt-4 flex flex-col items-center">
      <div className="bg-white p-4 rounded-xl shadow-sm border relative group cursor-pointer" onClick={() => setShowFullQR(true)}>
        <img 
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrToken}`}
          alt="Session QR Code"
          className="w-48 h-48"
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
          <Maximize2 className="text-white h-8 w-8" />
        </div>
      </div>
      <div className="text-sm text-muted-foreground mt-4 font-medium flex flex-col items-center gap-1">
        <span>Scan to verify presence</span>
        <span className="text-xs text-blue-500 flex items-center gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Refreshing security token...
        </span>
      </div>

      <Dialog open={showFullQR} onOpenChange={setShowFullQR}>
        <DialogContent className="max-w-[80vh] w-full aspect-square flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${qrToken}`}
              alt="Full Session QR Code"
              className="w-full h-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SessionManager({ courseId }: { courseId: Id<"courses"> }) {
  const activeSession = useQuery(api.sessions.getActive, { courseId });
  const recentSessions = useQuery(api.sessions.getRecent, { courseId });
  const createSession = useMutation(api.sessions.create);
  const endSession = useMutation(api.sessions.end);
  const toggleLock = useMutation(api.sessions.toggleLock);
  const regenerateCode = useMutation(api.sessions.regenerateCode);
  
  const [isLoading, setIsLoading] = useState(false);
  const [showFullQR, setShowFullQR] = useState(false);

  const handleStartSession = async (type: "LAB" | "THEORY") => {
    setIsLoading(true);
    try {
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

  const handleToggleLock = async () => {
    if (!activeSession) return;
    try {
      const isLocked = await toggleLock({ sessionId: activeSession._id });
      toast.success(isLocked ? "Session Locked" : "Session Unlocked");
    } catch (error) {
      toast.error("Failed to toggle lock");
    }
  };

  const handleRegenerate = async () => {
    if (!activeSession) return;
    try {
      await regenerateCode({ sessionId: activeSession._id });
      toast.success("Security Code Regenerated");
    } catch (error) {
      toast.error("Failed to regenerate code");
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="elevation-2 border-none bg-primary/5 overflow-hidden relative">
        {activeSession && !activeSession.isLocked && (
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-primary to-transparent animate-pulse" />
        )}
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Session Control
          </CardTitle>
          <CardDescription>Deploy attendance tracking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeSession ? (
            <div className="space-y-6">
              <div className="p-6 bg-background rounded-xl border shadow-xs text-center relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  {activeSession.isLocked ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <Lock className="w-3 h-3 mr-1" /> Locked
                    </span>
                  ) : (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                  )}
                </div>
                
                <div className="text-sm text-muted-foreground uppercase tracking-wider mb-2 font-semibold">
                  Active {activeSession.type} Session
                </div>
                
                {activeSession.type === "THEORY" && activeSession.code && (
                  <div className="mt-6 mb-4 flex flex-col items-center">
                    <div className="text-6xl font-mono font-bold tracking-[0.2em] text-primary mb-6">
                      {activeSession.code}
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl shadow-sm border mb-4 relative group cursor-pointer" onClick={() => setShowFullQR(true)}>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${activeSession.code}`}
                        alt="Session QR Code"
                        className="w-40 h-40"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                        <Maximize2 className="text-white h-8 w-8" />
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <Clock className="h-4 w-4" />
                      PIN expires in 5 minutes
                    </div>
                  </div>
                )}

                {activeSession.type === "LAB" && (
                  <DynamicQRDisplay sessionId={activeSession._id} />
                )}
              </div>

              {/* Controls Toolbar */}
              <div className="flex items-center justify-center gap-2 p-2 bg-background rounded-lg border">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleToggleLock}
                  className={activeSession.isLocked ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
                  title={activeSession.isLocked ? "Unlock Session" : "Lock Session"}
                >
                  {activeSession.isLocked ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                  {activeSession.isLocked ? "Unlock" : "Lock"}
                </Button>
                
                <div className="w-px h-4 bg-border" />
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRegenerate}
                  title="Regenerate Code"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
              </div>

              {activeSession.type === "THEORY" && (
                 <Dialog open={showFullQR} onOpenChange={setShowFullQR}>
                  <DialogContent className="max-w-[80vh] w-full aspect-square flex items-center justify-center">
                    <div className="bg-white p-8 rounded-xl">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${activeSession.code}`}
                        alt="Full Session QR Code"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              
              <div className="flex gap-2">
                <AttendanceManager sessionId={activeSession._id} />
                <Button 
                  variant="destructive" 
                  className="flex-1" 
                  onClick={handleEndSession}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  End Operation
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Button 
                className="h-32 flex flex-col gap-3 hover:bg-primary/10 hover:border-primary/50 transition-all" 
                variant="outline"
                onClick={() => handleStartSession("LAB")}
                disabled={isLoading}
              >
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <QrCode className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <div className="font-bold">Start Lab</div>
                  <span className="text-xs text-muted-foreground">Secure QR Mode</span>
                </div>
              </Button>
              <Button 
                className="h-32 flex flex-col gap-3 hover:bg-primary/10 hover:border-primary/50 transition-all" 
                variant="outline"
                onClick={() => handleStartSession("THEORY")}
                disabled={isLoading}
              >
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <Users className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <div className="font-bold">Start Theory</div>
                  <span className="text-xs text-muted-foreground">PIN + QR Mode</span>
                </div>
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
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold">{session.attendanceCount}</div>
                      <div className="text-xs text-muted-foreground">Present</div>
                    </div>
                    <AttendanceManager sessionId={session._id} />
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
              <ReferenceLine 
                y={75} 
                stroke="hsl(var(--destructive))" 
                strokeDasharray="3 3" 
                label={{ value: "Risk Threshold (75%)", position: "insideBottomRight", fill: "hsl(var(--destructive))", fontSize: 12 }} 
              />
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