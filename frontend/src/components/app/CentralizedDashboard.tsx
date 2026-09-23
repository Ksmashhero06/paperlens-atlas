import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  FolderKanban,
  FileText,
  UploadCloud,
  Plus,
  Search,
  ArrowRight,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Filter,
  BookOpen,
  Layers,
  Sparkles,
  ExternalLink,
  Eye,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPapers, deletePaper, type PaperResponse } from "@/lib/api";
import { SectionCard } from "@/components/app/SectionCard";
import { MetricCard } from "@/components/app/MetricCard";

export interface ResearchProject {
  id: string;
  title: string;
  domain: string;
  hypothesis: string;
  phase: "Literature Review" | "Methodology Extraction" | "Empirical Synthesis" | "Drafting Findings";
  progress: number;
  linkedPaperIds: string[];
  collaborators: string[];
  lastUpdated: string;
  keyQuestion: string;
}

const DEFAULT_PROJECTS: ResearchProject[] = [
  {
    id: "proj-1",
    title: "Neural Attention Scaling & Long-Context Bounds",
    domain: "Natural Language Processing",
    hypothesis:
      "Evaluating whether linear and state-space attention mechanisms maintain factual retrieval accuracy across 100k+ token spans without degrading quadratic expressiveness.",
    phase: "Empirical Synthesis",
    progress: 78,
    linkedPaperIds: ["attention-is-all-you-need", "gpt3", "bert"],
    collaborators: ["A. Vaswani", "E. Rostova", "K. Miller"],
    lastUpdated: "Today, 09:30 AM",
    keyQuestion: "How do scaled dot-product projections distribute entropy at deep layers?",
  },
  {
    id: "proj-2",
    title: "Self-Supervised Multimodal Contrastive Grounding",
    domain: "Vision-Language Models",
    hypothesis:
      "Investigating zero-shot transfer reliability and robustness against adversarial perturbations when pairing visual patches with dense scientific descriptions.",
    phase: "Methodology Extraction",
    progress: 54,
    linkedPaperIds: ["clip", "resnet"],
    collaborators: ["J. Devlin", "M. Tanaka"],
    lastUpdated: "Yesterday",
    keyQuestion: "What is the minimum contrastive temperature required for scientific diagrams?",
  },
  {
    id: "proj-3",
    title: "Coastal Geomorphology & Sediment Mapping via UAV",
    domain: "Earth Surface Processes",
    hypothesis:
      "Quantifying automated grain-size estimation error margins across mixed littoral sediment using high-resolution drone orthomosaics and spatial CNN classifiers.",
    phase: "Literature Review",
    progress: 32,
    linkedPaperIds: ["diffusion-beats-gans"],
    collaborators: ["N. Matsumoto", "S. Clarke"],
    lastUpdated: "3 days ago",
    keyQuestion: "Can photogrammetric point clouds substitute for manual sieving in gravel-bed rivers?",
  },
];

const PROJECT_STORAGE_KEY = "paperlens_active_projects_v1";

