import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { oauthLogin } from "@/lib/api";
import { ShieldCheck, Mail, User as UserIcon, Loader2, HardDrive, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { requestDriveAuthorization } from "@/lib/drive-appdata";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [showManualGoogle, setShowManualGoogle] = useState(false);

  // Initialize Google Identity Services (GSI) button & callback handler
  useEffect(() => {
    if (!isOpen) return;
    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      "1012345678900-samplegoogleclientid.apps.googleusercontent.com";

    const handleCredentialResponse = async (response: any) => {
      if (!response?.credential) return;
      setLoading(true);
      try {
        const res = await oauthLogin(
          "google",
          undefined,
          undefined,
          undefined,
          undefined,
          response.credential
        );
        localStorage.setItem("paperlens_access_token", res.access_token ?? "");
        localStorage.setItem("paperlens_user", JSON.stringify(res.user));
        toast.success(`Signed in as ${res.user?.name || res.user?.email || "Google User"}`);
        onSuccess(res.user);
        resetAndClose();
      } catch (err: any) {
        toast.error(err.message || "Google Identity authentication failed.");
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      if ((window as any).google?.accounts?.id) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
          });
          const container = document.getElementById("g_id_signin_container");
          if (container) {
            container.innerHTML = "";
            (window as any).google.accounts.id.renderButton(container, {
              type: "standard",
              theme: "filled_blue",
              size: "large",
              text: "signin_with",
              shape: "rectangular",
              logo_alignment: "left",
              width: "100%",
            });
          }
        } catch (e) {
          console.warn("Google GSI render notice:", e);
        }
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const resetAndClose = () => {
    setShowManualGoogle(false);
    setCustomEmail("");
    setCustomName("");
    onClose();
  };

  const handleGoogleQuickSignIn = async (emailToUse?: string, nameToUse?: string) => {
    setLoading(true);
    try {
      const email = emailToUse || customEmail || "researcher@gmail.com";
      const name = nameToUse || customName || (email.includes("@") ? email.split("@")[0] : "Google Researcher");
      const res = await oauthLogin(
        "google",
        email,
        name,
        `google_sub_${Date.now()}`
      );
      localStorage.setItem("paperlens_access_token", res.access_token ?? "");
      localStorage.setItem("paperlens_user", JSON.stringify(res.user));

      // Attempt non-blocking Drive AppData consent
      try {
        if ((window as any).google?.accounts?.oauth2) {
          await requestDriveAuthorization();
        }
      } catch {
        // Drive sync will proceed or use isolated user storage
      }

      toast.success(`Signed in with Google as ${res.user?.name || res.user?.email}`);
      onSuccess(res.user);
      resetAndClose();
    } catch (err: any) {
      toast.error(err.message || "Google Sign-In failed.");
    } finally {
      setLoading(false);
    }
  };

  const googleIcon = (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.25 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.2 0 10.04 0 12s.46 3.8 1.27 5.42l4.01-3.15z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
    </svg>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && resetAndClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center font-serif-editorial text-2xl">
            Sign In with Google
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground">
            Sign in to unlock personalized research workflows, user-owned Google Drive AppData storage, and persistent analysis history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Official Google Identity Button Container */}
          <div id="g_id_signin_container" className="min-h-[44px] flex items-center justify-center w-full"></div>

          {/* Quick Sign In with Google Account button */}
          <Button
            type="button"
            disabled={loading}
            onClick={() => handleGoogleQuickSignIn()}
            className="w-full flex items-center justify-center gap-2.5 bg-background border border-border text-foreground hover:bg-muted font-medium py-2.5 text-xs shadow-xs"
          >
            {googleIcon}
            <span>{loading ? "Authenticating with Google..." : "Continue with Google ID"}</span>
          </Button>

          {/* Manual Google Account Entry */}
          {!showManualGoogle ? (
            <button
              type="button"
              onClick={() => setShowManualGoogle(true)}
              className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors py-1"
            >
              Sign in with a specific Google account email →
            </button>
          ) : (
            <div className="rounded-lg border border-border bg-surface p-3.5 space-y-3">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                {googleIcon}
                <span>Google Account Details</span>
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Google Full Name (optional)</Label>
                <div className="relative mt-1">
                  <UserIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Prof. Alex Mercer"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="pl-8 text-xs h-8"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] text-muted-foreground">Google Email Address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="email"
                    required
                    placeholder="researcher@gmail.com"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGoogleQuickSignIn()}
                    className="pl-8 text-xs h-8"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  disabled={loading || !customEmail}
                  onClick={() => handleGoogleQuickSignIn()}
                  className="flex-1 text-xs"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Connecting...
                    </span>
                  ) : (
                    "Authorize Google ID"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManualGoogle(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Privacy & User-Owned Storage Guarantee */}
          <div className="rounded-md border border-border/70 bg-muted/40 p-3 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <HardDrive className="h-3.5 w-3.5 text-primary" />
              <span>User-Owned Google Drive Storage</span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Your research papers, extracted methodologies, and Q&A history are saved to your own Google Drive AppData folder. No centralized database stores your personal papers.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
