import { useNavigate } from "react-router";
import { Scale, FileCheck, CreditCard, Users, Eye, ArrowRight, Gavel, Briefcase } from "lucide-react";

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
    <div className="min-h-[calc(100vh-80px)]">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-linear-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Scale className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4">
            Justitia
          </h1>
          
          <p className="text-lg text-primary font-medium mb-3 italic">
            "Where law meets equity"
          </p>
          
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            A two-sided legal marketplace where clients post cases and lawyers submit quotes.
            Find the right legal help at the right price.
          </p>
          
          {session ? (
            <Button 
              size="lg" 
              onClick={() => navigate(role === 'lawyer' ? '/lawyer/marketplace' : '/client/dashboard')}
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <div className="flex flex-col gap-4 items-center">
              <div className="flex gap-3">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/signup/client')}
                >
                  <Users className="w-4 h-4 mr-2" />
                  I Need a Lawyer
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => navigate('/signup/lawyer')}
                >
                  <Gavel className="w-4 h-4 mr-2" />
                  I'm a Lawyer
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <a href="/login" className="text-primary hover:underline font-medium">Sign In</a>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-3">
          How It Works
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Get started in minutes with our simple, secure process
        </p>
        
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Client Flow */}
          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>For Clients</CardTitle>
              <CardDescription>Get legal help in 4 simple steps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                "Create an account and describe your legal case",
                "Upload supporting documents (PDF, images)",
                "Review quotes from qualified lawyers",
                "Accept a quote and pay securely with Stripe"
              ].map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{i + 1}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{step}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Lawyer Flow */}
          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
                <Briefcase className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle>For Lawyers</CardTitle>
              <CardDescription>Find new clients and grow your practice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                "Browse the anonymized case marketplace",
                "Submit quotes for cases that match your expertise",
                "Client accepts your quote and pays",
                "Access full case details and documents"
              ].map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{i + 1}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{step}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Trust Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { icon: CreditCard, title: "Secure Payments", desc: "Powered by Stripe" },
            { icon: Eye, title: "Anonymized Cases", desc: "Privacy first" },
            { icon: FileCheck, title: "Secure Documents", desc: "Access controlled" },
          ].map((item, i) => (
            <Card key={i} className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-semibold mb-1">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
