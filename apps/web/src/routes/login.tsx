import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export default function Login() {
  const [showSignIn, setShowSignIn] = useState(true);
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();

  // Redirect logged-in users to their dashboard
  useEffect(() => {
    if (!isPending && session) {
      const role = (session.user as any)?.role;
      if (role === 'lawyer') {
        navigate('/lawyer/marketplace');
      } else {
        navigate('/client/dashboard');
      }
    }
  }, [session, isPending, navigate]);

  // Show loading while checking session
  if (isPending) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If logged in, will redirect (show nothing to prevent flash)
  if (session) {
    return null;
  }

  return showSignIn ? (
    <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
  ) : (
    <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
  );
}
