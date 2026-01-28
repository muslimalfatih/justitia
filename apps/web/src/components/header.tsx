import { NavLink } from "react-router";

import { authClient } from "@/lib/auth-client";
import UserMenu from "./user-menu";

export default function Header() {
  const { data: session } = authClient.useSession();
  const role = (session?.user as any)?.role;

  const baseLinks = [{ to: "/", label: "Justitia" }];

  const clientLinks = [
    { to: "/client/dashboard", label: "My Cases" },
    { to: "/client/create-case", label: "Create Case" },
  ];

  const lawyerLinks = [
    { to: "/lawyer/marketplace", label: "Marketplace" },
    { to: "/lawyer/quotes", label: "My Quotes" },
  ];

  const links = session
    ? [...baseLinks, ...(role === "lawyer" ? lawyerLinks : clientLinks)]
    : baseLinks;

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-4 py-3 bg-background border-b">
        <nav className="flex gap-6 text-lg items-center">
          {links.map(({ to, label }, index) => {
            return (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `${isActive ? "font-bold text-primary" : "text-muted-foreground hover:text-foreground"} ${index === 0 ? "text-xl font-semibold text-foreground" : ""}`
                }
                end={to === "/"}
              >
                {label}
              </NavLink>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
