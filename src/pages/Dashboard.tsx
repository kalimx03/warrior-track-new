import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Navigate } from "react-router";
import FacultyView from "@/components/FacultyView";
import StudentView from "@/components/StudentView";
import { Button } from "@/components/ui/button";
import { LogOut, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Dashboard() {
  const { user, isLoading, signOut } = useAuth();
  const updateRole = useMutation(api.users.updateRole); // We need to add this mutation

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading Command Center...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  // Temporary role selection for MVP if role is not set
  if (!user.role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="max-w-md w-full p-8 bg-card rounded-xl shadow-lg space-y-6 text-center">
          <Shield className="w-16 h-16 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">Identify Yourself</h1>
          <p className="text-muted-foreground">Select your role to proceed to the command center.</p>
          <div className="grid gap-4">
            <Button 
              size="lg" 
              className="w-full" 
              onClick={() => updateRole({ role: "faculty" })}
            >
              I am a General (Faculty)
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full"
              onClick={() => updateRole({ role: "student" })}
            >
              I am a Warrior (Student)
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10">
      <header className="bg-card border-b sticky top-0 z-10 elevation-1">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg tracking-tight">Team Zenith</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground hidden md:block">
              {user.name || user.email}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image} alt={user.name} />
                    <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {user.role === "faculty" ? <FacultyView /> : <StudentView />}
      </main>
    </div>
  );
}
