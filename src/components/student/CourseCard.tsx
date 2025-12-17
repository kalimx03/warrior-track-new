import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ScanLine, Flame, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { QRScannerFlow } from "@/components/QRScannerFlow";

export function CourseCard({ course }: { course: any }) {
  const stats = useQuery(api.attendance.getStats, { courseId: course._id });
  const activeSession = useQuery(api.sessions.getActive, { courseId: course._id });
  const currentUser = useQuery(api.users.currentUser);
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
                        storedFaceDescriptor={currentUser?.faceDescriptor}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}

            {activeSession.type === "LAB" && (
              <Dialog open={isScanOpen} onOpenChange={setIsScanOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full h-12 text-lg font-semibold shadow-md hover:shadow-lg transition-all" 
                    variant="default" 
                    onClick={() => setScanStep("SCAN_QR")}
                  >
                    <ScanLine className="mr-2 h-5 w-5" />
                    Mark Attendance
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Secure Attendance Verification</DialogTitle>
                    <DialogDescription>
                      Two-step verification: QR Scan + Face ID
                    </DialogDescription>
                  </DialogHeader>
                  
                  <QRScannerFlow 
                    onScanSuccess={async (code) => {
                      setScannedCode(code);
                    }}
                    onComplete={(code) => handleMarkAttendance(code)}
                    mode="LAB"
                    storedFaceDescriptor={currentUser?.faceDescriptor}
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
