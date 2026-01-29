import { useNavigate } from "react-router";
import { Cpu, ShieldCheck, Layers, Zap, ArrowRight, Users, Gavel } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scene } from "@/components/ui/hero-section";

import type { Route } from "./+types/_index";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Justitia - Legal Marketplace" },
    {
      name: "description",
      content:
        "Where law meets equity. Connect with qualified lawyers for your legal needs.",
    },
  ];
}

const features = [
  {
    icon: Cpu,
    title: "Smart Matching",
    description: "AI-powered algorithms connect you with the perfect legal expert for your specific case.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Lawyers",
    description: "Every attorney is thoroughly vetted and licensed to practice in your jurisdiction.",
  },
  {
    icon: Layers,
    title: "Transparent Pricing",
    description: "Compare competitive quotes side-by-side with no hidden fees or surprises.",
  },
  {
    icon: Zap,
    title: "Fast Turnaround",
    description: "Get multiple quotes within 24 hours and start your case immediately.",
  },
];

export default function Home() {
  const { data: session } = authClient.useSession();
  const role = (session?.user as any)?.role;
  const navigate = useNavigate();

  return (
    <div className="min-h-svh w-full bg-linear-to-br from-black to-[#1A2428] text-white flex flex-col items-center justify-center p-4 sm:p-8 -mt-14">
      <div className="w-full max-w-6xl space-y-8 sm:space-y-12 relative z-10 pt-14">
        <div className="flex flex-col items-center text-center space-y-6 sm:space-y-8">
          <Badge
            variant="secondary"
            className="backdrop-blur-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm"
          >
            ✨ Legal Marketplace Reimagined
          </Badge>

          <div className="space-y-4 sm:space-y-6 flex items-center justify-center flex-col">
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-semibold tracking-tight max-w-3xl leading-tight">
              Where law meets equity
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-neutral-300 max-w-2xl px-4">
              A two-sided legal marketplace where clients post cases and lawyers
              submit quotes. Find the right legal help at the right price.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center w-full sm:w-auto px-4 sm:px-0">
              {session ? (
                <Button
                  className="w-full sm:w-auto text-sm px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-white text-black border border-white/10 shadow-none hover:bg-white/90 transition-none"
                  onClick={() =>
                    navigate(
                      role === "lawyer" ? "/lawyer/marketplace" : "/client/dashboard"
                    )
                  }
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <>
                  <Button
                    className="w-full sm:w-auto text-sm px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-white text-black border border-white/10 shadow-none hover:bg-white/90 transition-none"
                    onClick={() => navigate("/signup/client")}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    I Need a Lawyer
                  </Button>
                  <Button
                    className="w-full sm:w-auto text-sm px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-transparent text-white border border-white/20 shadow-none hover:bg-white/10 transition-none"
                    onClick={() => navigate("/signup/lawyer")}
                  >
                    <Gavel className="w-4 h-4 mr-2" />
                    I'm a Lawyer
                  </Button>
                </>
              )}
            </div>
            {!session && (
              <p className="text-xs sm:text-sm text-neutral-400">
                Already have an account?{" "}
                <a href="/login" className="text-white hover:underline font-medium">
                  Sign In
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 max-w-5xl mx-auto px-2 sm:px-0">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 md:p-6 h-32 sm:h-40 md:h-48 flex flex-col justify-start items-start space-y-1.5 sm:space-y-2 md:space-y-3"
            >
              <feature.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white/80" />
              <h3 className="text-xs sm:text-sm md:text-base font-medium">{feature.title}</h3>
              <p className="text-[10px] sm:text-xs md:text-sm text-neutral-400 line-clamp-3">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-0">
        <Scene />
      </div>
    </div>
  );
}