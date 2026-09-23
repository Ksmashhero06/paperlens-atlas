import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  UploadCloud,
  Library,
  BookOpen,
  History,
  HardDrive,
  User,
} from "lucide-react";
import { Sidebar } from "@/components/app/Sidebar";
import { SearchInput } from "@/components/app/SearchInput";
import { CentralizedDashboard } from "@/components/app/CentralizedDashboard";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview · PaperLens" },
      {
        name: "description",
        content:
          "Your research workspace overview: upload papers, review recent work, and continue reading in PaperLens.",
      },
      { property: "og:title", content: "Overview · PaperLens" },
      {
        property: "og:description",
        content: "Your research workspace overview in PaperLens.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-y-0 left-0 z-30 hidden w-60 md:block">
        <Sidebar />
      </div>

      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-foreground/40 transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-64 transition-transform",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar onNavigate={() => setOpen(false)} />
        </div>
      </div>

      <div className="md:pl-60">
        <DashboardHeader onOpenSidebar={() => setOpen(true)} />

        <main className="mx-auto w-full max-w-6xl px-4 pb-20 md:px-8">
          <UploadSection />

          <div className="mt-12">
            <CentralizedDashboard />
          </div>
        </main>
      </div>
    </div>
  );
}

function DashboardHeader({ onOpenSidebar }: { onOpenSidebar: () => void }) {
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

  const userName = currentUser?.name ? currentUser.name.split(" ")[0] : "Researcher";
  const initials = currentUser?.name
    ? currentUser.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "PL";

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-start gap-4 px-4 py-8 md:grid-cols-[minmax(0,1fr)_auto] md:px-8 md:py-10">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Open navigation"
            className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border text-foreground md:hidden"
          >
            <BookOpen className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground flex items-center gap-1.5">
              <span>Research Workspace</span>
              {currentUser && (
                <span className="inline-flex items-center gap-1 text-[10px] text-primary">
                  · <HardDrive className="h-2.5 w-2.5" /> Google Drive AppData
                </span>
              )}
            </div>
            <h1 className="mt-1 font-serif-editorial text-3xl leading-tight text-foreground md:text-4xl">
              Welcome back, {userName}.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-[15px]">
              Understand your papers faster. Explore, question, and extract grounded findings with user-owned storage.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden md:block md:w-64">
            <SearchInput placeholder="Search papers, authors, sections..." />
          </div>
          <button
            type="button"
            aria-label="Notifications"
            className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
          </button>
          <Link
            to="/settings"
            title="Account & Profile Settings"
            className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity overflow-hidden"
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
        </div>
      </div>
    </header>
  );
}

function DocumentMark() {
  return (
    <svg viewBox="0 0 120 140" className="h-32 w-auto text-foreground/25" fill="none" aria-hidden>
      <rect
        x="14"
        y="10"
        width="82"
        height="112"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.2"
        className="fill-background"
      />
      <rect
        x="22"
        y="18"
        width="90"
        height="112"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.2"
        className="fill-surface"
      />
      <path
        d="M32 40h60M32 50h60M32 60h60M32 70h44M32 86h60M32 96h60M32 106h36"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path d="M32 28h28" stroke="var(--terracotta)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function UploadSection() {
  return (
    <section className="mt-10 overflow-hidden rounded-lg border border-border bg-surface">
      <div className="grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-10">
        <div className="max-w-xl">
          <div className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Primary action
          </div>
          <h2 className="mt-2 font-serif-editorial text-2xl leading-tight text-foreground md:text-3xl">
            Start with a research paper
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-[15px]">
            Upload a PDF to generate a structured 10-field summary, extract methodology, and ask
            grounded questions.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              <UploadCloud className="h-4 w-4" /> Upload PDF
            </Link>
            <Link
              to="/papers"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <Library className="h-4 w-4" /> Browse My Papers
            </Link>
            <Link
              to="/history"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <History className="h-4 w-4 text-primary" /> Analysis History
            </Link>
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
            PDF up to 20 MB
            <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
            Structure-aware AI analysis
          </div>
        </div>

        <div className="hidden justify-end md:flex">
          <DocumentMark />
        </div>
      </div>
    </section>
  );
}

