import { useEffect } from "react";
import { useNavigate } from "react-router";

import { authClient } from "@/lib/auth-client";

export default function Dashboard() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPending) {
      if (!session) {
        navigate("/login");
      } else {
        // Redirect based on user role
        const role = (session.user as any).role;
        if (role === 'lawyer') {
          navigate("/lawyer/marketplace");
        } else {
          navigate("/client/dashboard");
        }
      }
    }
  }, [session, isPending, navigate]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return null;
}
