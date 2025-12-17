import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, Calendar as CalendarIcon, History } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { motion, AnimatePresence } from "framer-motion";
import { FaceRegistration } from "./FaceRegistration";
import { NotificationsPopover } from "./student/NotificationsPopover";
import { CourseCard } from "./student/CourseCard";
import { CourseHistoryRow } from "./student/CourseHistoryRow";

export default function StudentView() {
  const enrolledCourses = useQuery(api.courses.listEnrolled);
  const allCourses = useQuery(api.courses.listAll);
  const allAttendance = useQuery(api.attendance.getAllStudentAttendance);
  const currentUser = useQuery(api.users.currentUser);
  const enroll = useMutation(api.courses.enroll);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [showFaceRegistration, setShowFaceRegistration] = useState(false);

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
        <div className="flex items-center gap-2">
          {!currentUser?.faceDescriptor && (
            <Dialog open={showFaceRegistration} onOpenChange={setShowFaceRegistration}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="animate-pulse">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Register Face ID
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Register Face ID</DialogTitle>
                  <DialogDescription>
                    Secure your account with biometric verification for lab access.
                  </DialogDescription>
                </DialogHeader>
                <FaceRegistration onComplete={() => setShowFaceRegistration(false)} />
              </DialogContent>
            </Dialog>
          )}
          <NotificationsPopover />
        </div>
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