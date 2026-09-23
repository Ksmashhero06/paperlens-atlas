import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FileText, UploadCloud, X, ShieldCheck, ArrowRight, RotateCw, CheckCircle2, Circle, Loader2, HardDrive } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { cn } from "@/lib/utils";
import { ErrorState, SuccessState } from "@/components/app/states/StatePanels";
import {
  getPaperStatus,
  retryPaperPipeline,
  uploadPaper,
  getPaper,
  getPaperAnalysis,
  type PaperStatusResponse,
  type PaperUploadResponse,
} from "@/lib/api";
import { savePaperToUserStorage } from "@/lib/drive-appdata";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Analyze a Research Paper · PaperLens" },
      {
        name: "description",
        content: "Upload a PDF and PaperLens will structure the document for AI-powered analysis.",
      },
      { property: "og:title", content: "Analyze a Research Paper · PaperLens" },
      {
        property: "og:description",
        content: "Upload a PDF and PaperLens will structure the document for AI-powered analysis.",
      },
    ],
  }),
  component: UploadPage,
});

const MAX_MB = 20;

const STAGE_LABELS: Record<string, string> = {
  UPLOADING: "Uploading document",
  EXTRACTING: "Extracting text and pages",
  STRUCTURING: "Detecting scientific sections",
  CHUNKING: "Performing structure-aware chunking",
  EMBEDDING: "Generating vector embeddings",
  ANALYZING: "Generating 10-field structured analysis",
  READY: "Ready for analysis",
  FAILED: "Processing failed",
};

const STAGE_INDEXES: Record<string, number> = {
  UPLOADING: 0,
  EXTRACTING: 1,
  STRUCTURING: 2,
  CHUNKING: 3,
  EMBEDDING: 4,
  ANALYZING: 5,
  READY: 6,
  FAILED: -1,
};

const STAGE_STEPS = [
  "Uploading document",
  "Extracting text and pages",
  "Detecting scientific sections",
  "Performing structure-aware chunking",
  "Generating vector embeddings",
  "Generating 10-field structured analysis",
  "Ready for analysis",
];

type Phase = "idle" | "selected" | "uploading" | "processing" | "done" | "processing-failed";


