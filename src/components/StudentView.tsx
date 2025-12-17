import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, ScanLine, History, Calendar as CalendarIcon, Clock, Flame, Trophy, Bell, ChevronDown, ChevronUp, Camera } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useRef } from "react";
import { QRScannerFlow } from "./QRScannerFlow";

export default function StudentView() {
  const enrolledCourses = useQuery(api.courses.listEnrolled);
  const allCourses = useQuery(api.courses.listAll);
  const allAttendance = useQuery(api.attendance.getAllStudentAttendance);
  const enroll = useMutation(api.courses.enroll);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());

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

  // Process attendance for calendar
  const attendanceDates = allAttendance?.map(a => new Date(a.timestamp)) || [];
  
  const getDayContent = (day: Date) => {
    const dayAttendance = allAttendance?.filter(a => 
      new Date(a.timestamp).toDateString() === day.toDateString()
    );
    
    if (dayAttendance && dayAttendance.length > 0) {
      return (
        <div className="relative flex items-center justify-center w-full h-full">
          {day.getDate()}
          <div className="absolute bottom-1 flex gap-0.5">
            {dayAttendance.map((_, i) => (
              <div key={i} className="h-1 w-1 rounded-full bg-green-500" />
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Warrior Dashboard</h1>
        <NotificationsPopover />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Active Deployments
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <AnimatePresence>
              {enrolledCourses?.map((course, index) => (
                <motion.div
                  key={course._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <CourseCard course={course} />
                </motion.div>
              ))}
            </AnimatePresence>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (enrolledCourses?.length || 0) * 0.1 }}
            >
              <Card className="elevation-1 border-dashed border-2 flex flex-col items-center justify-center p-6 min-h-[200px] hover:bg-muted/50 transition-colors h-full">
                <div className="text-center space-y-4 w-full">
                  <div className="font-medium">Available Courses</div>
                  <div className="space-y-2">
                    {allCourses?.filter(c => !enrolledCourses?.some(e => e._id === c._id)).map(course => (
                      <div key={course._id} className="flex items-center justify-between gap-4 p-2 bg-background rounded border text-left text-sm">
                        <div className="overflow-hidden">
                          <div className="font-bold truncate">{course.code}</div>
                          <div className="text-muted-foreground truncate text-xs">{course.name}</div>
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
            </motion.div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Attendance Log
          </h2>
          <Card className="elevation-2 border-none">
            <CardContent className="p-4 flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
                components={{
                  DayButton: (props) => {
                    const content = getDayContent(props.day.date);
                    return (
                      <CalendarDayButton {...props}>
                        {content || props.children}
                      </CalendarDayButton>
                    );
                  }
                }}
              />
            </CardContent>
            <div className="px-6 pb-4 text-sm text-muted-foreground text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Present</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Detailed Attendance Record
        </h2>
        <Card className="elevation-1 border-none">
          <CardContent className="p-0">
            <div className="divide-y">
              {enrolledCourses?.map((course) => (
                <CourseHistoryRow key={course._id} course={course} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CourseHistoryRow({ course }: { course: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const history = useQuery(api.attendance.getStudentHistory, { courseId: course._id });
  const stats = useQuery(api.attendance.getStats, { courseId: course._id });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-4 flex-1">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span className="sr-only">Toggle</span>
            </Button>
          </CollapsibleTrigger>
          <div>
            <div className="font-semibold">{course.code}</div>
            <div className="text-sm text-muted-foreground">{course.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-6 mr-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium">Attendance</div>
            <div className={`text-lg font-bold ${(stats?.percentage || 0) < 75 ? 'text-destructive' : 'text-green-600'}`}>
              {(stats?.percentage || 0).toFixed(0)}%
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium">Streak</div>
            <div className="text-lg font-bold text-orange-500 flex items-center justify-end gap-1">
              <Flame className="h-4 w-4" />
              {stats?.currentStreak || 0}
            </div>
          </div>
        </div>
      </div>
      <CollapsibleContent>
        <div className="px-4 pb-4 pt-0 pl-16">
          <div className="rounded-md border bg-muted/20">
            {!history ? (
              <div className="p-4 text-center text-sm">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">No sessions recorded yet.</div>
            ) : (
              <div className="divide-y">
                {history.map((session) => (
                  <div key={session._id} className="flex items-center justify-between p-3 text-sm">
                    <div className="flex items-center gap-3">
                      <Badge variant={session.type === 'LAB' ? 'secondary' : 'outline'} className="w-16 justify-center">
                        {session.type}
                      </Badge>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {new Date(session.startTime).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div className={`font-bold flex items-center gap-2 ${session.status === 'PRESENT' ? 'text-green-600' : 'text-destructive'}`}>
                      {session.status === 'PRESENT' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      {session.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function NotificationsPopover() {
  const notifications = useQuery(api.notifications.list);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications === undefined ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div 
                  key={notification._id} 
                  className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${!notification.isRead ? 'bg-primary/5' : ''}`}
                  onClick={() => !notification.isRead && markAsRead({ notificationId: notification._id })}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {notification.type === 'SESSION_START' && <Clock className="h-3 w-3 text-blue-500" />}
                        {notification.type === 'SESSION_END' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                        {notification.type === 'ALERT' && <AlertCircle className="h-3 w-3 text-destructive" />}
                        <p className={`text-sm ${!notification.isRead ? 'font-semibold' : 'font-medium'}`}>
                          {notification.title}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function CourseCard({ course }: { course: any }) {
  const stats = useQuery(api.attendance.getStats, { courseId: course._id });
  const activeSession = useQuery(api.sessions.getActive, { courseId: course._id });
  const markAttendance = useMutation(api.attendance.mark);
  const [pin, setPin] = useState("");
  const [isMarking, setIsMarking] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  
  // New state for the scanning flow
  const [scanStep, setScanStep] = useState<"IDLE" | "SCAN_QR" | "VERIFY_FACE" | "SUCCESS">("IDLE");
  const [scannedCode, setScannedCode] = useState("");
  const [scannerError, setScannerError] = useState("");

  // Reset state when dialog closes
  useEffect(() => {
    if (!isScanOpen) {
      setScanStep("IDLE");
      setScannedCode("");
      setScannerError("");
    }
  }, [isScanOpen]);

  const handleMarkAttendance = async (codeToUse?: string) => {
    if (!activeSession) return;
    
    setIsMarking(true);
    try {
      await markAttendance({ 
        sessionId: activeSession._id,
        code: codeToUse || (activeSession.type === "THEORY" && !codeToUse ? pin : undefined)
      });
      toast.success("Attendance Marked! Warrior Present.");
      setPin("");
      setIsScanOpen(false);
      setScanStep("SUCCESS");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark attendance");
      // If error occurs during the final step, go back to idle or handle gracefully
      if (scanStep === "VERIFY_FACE") {
         setScanStep("IDLE");
      }
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <Card className="elevation-2 border-none overflow-hidden flex flex-col h-full hover:shadow-lg transition-all duration-300">
      <div className={`h-2 w-full ${(stats?.percentage || 0) < 75 ? 'bg-destructive' : 'bg-green-500'}`} />
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{course.code}</CardTitle>
            <CardDescription>{course.name}</CardDescription>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${(stats?.percentage || 0) < 75 ? 'text-destructive' : 'text-green-600'}`}>
              {(stats?.percentage || 0).toFixed(0)}%
            </div>
            <div className="flex flex-col items-end gap-1 mt-1">
              {(stats?.currentStreak || 0) > 0 && (
                <div className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                  <Flame className="h-3 w-3 fill-orange-500" />
                  {stats?.currentStreak} Day Streak
                </div>
              )}
              {(stats?.longestStreak || 0) > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                  <Trophy className="h-3 w-3" />
                  Best: {stats?.longestStreak} Days
                </div>
              )}
            </div>
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
              className={`h-full transition-all duration-500 ${(stats?.percentage || 0) < 75 ? 'bg-destructive' : 'bg-green-500'}`} 
              style={{ width: `${stats?.percentage || 0}%` }}
            />
          </div>
        </div>

        {activeSession ? (
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3"
          >
            <div className="flex items-center gap-2 text-primary font-medium animate-pulse">
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
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => handleMarkAttendance()} disabled={isMarking || pin.length !== 6}>
                    {isMarking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Submit PIN
                  </Button>
                  <Dialog open={isScanOpen} onOpenChange={setIsScanOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" onClick={() => setScanStep("SCAN_QR")}>
                        <ScanLine className="mr-2 h-4 w-4" />
                        Scan QR
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Scan Theory QR Code</DialogTitle>
                        <DialogDescription>
                          Scan the code displayed on the screen.
                        </DialogDescription>
                      </DialogHeader>
                      <QRScannerFlow 
                        onScanSuccess={(code) => {
                          setScannedCode(code);
                          handleMarkAttendance(code);
                        }}
                        mode="THEORY"
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}

            {activeSession.type === "LAB" && (
              <Dialog open={isScanOpen} onOpenChange={setIsScanOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="outline" onClick={() => setScanStep("SCAN_QR")}>
                    <ScanLine className="mr-2 h-4 w-4" />
                    Scan QR Code
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Attendance Verification</DialogTitle>
                    <DialogDescription>
                      Complete the security check to mark attendance.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <QRScannerFlow 
                    onScanSuccess={async (code) => {
                      setScannedCode(code);
                      // After QR scan, automatically trigger face verification then submit
                      // The flow is handled inside QRScannerFlow component or we can manage it here
                      // For simplicity, we'll let the component handle the transition
                    }}
                    onComplete={(code) => handleMarkAttendance(code)}
                    mode="LAB"
                  />
                </DialogContent>
              </Dialog>
            )}
          </motion.div>
        ) : (
          <div className="p-4 bg-muted/30 rounded-lg border border-dashed text-center text-muted-foreground text-sm">
            No active session deployed
          </div>
        )}
      </CardContent>
    </Card>
  );
}