import React from "react";
import Image from "next/image";
import { Card } from "@/src/components/ui/Card";
import ThemeToggle from "@/src/components/ThemeToggle";
import { cn } from "@/src/lib/utils";
import loginBackground from "@/src/assets/images/login-background.png";
import doxiClubLightLogo from "@/src/assets/images/doxi-club-light.png";
import doxiClubDarkLogo from "@/src/assets/images/doxi-club-dark.png";

interface AuthShellProps {
  children: React.ReactNode;
  footer: React.ReactNode;
  /** "narrow" = centered small card (login); "wide" = large card (cadastro). */
  variant?: "narrow" | "wide";
}

/** Shared frame for public auth pages: background, theme toggle, logo, card and footer card. */
export function AuthShell({ children, footer, variant = "wide" }: AuthShellProps) {
  const isNarrow = variant === "narrow";

  return (
    <div
      className={cn("cad-page", isNarrow && "cad-page--centered")}
      style={{ backgroundImage: `url(${loginBackground.src})` }}
    >
      <ThemeToggle variant="floating" />

      <header className="cad-header">
        <div className="cad-logo-wrap">
          <Image src={doxiClubLightLogo} alt="Doxi Club" priority className="login-logo-light" />
          <Image src={doxiClubDarkLogo} alt="Doxi Club" priority className="login-logo-dark" />
        </div>
      </header>

      <div className={cn("cad-card-wrap", isNarrow && "cad-card-wrap--narrow")}>
        <Card>{children}</Card>
      </div>

      <footer className={cn("cad-footer", isNarrow && "cad-footer--narrow")}>
        <Card>{footer}</Card>
      </footer>
    </div>
  );
}
