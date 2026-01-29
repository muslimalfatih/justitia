import { NavLink } from "react-router";
import { Scale, Briefcase, FileText, Plus, Gavel, MessageSquare, Menu, X } from "lucide-react";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import UserMenu from "./user-menu";

interface HeaderProps {
  transparent?: boolean;
}

export default function Header({ transparent = false }: HeaderProps) {
  const { data: session } = authClient.useSession();
  const role = (session?.user as any)?.role;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const navLinks = links.slice(1); // Links without logo

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors",
        transparent
          ? mobileMenuOpen
            ? "bg-black/80 backdrop-blur-md border-transparent"
            : "bg-transparent border-transparent"
          : "bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <NavLink
            to="/"
            className={cn(
              "flex items-center gap-2 text-lg font-bold transition-colors",
              transparent ? "text-white" : "text-primary"
            )}
          >
            <Scale className="w-5 h-5" />
            <span>Justitia</span>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    transparent
                      ? isActive
                        ? "bg-white/20 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                      : isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <div className={transparent ? "[&_button]:text-white [&_button]:border-white/20 [&_button:hover]:bg-white/10" : ""}>
              <UserMenu />
            </div>
            
            {/* Mobile menu button */}
            {navLinks.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "md:hidden",
                  transparent && "text-white hover:bg-white/10"
                )}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && navLinks.length > 0 && (
          <nav
            className={cn(
              "md:hidden pb-4 space-y-1",
              transparent ? "border-t border-white/10" : "border-t"
            )}
          >
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors mt-2",
                    transparent
                      ? isActive
                        ? "bg-white/20 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                      : isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
