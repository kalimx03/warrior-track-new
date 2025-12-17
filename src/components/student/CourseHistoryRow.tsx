import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Flame, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function CourseHistoryRow({ course }: { course: any }) {
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
