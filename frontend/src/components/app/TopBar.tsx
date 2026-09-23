import { Bell, Menu } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SearchInput } from "./SearchInput";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  title: string;
  eyebrow?: string;
  onToggleSidebar?: () => void;
}

export function TopBar({ title, eyebrow, onToggleSidebar }: Props) {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("paperlens_user");
      if (cached) {
        try {
          setCurrentUser(JSON.parse(cached));
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const initials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "PL";

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-8">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="Open navigation"
        className="grid h-9 w-9 place-items-center rounded-md border border-border text-foreground md:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div className="text-[0.65rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className="truncate font-serif-editorial text-xl text-foreground md:text-2xl">
          {title}
        </h1>
      </div>

      <div className="hidden w-72 md:block">
        <SearchInput placeholder="Search papers, authors, notes…" />
      </div>

      <ThemeToggle />

      <button
        type="button"
        aria-label="Notifications"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
      </button>

      <Link
        to="/settings"
        title="Profile & Settings"
        className="hidden h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground md:grid overflow-hidden hover:opacity-90 transition-opacity"
      >
        {currentUser?.picture ? (
          <img
            src={currentUser.picture}
            alt={currentUser.name || "User"}
            className="h-full w-full object-cover"
          />
        ) : (
          initials
        )}
      </Link>
    </header>
  );
}