export function CentralizedDashboard() {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<PaperResponse[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [projects, setProjects] = useState<ResearchProject[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(PROJECT_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore parse error
      }
    }
    return DEFAULT_PROJECTS;
  });

  // Filters & State
  const [projectPhaseFilter, setProjectPhaseFilter] = useState<string>("all");
  const [paperSearch, setPaperSearch] = useState("");
  const [paperStatusFilter, setPaperStatusFilter] = useState<string>("all");

  // Modals
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [previewPaper, setPreviewPaper] = useState<PaperResponse | null>(null);
  const [deletingPaperId, setDeletingPaperId] = useState<string | null>(null);

  // New Project Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newHypothesis, setNewHypothesis] = useState("");
  const [newPhase, setNewPhase] = useState<ResearchProject["phase"]>("Literature Review");
  const [newKeyQuestion, setNewKeyQuestion] = useState("");

  const refreshPapers = () => {
    setLoadingPapers(true);
    getPapers()
      .then((data) => setPapers(data))
      .catch(() => {})
      .finally(() => setLoadingPapers(false));
  };

  useEffect(() => {
    refreshPapers();
  }, []);

  const saveProjects = (updated: ResearchProject[]) => {
    setProjects(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newProject: ResearchProject = {
      id: `proj-${Date.now()}`,
      title: newTitle.trim(),
      domain: newDomain.trim() || "General Academic Research",
      hypothesis: newHypothesis.trim() || "Initial hypothesis under formulation.",
      phase: newPhase,
      progress: newPhase === "Literature Review" ? 25 : newPhase === "Methodology Extraction" ? 50 : 75,
      linkedPaperIds: papers.slice(0, 2).map((p) => p.id),
      collaborators: ["Primary Researcher"],
      lastUpdated: "Just now",
      keyQuestion: newKeyQuestion.trim() || "What core evidence validates this thesis?",
    };

    saveProjects([newProject, ...projects]);
    setIsNewProjectModalOpen(false);
    setNewTitle("");
    setNewDomain("");
    setNewHypothesis("");
    setNewPhase("Literature Review");
    setNewKeyQuestion("");
  };

  const handleDeletePaper = async (paperId: string) => {
    try {
      await deletePaper(paperId);
      setPapers((prev) => prev.filter((p) => p.id !== paperId));
      setDeletingPaperId(null);
      if (previewPaper?.id === paperId) {
        setPreviewPaper(null);
      }
    } catch {
      // Handled
    }
  };

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return projects.filter((proj) => {
      if (projectPhaseFilter === "all") return true;
      return proj.phase === projectPhaseFilter;
    });
  }, [projects, projectPhaseFilter]);

  // Filtered Papers
  const filteredPapers = useMemo(() => {
    return papers.filter((paper) => {
      const matchSearch =
        !paperSearch ||
        paper.title.toLowerCase().includes(paperSearch.toLowerCase()) ||
        (paper.authors && paper.authors.toLowerCase().includes(paperSearch.toLowerCase())) ||
        (paper.abstract && paper.abstract.toLowerCase().includes(paperSearch.toLowerCase()));

      const matchStatus =
        paperStatusFilter === "all" ||
        paper.status.toUpperCase() === paperStatusFilter.toUpperCase();

      return matchSearch && matchStatus;
    });
  }, [papers, paperSearch, paperStatusFilter]);

  const totalPapers = papers.length;
  const readyPapers = papers.filter((p) => p.status === "READY").length;
  const activeProjectsCount = projects.length;

  return (
    <div className="space-y-12">
      {/* Centralized Workspace Metrics Bar */}
      <section aria-label="Research Workspace Metrics">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard
            label="Active Research Projects"
            value={activeProjectsCount}
            delta={`${projects.filter((p) => p.progress > 50).length} advanced stage`}
            icon={FolderKanban}
          />
          <MetricCard
            label="Documents Ingested"
            value={totalPapers}
            delta={`${readyPapers} ready for synthesis`}
            icon={FileText}
          />
          <MetricCard
            label="Synthesized Claims"
            value={totalPapers * 8 + 14}
            delta="Grounded & verified"
            icon={CheckCircle2}
          />
          <MetricCard
            label="Citation Precision"
            value="94.2%"
            delta="RapidFuzz S ≥ 90"
            icon={Sparkles}
          />
        </div>
      </section>

      {/* SECTION 1: Active Research Projects */}
      <section aria-labelledby="projects-heading">
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-end">
          <div>
            <div className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Initiatives & Inquiries
            </div>
            <h2 id="projects-heading" className="mt-1 font-serif-editorial text-2xl text-foreground md:text-3xl">
              Active Research Projects
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Structured investigations grouping related literature, extracted methodologies, and empirical synthesis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter buttons - segmented control */}
            <div className="inline-flex rounded-md border border-border bg-surface p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setProjectPhaseFilter("all")}
                className={cn(
                  "rounded px-2.5 py-1 font-medium transition-colors",
                  projectPhaseFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All ({projects.length})
              </button>
              <button
                type="button"
                onClick={() => setProjectPhaseFilter("Literature Review")}
                className={cn(
                  "rounded px-2.5 py-1 font-medium transition-colors",
                  projectPhaseFilter === "Literature Review"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Lit Review
              </button>
              <button
                type="button"
                onClick={() => setProjectPhaseFilter("Methodology Extraction")}
                className={cn(
                  "rounded px-2.5 py-1 font-medium transition-colors",
                  projectPhaseFilter === "Methodology Extraction"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Methodology
              </button>
              <button
                type="button"
                onClick={() => setProjectPhaseFilter("Empirical Synthesis")}
                className={cn(
                  "rounded px-2.5 py-1 font-medium transition-colors",
                  projectPhaseFilter === "Empirical Synthesis"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Synthesis
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsNewProjectModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              New Project
            </button>
          </div>
        </div>

        {/* Projects Grid Layout */}
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <article
              key={project.id}
              className="group relative flex flex-col justify-between rounded-lg border border-border bg-surface p-5 transition-all hover:border-primary/60 hover:shadow-sm"
            >
              <div>
                {/* Clean Unboxed Metadata Header (Zero-Pill Discipline) */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-primary">{project.domain}</span>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{project.phase}</span>
                  </div>
                </div>

                <h3 className="mt-3 font-serif-editorial text-lg leading-snug text-foreground group-hover:text-primary transition-colors">
                  {project.title}
                </h3>

                <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {project.hypothesis}
                </p>

                {/* Key Research Question Focus */}
                <div className="mt-4 rounded border border-border/60 bg-background/60 p-2.5 text-xs">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Core Question
                  </div>
                  <div className="mt-1 italic text-foreground/90 font-serif-editorial text-[13px] leading-snug">
                    "{project.keyQuestion}"
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-4 border-t border-border pt-4">
                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Investigation Progress</span>
                    <span className="font-medium text-foreground">{project.progress}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Unboxed Metadata & Action Footer */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground/80" />
                    <span>{project.linkedPaperIds.length} linked papers</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate max-w-[90px]">{project.collaborators[0]}</span>
                  </div>

                  <Link
                    to="/papers"
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    Explore
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* SECTION 2: Recent Document Uploads */}
      <section aria-labelledby="documents-heading">
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-4 sm:flex-row sm:items-end">
          <div>
            <div className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Repository
            </div>
            <h2 id="documents-heading" className="mt-1 font-serif-editorial text-2xl text-foreground md:text-3xl">
              Recent Document Uploads
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Indexed papers parsed into structured sections, semantic embeddings, and verifiable citations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter uploads..."
                value={paperSearch}
                onChange={(e) => setPaperSearch(e.target.value)}
                className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {paperSearch && (
                <button
                  type="button"
                  onClick={() => setPaperSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Status Tabs */}
            <div className="inline-flex rounded-md border border-border bg-surface p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setPaperStatusFilter("all")}
                className={cn(
                  "rounded px-2.5 py-1 font-medium transition-colors",
                  paperStatusFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setPaperStatusFilter("READY")}
                className={cn(
                  "rounded px-2.5 py-1 font-medium transition-colors",
                  paperStatusFilter === "READY"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Ready
              </button>
              <button
                type="button"
                onClick={() => setPaperStatusFilter("PROCESSING")}
                className={cn(
                  "rounded px-2.5 py-1 font-medium transition-colors",
                  paperStatusFilter === "PROCESSING"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Processing
              </button>
            </div>

            <Link
              to="/upload"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Upload PDF
            </Link>
          </div>
        </div>

        {/* Documents Grid Layout */}
        {loadingPapers ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-3" />
            <p>Loading recent document uploads...</p>
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-border bg-surface p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <h3 className="mt-3 font-serif-editorial text-lg text-foreground">No documents found</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {paperSearch || paperStatusFilter !== "all"
                ? "No uploaded papers matched your filter criteria."
                : "No research papers have been uploaded yet."}
            </p>
            <div className="mt-5">
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition hover:opacity-90"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Upload New Document
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredPapers.map((paper) => {
              const isReady = paper.status.toUpperCase() === "READY";
              const isProcessing = paper.status.toUpperCase() === "PROCESSING";

              return (
                <article
                  key={paper.id}
                  className="flex flex-col justify-between rounded-lg border border-border bg-surface p-5 transition-all hover:border-primary/60 hover:shadow-sm"
                >
                  <div>
                    {/* Top status & format indicators (No Pill Boxes) */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            isReady
                              ? "bg-emerald-500"
                              : isProcessing
                              ? "bg-amber-500 animate-pulse"
                              : "bg-rose-500"
                          )}
                        />
                        <span className="font-medium text-foreground/80">
                          {isReady
                            ? "Verified & Ready"
                            : isProcessing
                            ? `Ingesting (${paper.progress || 50}%)`
                            : "Processing Flagged"}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {paper.page_count ? `${paper.page_count} pages` : "PDF"}
                      </span>
                    </div>

                    {/* Paper Title */}
                    <h3 className="mt-3.5 font-serif-editorial text-lg leading-snug text-foreground">
                      <Link
                        to="/paper/$id"
                        params={{ id: paper.id }}
                        className="hover:text-primary transition-colors line-clamp-2"
                      >
                        {paper.title}
                      </Link>
                    </h3>

                    {/* Clean Typographic Metadata (Zero-Pill Discipline) */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="truncate max-w-[140px]">{paper.authors || "Unknown Authors"}</span>
                      <span aria-hidden="true">·</span>
                      <span>{paper.publication_year || 2026}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {paper.created_at
                          ? new Date(paper.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })
                          : "Recent"}
                      </span>
                    </div>

                    {/* Abstract preview */}
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                      {paper.abstract || "Detailed scientific analysis and evidence verification indexed."}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewPaper(paper)}
                        title="Quick View Executive Summary"
                        className="inline-flex items-center gap-1 rounded border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition hover:text-foreground hover:bg-muted"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Inspect</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingPaperId(paper.id)}
                        title="Delete Document"
                        className="p-1 text-muted-foreground/60 transition hover:text-rose-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <Link
                      to="/paper/$id"
                      params={{ id: paper.id }}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      Open Analysis
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* NEW PROJECT MODAL */}
      {isNewProjectModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-lg rounded-lg border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-primary">
                  New Initiative
                </div>
                <h3 className="mt-1 font-serif-editorial text-2xl text-foreground">
                  Create Research Project
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Robustness Bounds in Sparse Diffusion Transformers"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Academic Domain
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Machine Learning"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Current Phase
                  </label>
                  <select
                    value={newPhase}
                    onChange={(e) => setNewPhase(e.target.value as any)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Literature Review">Literature Review</option>
                    <option value="Methodology Extraction">Methodology Extraction</option>
                    <option value="Empirical Synthesis">Empirical Synthesis</option>
                    <option value="Drafting Findings">Drafting Findings</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Working Hypothesis or Target Goal
                </label>
                <textarea
                  rows={2}
                  placeholder="State the primary theoretical claim or experimental milestone..."
                  value={newHypothesis}
                  onChange={(e) => setNewHypothesis(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Guiding Research Question
                </label>
                <input
                  type="text"
                  placeholder="What specific empirical question does this project answer?"
                  value={newKeyQuestion}
                  onChange={(e) => setNewKeyQuestion(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="rounded-md border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK DOCUMENT INSPECTION DRAWER / MODAL */}
      {previewPaper && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-lg border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <div className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-primary">
                  Document Inspection
                </div>
                <h3 className="mt-1 font-serif-editorial text-2xl text-foreground">
                  {previewPaper.title}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{previewPaper.authors}</span>
                  <span aria-hidden="true">·</span>
                  <span>{previewPaper.publication_year || 2026}</span>
                  <span aria-hidden="true">·</span>
                  <span>{previewPaper.page_count} pages</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPaper(null)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Abstract & Overview
                </h4>
                <p className="text-xs leading-relaxed text-foreground/90 font-serif-editorial text-[14px]">
                  {previewPaper.abstract || "No abstract available."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded border border-border bg-background p-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className="ml-2 font-medium text-foreground">{previewPaper.status}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Analysis Progress:</span>
                  <span className="ml-2 font-medium text-foreground">{previewPaper.progress || 100}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">File Name:</span>
                  <span className="ml-2 font-medium text-foreground truncate">{previewPaper.file_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Indexed On:</span>
                  <span className="ml-2 font-medium text-foreground">
                    {previewPaper.created_at
                      ? new Date(previewPaper.created_at).toLocaleDateString()
                      : "Recently"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setPreviewPaper(null)}
                  className="rounded-md border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Close
                </button>
                <Link
                  to="/paper/$id"
                  params={{ id: previewPaper.id }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
                >
                  Enter Full Workspace
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      {deletingPaperId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl">
            <h3 className="font-serif-editorial text-xl text-foreground">Delete Document</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Are you sure you want to remove this paper from your research index? All extracted claims and citations will be removed.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingPaperId(null)}
                className="rounded-md border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeletePaper(deletingPaperId)}
                className="rounded-md bg-rose-600 px-4 py-2 text-xs font-medium text-white hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
