"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Piano, LogOut, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/library", label: "Library" },
  { href: "/stats", label: "Stats" },
];

export function SiteHeader({ role }: { role: Role | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const isOwner = role === "owner";

  if (pathname === "/login") return null;

  async function handleLogout() {
    await fetch("/api/login", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Piano className="size-5 text-primary" />
          <span>Piano Log</span>
          {role === "visitor" && (
            <Badge variant="secondary" className="font-normal">
              Visitor
            </Badge>
          )}
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                pathname === link.href && "bg-secondary text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          {isOwner && (
            <>
              <Link
                href="/new"
                className={buttonVariants({ size: "sm", className: "hidden sm:inline-flex" })}
              >
                <Plus className="size-4" />
                New take
              </Link>
              <Link
                href="/new"
                aria-label="New take"
                className={buttonVariants({ size: "icon", variant: "secondary", className: "sm:hidden" })}
              >
                <Plus className="size-4" />
              </Link>
            </>
          )}
          <ThemeToggle />
          <Button variant="ghost" size="icon" aria-label="Log out" onClick={handleLogout}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border/60 px-4 py-1.5 sm:hidden">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              pathname === link.href && "bg-secondary text-foreground"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
