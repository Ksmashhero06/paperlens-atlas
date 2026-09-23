import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { SectionCard } from "@/components/app/SectionCard";
import {
  Sun,
  Moon,
  Download,
  Trash2,
  Camera,
  Activity,
  CheckCircle2,
  RefreshCw,
  Server,
  LogOut,
  HardDrive,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { getSystemHealth, type SystemHealthResponse } from "@/lib/api";
import { applyTheme, getStoredTheme, type ThemeMode } from "@/lib/theme";
import { toast } from "sonner";
import { requestDriveAuthorization } from "@/lib/drive-appdata";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · PaperLens" },
      {
        name: "description",
        content: "Manage your PaperLens profile, workspace, appearance, and reading preferences.",
      },
      { property: "og:title", content: "Settings · PaperLens" },
      {
        property: "og:description",
        content: "Manage your PaperLens profile, workspace, and preferences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition ${
          checked ? "left-[1.125rem]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-sm text-foreground">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function SettingsPage() {
  const navigate = useNavigate();
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [defaultView, setDefaultView] = useState("grid");
  const [autoOpen, setAutoOpen] = useState(true);
  const [showSources, setShowSources] = useState(true);
  const [chatHistory, setChatHistory] = useState(true);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const handleSignOut = () => {
    localStorage.removeItem("paperlens_access_token");
    localStorage.removeItem("paperlens_user");
    sessionStorage.removeItem("paperlens_drive_access_token");
    toast.success("Signed out successfully.");
    navigate({ to: "/" });
  };

  const handleAuthorizeDrive = async () => {
    try {
      await requestDriveAuthorization();
      toast.success("Google Drive AppData authorized!");
    } catch (err: any) {
      toast.error(err.message || "Google Drive authorization failed.");
    }
  };

  const handleSetTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    applyTheme(mode);
  };

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const h = await getSystemHealth();
      setHealth(h);
    } catch {
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    const currentTheme = getStoredTheme();
    setThemeState(currentTheme);
    applyTheme(currentTheme);

    fetchHealth();
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("paperlens_user");
      if (cached) {
        try {
          setCurrentUser(JSON.parse(cached));
        } catch {
          setCurrentUser(null);
        }
      }
    }
  }, []);

  const userName = currentUser?.name || "Sakthi Kumaran";
  const userEmail = currentUser?.email || "kkssakthikumaran@gmail.com";
  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <AppShell eyebrow="Account" title="Settings">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Profile */}
        <SectionCard eyebrow="Profile" title="Google Account Details">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {currentUser?.picture ? (
                  <img
                    src={currentUser.picture}
                    alt={userName}
                    className="h-16 w-16 rounded-full object-cover border-2 border-primary/20"
                  />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                    {initials}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-background border border-border shadow-xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="text-sm font-semibold text-foreground">{userName}</div>
                <div className="text-xs text-muted-foreground">{userEmail}</div>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Google ID Authenticated
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
                    <HardDrive className="h-2.5 w-2.5" /> Google Drive AppData
                  </span>
                  {currentUser?.role === "admin" && (
                    <span className="inline-flex items-center rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:text-purple-300 border border-purple-500/20">
                      Admin Access
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAuthorizeDrive}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <HardDrive className="h-3.5 w-3.5 text-primary" />
                <span>Sync Drive</span>
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* User-Owned Storage Banner Requirement */}
          <div className="mt-4 rounded-md border border-border/80 bg-muted/30 p-3.5 space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <HardDrive className="h-4 w-4 text-primary" />
              <span>Your PaperLens research data is stored in your Google Account.</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pl-6">
              Papers uploaded, full-text extractions, section indices, and interactive Q&A history are saved to your private Google Drive AppData folder. Your research remains confidential and user-owned.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Google Name">
              <input className={inputCls} value={userName} readOnly />
            </Field>
            <Field label="Google Email">
              <input type="email" className={inputCls} value={userEmail} readOnly />
            </Field>
          </div>
        </SectionCard>

        {/* Workspace */}
        <SectionCard eyebrow="Workspace" title="Workspace settings">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Workspace name">
              <input className={inputCls} defaultValue={`${userName.split(" ")[0]}'s Research Workspace`} />
            </Field>

            <Field label="Default paper view" hint="How papers appear in your library.">
              <select
                className={inputCls}
                value={defaultView}
                onChange={(e) => setDefaultView(e.target.value)}
              >
                <option value="grid">Grid</option>
                <option value="list">List</option>
                <option value="compact">Compact</option>
              </select>
            </Field>
          </div>
        </SectionCard>

        {/* Appearance */}
        <SectionCard eyebrow="Appearance" title="Theme">
          <div className="grid gap-3 sm:grid-cols-2">
            {(["light", "dark"] as const).map((mode) => {
              const active = theme === mode;
              const Icon = mode === "light" ? Sun : Moon;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleSetTheme(mode)}
                  className={`flex items-center gap-3 rounded-md border px-4 py-3 text-left transition ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  <div
                    className={`grid h-9 w-9 place-items-center rounded-md ${
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium capitalize text-foreground">
                      {mode} mode
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {mode === "light"
                        ? "Warm ivory editorial surface."
                        : "Charcoal surface for low light."}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* Preferences */}
        <SectionCard eyebrow="Preferences" title="Analysis behavior">
          <div className="divide-y divide-border">
            <ToggleRow
              title="Automatically open analysis after processing"
              description="Jump straight into a paper once PaperLens finishes structuring it."
              checked={autoOpen}
              onChange={setAutoOpen}
            />
            <ToggleRow
              title="Show source references"
              description="Display citation cards with page and section for every answer."
              checked={showSources}
              onChange={setShowSources}
            />
            <ToggleRow
              title="Enable chat history"
              description="Keep your questions and answers per paper for later review."
              checked={chatHistory}
              onChange={setChatHistory}
            />
          </div>
        </SectionCard>

        {/* System & Backend Health */}
        <SectionCard eyebrow="Diagnostics" title="System & AI Service Status">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Live backend health check from FastAPI & Database
              </div>
              <button
                type="button"
                onClick={fetchHealth}
                disabled={healthLoading}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground hover:bg-muted"
              >
                <RefreshCw className={`h-3 w-3 ${healthLoading ? "animate-spin" : ""}`} />
                Check Status
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-border bg-background p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                  <Server className="h-3.5 w-3.5" /> Backend Service
                </div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <span className={`h-2 w-2 rounded-full ${health?.status === "ok" ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {health?.status === "ok" ? "Healthy (Active)" : healthLoading ? "Checking..." : "Offline"}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                  {health?.environment || "Development"} mode
                </div>
              </div>

              <div className="rounded-md border border-border bg-background p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                  <Activity className="h-3.5 w-3.5" /> Database Engine
                </div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {health?.database || "Connected (Active)"}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  16 Relational Models
                </div>
              </div>

              <div className="rounded-md border border-border bg-background p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> AI Inference Engine
                </div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {health?.ai_service || "Local + Gemini Fallback"}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Structure-Aware Grounded
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Data */}
        <SectionCard eyebrow="Data" title="Manage your data">
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="text-sm text-foreground">Export workspace</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Download a copy of your papers, notes, and chat history.
                </div>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="text-sm text-foreground">Delete all papers</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Permanently remove every paper and its analysis. This cannot be undone.
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  window.confirm("Delete all papers? This will permanently remove your library.")
                }
                className="inline-flex items-center gap-2 rounded-md border border-destructive/40 bg-background px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                Delete all
              </button>
            </div>
          </div>
        </SectionCard>

        <div className="flex justify-end gap-2 pb-4">
          <button className="rounded-md border border-border bg-surface px-4 py-2 text-sm text-foreground hover:bg-muted">
            Cancel
          </button>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Save changes
          </button>
        </div>
      </div>
    </AppShell>
  );
}