interface SelectedFile {
  raw: File;
  name: string;
  sizeBytes: number;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function UploadPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<SelectedFile | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paperId, setPaperId] = useState<string | null>(null);
  const [statusResponse, setStatusResponse] = useState<PaperStatusResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = (rawFile: File) => {
    setErrorMessage(null);
    const isPdf = rawFile.name.toLowerCase().endsWith(".pdf") || rawFile.type === "application/pdf";
    if (!isPdf) {
      setErrorMessage("Only PDF files are supported.");
      return;
    }
    if (rawFile.size > MAX_MB * 1024 * 1024) {
      setErrorMessage(`File size exceeds limit of ${MAX_MB}MB.`);
      return;
    }
    setFile({ raw: rawFile, name: rawFile.name, sizeBytes: rawFile.size });
    setPhase("selected");
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) {
      acceptFile(dropped[0]);
    }
  };

  const clearAll = () => {
    setFile(null);
    setPhase("idle");
    setErrorMessage(null);
    setPaperId(null);
    setStatusResponse(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const startUploadAndAnalyze = async () => {
    if (!file) return;
    setPhase("uploading");
    setErrorMessage(null);

    try {
      const uploadResp = await uploadPaper(file.raw);
      setPaperId(uploadResp.paper_id);
      setPhase("processing");
      toast.success("Paper uploaded successfully", {
        description: "Background processing and indexing started.",
      });
    } catch (err: any) {
      setPhase("processing-failed");
      setErrorMessage(err.message || "Failed to upload paper.");
    }
  };

  // Status Polling Effect
  useEffect(() => {
    if (phase !== "processing" || !paperId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const statusData = await getPaperStatus(paperId);
        if (!isMounted) return;

        setStatusResponse(statusData);

        if (statusData.status === "READY") {
          setPhase("done");
          clearInterval(interval);
          // Persist analysis result to user-owned Google Drive AppData
          try {
            getPaper(paperId).then((fullPaper) => {
              getPaperAnalysis(paperId).then((fullAnalysis) => {
                savePaperToUserStorage({
                  id: paperId,
                  title: fullPaper?.title || file?.name?.replace(/\.pdf$/i, "") || "Untitled Paper",
                  authors: fullPaper?.authors,
                  abstract: fullPaper?.abstract,
                  publication_year: fullPaper?.publication_year,
                  file_name: fullPaper?.file_name || file?.name || "document.pdf",
                  file_size: fullPaper?.file_size || file?.sizeBytes || 0,
                  page_count: fullPaper?.page_count || 1,
                  status: "READY",
                  stage: "READY",
                  progress: 100,
                  created_at: fullPaper?.created_at || new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  summary: fullAnalysis?.summary,
                  objective: fullAnalysis?.summary?.objective,
                  contributions: fullAnalysis?.summary?.key_contributions,
                  methodology: fullAnalysis?.summary?.methodology_summary,
                  dataset: fullAnalysis?.summary?.dataset,
                  results: fullAnalysis?.summary?.key_results,
                  limitations: fullAnalysis?.summary?.limitations,
                });
              }).catch(() => {
                if (fullPaper) {
                  savePaperToUserStorage({
                    id: paperId,
                    title: fullPaper.title,
                    authors: fullPaper.authors,
                    file_name: fullPaper.file_name,
                    page_count: fullPaper.page_count,
                    status: "READY",
                    progress: 100,
                    created_at: fullPaper.created_at,
                    updated_at: new Date().toISOString(),
                  });
                }
              });
            }).catch(() => {});
          } catch (e) {
            console.warn("Could not auto-save to user storage:", e);
          }
        } else if (statusData.status === "FAILED") {
          setPhase("processing-failed");
          setErrorMessage(statusData.processing_error || "Paper processing pipeline failed.");
          clearInterval(interval);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setPhase("processing-failed");
        setErrorMessage(err.message || "Error checking paper processing status.");
        clearInterval(interval);
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [phase, paperId]);

  const handleRetry = async () => {
    if (!paperId) {
      if (file) startUploadAndAnalyze();
      return;
    }
    setPhase("processing");
    setErrorMessage(null);
    try {
      await retryPaperPipeline(paperId);
      toast.success("Retry pipeline started.");
    } catch (err: any) {
      setPhase("processing-failed");
      setErrorMessage(err.message || "Failed to launch pipeline retry.");
    }
  };

  const stepIndex = statusResponse ? (STAGE_INDEXES[statusResponse.stage] ?? 1) : 0;
  const currentStageLabel = statusResponse
    ? (STAGE_LABELS[statusResponse.stage] ?? "Processing paper...")
    : "Uploading document";
  const progressPercent = statusResponse ? statusResponse.progress : 15;

  return (
    <AppShell eyebrow="Paper Intake" title="Analyze Paper">
      <div className="mx-auto max-w-2xl">
        <header className="border-b border-border/60 pb-5">
          <h1 className="font-serif-editorial text-3xl text-foreground">
            Analyze a Research Paper
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a PDF and PaperLens will detect sections, generate structure-aware chunking,
            create embeddings, and extract key insights.
          </p>
        </header>

        <div className="mt-8 space-y-6">
          {/* Failure State */}
          {phase === "processing-failed" && (
            <ErrorState
              title="Analysis could not be completed"
              description={errorMessage || "We ran into an issue while processing your paper."}
              onRetry={handleRetry}
              secondaryLabel="Choose Another Paper"
              onSecondary={clearAll}
            />
          )}

          {/* Success State */}
          {phase === "done" && paperId && (
            <SuccessState
              title="Paper analysis ready!"
              description="Sections, embeddings, 10-field summary, and grounded Q&A indexes have been successfully created."
              primary={
                <button
                  type="button"
                  onClick={() => navigate({ to: "/paper/$id", params: { id: paperId } })}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  Open Paper <ArrowRight className="h-4 w-4" />
                </button>
              }
              secondary={
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Upload Another
                </button>
              }
            />
          )}

          {/* Processing State */}
          {(phase === "uploading" || phase === "processing") && (
            <div className="rounded-lg border border-border bg-surface p-8 shadow-xs space-y-6">
              <div className="text-center space-y-1">
                <div className="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-primary">
                  Processing Pipeline Active
                </div>
                <h2 className="font-serif-editorial text-2xl text-foreground">
                  Analyzing Research Paper
                </h2>
                <p className="text-xs text-muted-foreground">
                  &quot;{file?.name ?? "PDF Document"}&quot; · {currentStageLabel}
                </p>
              </div>

              {/* Exact structured extraction & analysis checklist */}
              <div className="mx-auto max-w-sm rounded-md border border-border/70 bg-background/60 p-5 space-y-3">
                {[
                  { id: "upload", label: "Uploading PDF", threshold: 0 },
                  { id: "extract", label: "Extracting text", threshold: 1 },
                  { id: "analyze", label: "Analyzing paper", threshold: 2 },
                  { id: "index", label: "Building research index", threshold: 4 },
                  { id: "insights", label: "Preparing insights", threshold: 5 },
                ].map((step) => {
                  const isDone = stepIndex > step.threshold;
                  const isActive = stepIndex === step.threshold || (step.id === "analyze" && (stepIndex === 2 || stepIndex === 3));

                  return (
                    <div
                      key={step.id}
                      className={cn(
                        "flex items-center gap-3 text-sm transition-colors",
                        isDone
                          ? "text-foreground font-medium"
                          : isActive
                          ? "text-primary font-semibold"
                          : "text-muted-foreground/60"
                      )}
                    >
                      {isDone ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                      ) : isActive ? (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        </div>
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center text-muted-foreground/40">
                          <Circle className="h-3 w-3" />
                        </div>
                      )}
                      <span>{step.label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="w-full max-w-sm mx-auto space-y-2 pt-1">
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(progressPercent, 10)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                  <span>Stage: {currentStageLabel}</span>
                  <span className="font-medium">{progressPercent}%</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                <HardDrive className="h-3.5 w-3.5 text-primary" />
                <span>Results will be saved to your Google Drive AppData folder upon completion</span>
              </div>
            </div>
          )}


          {/* File Selected State */}
          {phase === "selected" && file && (
            <div className="rounded-lg border border-border bg-surface p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border bg-background text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-serif-editorial text-lg text-foreground">{file.name}</h3>
                    <p className="text-xs text-muted-foreground">{formatSize(file.sizeBytes)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-border/40 pt-4">
                <button
                  type="button"
                  onClick={clearAll}
                  className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={startUploadAndAnalyze}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  Start Analysis <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Upload Dropzone (Idle State) */}
          {phase === "idle" && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition cursor-pointer",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border/80 bg-surface hover:border-primary/50 hover:bg-surface/80",
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) acceptFile(e.target.files[0]);
                }}
              />

              <div className="grid h-14 w-14 place-items-center rounded-full border border-border bg-background text-muted-foreground group-hover:text-primary transition">
                <UploadCloud className="h-6 w-6" />
              </div>

              <h2 className="mt-4 font-serif-editorial text-xl text-foreground">
                Drop your research paper PDF here
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                or click to browse files (PDF up to {MAX_MB}MB)
              </p>

              {errorMessage && (
                <div className="mt-4 text-xs font-medium text-destructive">{errorMessage}</div>
              )}

              <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-[color:var(--sage)]" />
                <span>Isolated workspace processing · Non-source storage safe</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
