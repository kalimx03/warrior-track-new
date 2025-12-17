import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Activity, Calendar, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

export default function AdminDashboard() {
  const stats = useQuery(api.admin.getSystemStats);
  
  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Command Center</h1>
          <p className="text-muted-foreground">System-wide monitoring and control</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-4 py-1">Admin Mode Active</Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalStudents || 0} Students, {stats?.totalFaculty || 0} Faculty
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeSessions || 0}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSessions || 0}</div>
            <p className="text-xs text-muted-foreground">Lifetime sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Records</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAttendanceRecords || 0}</div>
            <p className="text-xs text-muted-foreground">Total check-ins</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="sessions">Session Logs</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>
        
        <TabsContent value="sessions" className="space-y-4">
          <SessionLogs />
        </TabsContent>
        
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Operational metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">Database Connection</div>
                  <div className="text-sm text-muted-foreground">Convex Cloud</div>
                </div>
                <Badge className="bg-green-500">Operational</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">Face Recognition API</div>
                  <div className="text-sm text-muted-foreground">face-api.js models</div>
                </div>
                <Badge className="bg-green-500">Loaded</Badge>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">QR Generation Service</div>
                  <div className="text-sm text-muted-foreground">goqr.me / internal</div>
                </div>
                <Badge className="bg-green-500">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UserManagement() {
  const users = useQuery(api.admin.getAllUsers);
  const updateUserRole = useMutation(api.admin.updateUserRole);
  const deleteFaceId = useMutation(api.admin.deleteUserFaceId);

  const handleRoleChange = async (userId: Id<"users">, newRole: string) => {
    try {
      await updateUserRole({ userId, role: newRole });
      toast.success("User role updated");
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const handleResetFaceId = async (userId: Id<"users">) => {
    if (!confirm("Are you sure you want to delete this user's Face ID? They will need to re-register.")) return;
    try {
      await deleteFaceId({ userId });
      toast.success("Face ID reset");
    } catch (error) {
      toast.error("Failed to reset Face ID");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>Manage roles and biometric data</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Face ID</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user._id}>
                <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <select 
                    className="bg-transparent border rounded p-1 text-sm"
                    value={user.role || "user"}
                    onChange={(e) => handleRoleChange(user._id, e.target.value)}
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                </TableCell>
                <TableCell>
                  {user.faceDescriptor ? (
                    <Badge variant="default" className="bg-green-500">Registered</Badge>
                  ) : (
                    <Badge variant="secondary">Not Set</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {user.faceDescriptor && (
                      <Button variant="destructive" size="sm" onClick={() => handleResetFaceId(user._id)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Reset Face
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SessionLogs() {
  const sessions = useQuery(api.admin.getAllSessions, { limit: 20 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Sessions</CardTitle>
        <CardDescription>Global session activity log</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>Code</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions?.map((session) => (
              <TableRow key={session._id}>
                <TableCell>
                  <div className="font-medium">{session.courseCode}</div>
                  <div className="text-xs text-muted-foreground">{session.courseName}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={session.type === "LAB" ? "default" : "secondary"}>
                    {session.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  {session.isActive ? (
                    <Badge className="bg-green-500 animate-pulse">Active</Badge>
                  ) : (
                    <Badge variant="outline">Ended</Badge>
                  )}
                </TableCell>
                <TableCell>{new Date(session.startTime).toLocaleString()}</TableCell>
                <TableCell className="font-mono">{session.code || "Dynamic"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
