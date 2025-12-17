import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useNavigate } from "react-router";
import { useEffect } from "react";
import FacultyView from "@/components/FacultyView";
import StudentView from "@/components/StudentView";

export default function Dashboard() {
  const user = useQuery(api.users.viewer);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role === "admin") {
      navigate("/admin-dashboard");
    }
  }, [user, navigate]);

  if (!user) return null; // Or loading spinner

  return (
    <div className="container mx-auto p-4 md:p-8 pt-20">
      {user.role === "faculty" ? <FacultyView /> : <StudentView />}
    </div>
  );
}