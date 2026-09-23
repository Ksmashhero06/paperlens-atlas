import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Search,
  Trash2,
  ExternalLink,
  ArrowRight,
  HardDrive,
  CheckCircle2,
  Clock,
  Download,
  AlertCircle,
  RefreshCw,
  Layers,
  Sparkles,
  Calendar,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  getLocalUserAppData,
  deletePaperFromUserStorage,
  pullFromGoogleDrive,
  getCurrentUserEmail,
  type UserPaperRecord,
} from "@/lib/drive-appdata";
import { getPapers, type PaperListItemResponse } from "@/lib/api";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [{ title: "Analysis History | PaperLens Atlas" }],
  }),
  component: AnalysisHistoryPage,
});

function formatDate(dateStr?: string) {
  if (!dateStr) return "Recent";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function AnalysisHistoryPage() {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<UserPaperRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title">("newest");
  const [syncingDrive, setSyncingDrive] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // Pull latest from user-owned storage
      const userState = getLocalUserAppData();
      const combinedPapers: UserPaperRecord[] = [...userState.papers];

      // Also incorporate any papers from the server API that belong to this session
      try {
        const serverPapers = await getPapers();
        const existingIds = new Set(combinedPapers.map((p) => p.id));
        for (const sp of serverPapers) {
          if (!existingIds.has(sp.id)) {
            combinedPapers.push({
              id: sp.id,
              title: sp.title,
              authors: sp.authors,
              file_name: sp.file_name,
              file_size: sp.file_size,
              page_count: sp.page_count,
              status: sp.status === "READY" ? "READY" : sp.status === "FAILED" ? "FAILED" : "PROCESSING",
              stage: sp.status,
              created_at: sp.created_at,
              updated_at: sp.created_at,
            });
          }
        }
      } catch (err) {
        // Local user storage remains intact
      }

      setPapers(combinedPapers);
    } catch (err: any) {
      toast.error("Failed to load analysis history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleSyncDrive = async () => {
    setSyncingDrive(true);
    try {
      const refreshed = await pullFromGoogleDrive();
      setPapers(refreshed.papers);
      toast.success("Synchronized with your Google Drive AppData!");
    } catch (err: any) {
      toast.error(err.message || "Failed to sync with Google Drive.");
    } finally {
      setSyncingDrive(false);
    }
  };

  const handleDeletePaper = async (e: React.MouseEvent, paperId: string, title: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to remove "${title}" from your analysis history?`)) return;

    try {
      await deletePaperFromUserStorage(paperId);
      setPapers((prev) => prev.filter((p) => p.id !== paperId));
      toast.success("Paper analysis removed from your history.");
    } catch (err: any) {
      toast.error("Failed to remove paper.");
    }
  };

  const handleExportHistory = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(papers, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `paperlens_analysis_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Analysis history exported to JSON.");
  };

  // Filter & sort
  const filteredPapers = useMemo(() => {
    let result = papers.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        (p.authors && p.authors.toLowerCase().includes(q)) ||
        p.file_name.toLowerCase().includes(q) ||
        (p.objective && p.objective.toLowerCase().includes(q))
      );
    });

    if (statusFilter !== "ALL") {
      result = result.filter((p) => p.status === statusFilter);
    }

    result.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      const timeA = new Date(a.updated_at || a.created_at).getTime();
      const timeB = new Date(b.updated_at || b.created_at).getTime();
      return sortBy === "newest" ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [papers, searchQuery, statusFilter, sortBy]);

  const userEmail = getCurrentUserEmail();

  return (
    <AppShell eyebrow="Research Archive" title="Analysis History">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary uppercase tracking-wider">
              <HardDrive className="h-3.5 w-3.5" />
              <span>User-Owned Google Account Storage</span>
            </div>
            <h1 className="font-serif-editorial text-3xl text-foreground mt-1">
              Analysis History
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {userEmail ? `Stored under ${userEmail} · ` : ""}
              Review previous analyses, extracted methodologies, and grounded Q&A sessions.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncDrive}
              disabled={syncingDrive}
              className="text-xs h-8 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncingDrive ? "animate-spin" : ""}`} />
              {syncingDrive ? "Syncing Drive..." : "Sync Drive"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportHistory}
              disabled={papers.length === 0}
              className="text-xs h-8 gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export History
            </Button>
            <Button
              size="sm"
              onClick={() => navigate({ to: "/upload" })}
              className="text-xs h-8 gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Analyze New Paper
            </Button>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-surface/50 p-3 rounded-lg border border-border">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by paper title, author, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9 bg-background"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-md border border-border bg-background px-2.5 py-1.5 text-foreground focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="READY">Completed</option>
              <option value="PROCESSING">In Progress</option>
              <option value="FAILED">Failed</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs rounded-md border border-border bg-background px-2.5 py-1.5 text-foreground focus:outline-hidden"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* History List */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
            <p className="text-xs text-muted-foreground">Loading your analysis history...</p>
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface/30 p-12 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="font-serif-editorial text-lg text-foreground">No Analysis History Found</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {searchQuery
                ? "No papers matched your search query. Try clearing your filters."
                : "You haven't analyzed any research papers yet. Upload your first PDF to generate structure-aware insights and grounded Q&A."}
            </p>
            {!searchQuery && (
              <Button
                size="sm"
                onClick={() => navigate({ to: "/upload" })}
                className="mt-2 text-xs"
              >
                Analyze Paper Now
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPapers.map((p) => {
              const isReady = p.status === "READY";
              const isFailed = p.status === "FAILED";
              const statusLabel = isReady ? "Completed" : isFailed ? "Failed" : "Processing";

              return (
                <div
                  key={p.id}
                  onClick={() => navigate({ to: "/paper/$id", params: { id: p.id } })}
                  className="group relative rounded-lg border border-border bg-surface hover:border-primary/50 transition-all p-4.5 cursor-pointer shadow-2xs hover:shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            isReady
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : isFailed
                              ? "bg-destructive/10 text-destructive border border-destructive/20"
                              : "bg-primary/10 text-primary border border-primary/20"
                          }`}
                        >
                          {isReady && <CheckCircle2 className="h-2.5 w-2.5" />}
                          {statusLabel}
                        </span>

                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Analyzed: {formatDate(p.created_at)}
                        </span>

                        {p.page_count && (
                          <span className="text-[11px] text-muted-foreground">
                            · {p.page_count} {p.page_count === 1 ? "page" : "pages"}
                          </span>
                        )}
                      </div>

                      <h2 className="font-serif-editorial text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {p.title}
                      </h2>

                      {p.authors && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          By {p.authors}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleDeletePaper(e, p.id, p.title)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Delete from history"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs h-7 gap-1"
                        onClick={() => navigate({ to: "/paper/$id", params: { id: p.id } })}
                      >
                        <span>Open</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Objective or Contribution Snippet if present */}
                  {p.objective && (
                    <div className="rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground line-clamp-2">
                      <span className="font-medium text-foreground">Objective: </span>
                      {p.objective}
                    </div>
                  )}

                  {/* Footer metadata */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 pt-1 border-t border-border/50">
                    <span className="truncate max-w-xs">File: {p.file_name}</span>
                    <span className="flex items-center gap-1 text-primary text-xs font-medium group-hover:underline">
                      Revisit Paper Analysis →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
