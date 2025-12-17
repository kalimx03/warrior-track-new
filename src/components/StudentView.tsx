import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, ScanLine, History, Calendar, Clock } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function StudentView() {
  const enrolledCourses = useQuery(api.courses.listEnrolled);
  const allCourses = useQuery(api.courses.listAll);
  const enroll = useMutation(api.courses.enroll);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleEnroll = async (courseId: Id<"courses">) => {
    setIsEnrolling(true);
    try {
      await enroll({ courseId });
      toast.success("Enrolled successfully");
    } catch (error) {
      toast.error("Failed to enroll");
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Warrior Dashboard</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {enrolledCourses?.map((course) => (
          <CourseCard key={course._id} course={course} />
        ))}
        
        <Card className="elevation-1 border-dashed border-2 flex flex-col items-center justify-center p-6 min-h-[200px] hover:bg-muted/50 transition-colors">
          <div className="text-center space-y-4">
            <div className="font-medium">Available Courses</div>
            <div className="space-y-2">
              {allCourses?.filter(c => !enrolledCourses?.some(e => e._id === c._id)).map(course => (
                <div key={course._id} className="flex items-center justify-between gap-4 p-2 bg-background rounded border text-left text-sm">
                  <div>
                    <div className="font-bold">{course.code}</div>
                    <div className="text-muted-foreground truncate max-w-[150px]">{course.name}</div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => handleEnroll(course._id)} disabled={isEnrolling}>
                    Enroll
                  </Button>
                </div>
              ))}
              {(!allCourses || allCourses.length === 0) && (
                <div className="text-sm text-muted-foreground">No new courses available</div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function CourseCard({ course }: { course: any }) {
  const stats = useQuery(api.attendance.getStats, { courseId: course._id });
  const activeSession = useQuery(api.sessions.getActive, { courseId: course._id });
  const history = useQuery(api.attendance.getStudentHistory, { courseId: course._id });
  const markAttendance = useMutation(api.attendance.mark);
  const [pin, setPin] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [isMarking, setIsMarking] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleMarkAttendance = async (codeToUse?: string) => {
    if (!activeSession) return;
    setIsMarking(true);
    try {
      await markAttendance({ 
        sessionId: activeSession._id,
        code: codeToUse || (activeSession.type === "THEORY" ? pin : undefined)
      });
      toast.success("Attendance Marked! Warrior Present.");
      setPin("");
      setQrCode("");
      setIsScanOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark attendance");
    } finally {
      setIsMarking(false);
    }
  };

  const percentage = stats?.percentage || 0;
  const isAtRisk = percentage < 75;

  return (
    <Card className="elevation-2 border-none overflow-hidden flex flex-col">
      <div className={`h-2 w-full ${isAtRisk ? 'bg-destructive' : 'bg-green-500'}`} />
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{course.code}</CardTitle>
            <CardDescription>{course.name}</CardDescription>
          </div>
          <div className={`text-2xl font-bold ${isAtRisk ? 'text-destructive' : 'text-green-600'}`}>
            {percentage.toFixed(0)}%
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Training Completion</span>
            <span className="font-medium">{stats?.attendedSessions}/{stats?.totalSessions} Sessions</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${isAtRisk ? 'bg-destructive' : 'bg-green-500'}`} 
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {activeSession ? (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3 animate-pulse">
            <div className="flex items-center gap-2 text-primary font-medium">
              <ShieldCheck className="h-5 w-5" />
              Active {activeSession.type} Session
            </div>
            
            {activeSession.type === "THEORY" && (
              <div className="space-y-2">
                <Label htmlFor={`pin-${course._id}`}>Enter Session PIN</Label>
                <Input 
                  id={`pin-${course._id}`}
                  placeholder="6-digit code" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={6}
                  className="text-center tracking-widest font-mono"
                />
                <Button className="w-full" onClick={() => handleMarkAttendance()} disabled={isMarking}>
                  {isMarking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Mark Present
                </Button>
              </div>
            )}

            {activeSession.type === "LAB" && (
              <Dialog open={isScanOpen} onOpenChange={setIsScanOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="outline">
                    <ScanLine className="mr-2 h-4 w-4" />
                    Scan QR Code
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Scan Lab QR Code</DialogTitle>
                    <DialogDescription>
                      Enter the code from the General's screen to verify your presence.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>QR Code Content</Label>
                      <Input 
                        placeholder="Scan or enter code..." 
                        value={qrCode}
                        onChange={(e) => setQrCode(e.target.value)}
                      />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => handleMarkAttendance(qrCode)} 
                      disabled={isMarking || !qrCode}
                    >
                      {isMarking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Verify & Mark Attendance
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        ) : (
          <div className="p-4 bg-muted/30 rounded-lg border border-dashed text-center text-muted-foreground text-sm">
            No active session deployed
          </div>
        )}

        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="w-full text-muted-foreground hover:text-primary">
              <History className="mr-2 h-4 w-4" />
              View Attendance History
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Attendance History</DialogTitle>
              <DialogDescription>{course.name} ({course.code})</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {!history ? (
                <div className="text-center py-4">Loading history...</div>
              ) : history.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No sessions recorded yet.</div>
              ) : (
                history.map((session) => (
                  <div key={session._id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${session.status === 'PRESENT' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {session.status === 'PRESENT' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
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
                    <div className={`text-sm font-bold ${session.status === 'PRESENT' ? 'text-green-600' : 'text-destructive'}`}>
                      {session.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}