import { NavLink } from "react-router";
import { Scale, Briefcase, FileText, Plus, Gavel, MessageSquare } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import UserMenu from "./user-menu";

export default function Header() {
  const { data: session } = authClient.useSession();
  const role = (session?.user as any)?.role;

  const baseLinks = [{ to: "/", label: "Justitia", icon: Scale }];

  const clientLinks = [
    { to: "/client/dashboard", label: "My Cases", icon: FileText },
    { to: "/client/create-case", label: "Create Case", icon: Plus },
  ];

  const lawyerLinks = [
    { to: "/lawyer/marketplace", label: "Marketplace", icon: Gavel },
    { to: "/lawyer/quotes", label: "My Quotes", icon: MessageSquare },
  ];

  const links = session
    ? [...baseLinks, ...(role === "lawyer" ? lawyerLinks : clientLinks)]
    : baseLinks;

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <nav className="flex items-center gap-1">
            {links.map(({ to, label, icon: Icon }, index) => {
              const isLogo = index === 0;
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isLogo
                        ? "text-lg font-bold text-primary mr-4"
                        : isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`
                  }
                  end={to === "/"}
                >
                  <Icon className={`w-4 h-4 ${isLogo ? "w-5 h-5" : ""}`} />
                  <span>{label}</span>
                </NavLink>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
