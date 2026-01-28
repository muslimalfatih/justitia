import { useNavigate } from "react-router";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { Route } from "./+types/_index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Justitia - Legal Marketplace" },
    { name: "description", content: "Where law meets equity. Connect with qualified lawyers for your legal needs." },
  ];
}

export default function Home() {
  const { data: session } = authClient.useSession();
  const role = (session?.user as any)?.role;
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-80px)] bg-linear-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          Justitia
        </h1>
        <p className="text-xl text-muted-foreground mb-2">
          "Where law meets equity"
        </p>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          A two-sided legal marketplace where clients post cases and lawyers submit quotes.
          Find the right legal help at the right price.
        </p>
        
        {session ? (
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate(role === 'lawyer' ? '/lawyer/marketplace' : '/client/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/login')}>
              Get Started
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Client Flow */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">👤</span> For Clients
              </CardTitle>
              <CardDescription>Get legal help in 4 simple steps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <span className="font-bold text-primary">1.</span>
                <p>Create an account and describe your legal case</p>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-primary">2.</span>
                <p>Upload supporting documents (PDF, images)</p>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-primary">3.</span>
                <p>Review quotes from qualified lawyers</p>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-primary">4.</span>
                <p>Accept a quote and pay securely with Stripe</p>
              </div>
            </CardContent>
          </Card>

          {/* Lawyer Flow */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">⚖️</span> For Lawyers
              </CardTitle>
              <CardDescription>Find new clients and grow your practice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <span className="font-bold text-primary">1.</span>
                <p>Browse the anonymized case marketplace</p>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-primary">2.</span>
                <p>Submit quotes for cases that match your expertise</p>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-primary">3.</span>
                <p>Client accepts your quote and pays</p>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-primary">4.</span>
                <p>Access full case details and documents</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Trust Section */}
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
          <div>
            <p className="text-3xl font-bold text-primary">🔒</p>
            <p className="font-medium mt-2">Secure Payments</p>
            <p className="text-sm text-muted-foreground">Powered by Stripe</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-primary">🕵️</p>
            <p className="font-medium mt-2">Anonymized Cases</p>
            <p className="text-sm text-muted-foreground">Privacy first</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-primary">📄</p>
            <p className="font-medium mt-2">Secure Documents</p>
            <p className="text-sm text-muted-foreground">Access controlled</p>
          </div>
        </div>
      </div>
    </div>
  );
}
