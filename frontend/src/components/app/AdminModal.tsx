import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminStats, getAdminUsers, deleteAdminUser, updateAdminUserStatus } from "@/lib/api";
import { ShieldCheck, Users, FileText, FolderGit2, Trash2, RefreshCw, Search, CheckCircle2, XCircle, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminModal({ isOpen, onClose }: AdminModalProps) {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([getAdminStats(), getAdminUsers()]);
      setStats(s);
      setUsers(u);
    } catch (err: any) {
      toast.error(err.message || "Failed to load admin management data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAdminData();
    }
  }, [isOpen]);

  const handleToggleStatus = async (userId: string, currentStatus: boolean, email: string) => {
    if (email.toLowerCase() === "kkssakthikumaran@gmail.com") {
      toast.error("Primary Administrator account status cannot be changed.");
      return;
    }
    const newStatus = !currentStatus;
    try {
      await updateAdminUserStatus(userId, newStatus);
      toast.success(`User ${email} status set to ${newStatus ? "Active" : "Deactivated"}.`);
      loadAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user status.");
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (email.toLowerCase() === "kkssakthikumaran@gmail.com") {
      toast.error("Primary Administrator account cannot be deleted.");
      return;
    }
    if (!confirm(`Are you sure you want to delete user ${email} and all their data?`)) return;

    try {
      await deleteAdminUser(userId);
      toast.success(`User ${email} deleted successfully.`);
      loadAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user.");
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().strip ? searchQuery.toLowerCase().trim() : searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.provider.toLowerCase().includes(q)
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-serif-editorial text-xl">
                  PaperLens System Administrator Panel
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Admin: <span className="font-semibold text-foreground">kkssakthikumaran@gmail.com</span>
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadAdminData}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </DialogHeader>

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-3 my-4">
          <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Total Users</span>
            </div>
            <div className="mt-1 text-2xl font-bold font-serif-editorial text-foreground">
              {stats ? stats.total_users : "—"}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserCheck className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium">Active Users</span>
            </div>
            <div className="mt-1 text-2xl font-bold font-serif-editorial text-foreground">
              {stats ? stats.active_users ?? stats.total_users : "—"}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FolderGit2 className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium">Workspaces</span>
            </div>
            <div className="mt-1 text-2xl font-bold font-serif-editorial text-foreground">
              {stats ? stats.total_workspaces : "—"}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium">Analyzed Papers</span>
            </div>
            <div className="mt-1 text-2xl font-bold font-serif-editorial text-foreground">
              {stats ? stats.total_papers : "—"}
            </div>
          </div>
        </div>

        {/* User Management Table Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">Signed-In Users Directory & Account Controls</h3>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search user name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          <div className="rounded-md border border-border overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-2.5 font-medium">User</th>
                  <th className="p-2.5 font-medium">Provider</th>
                  <th className="p-2.5 font-medium">Joined</th>
                  <th className="p-2.5 font-medium">Last Login</th>
                  <th className="p-2.5 font-medium text-center">Analyses</th>
                  <th className="p-2.5 font-medium text-center">Status</th>
                  <th className="p-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-2.5 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {u.picture ? (
                          <img src={u.picture} alt={u.name} className="h-6 w-6 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-[10px]">
                            {(u.name || u.email).substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-foreground">{u.name || "Scholar User"}</div>
                          <div className="text-[10px] text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-2.5 capitalize text-muted-foreground">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium border border-border">
                        {u.provider}
                      </span>
                    </td>
                    <td className="p-2.5 text-muted-foreground text-[11px]">
                      {new Date(u.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="p-2.5 text-muted-foreground text-[11px]">
                      {u.last_login_at
                        ? new Date(u.last_login_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                        : "Initial Login"}
                    </td>
                    <td className="p-2.5 text-center font-bold font-serif-editorial text-foreground">
                      {u.analyses_count ?? 0}
                    </td>
                    <td className="p-2.5 text-center">
                      {u.is_active !== false ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                          <XCircle className="h-3 w-3" /> Deactivated
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-right space-x-1">
                      {!u.is_admin && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(u.id, u.is_active !== false, u.email)}
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                            title={u.is_active !== false ? "Disable user account" : "Enable user account"}
                          >
                            {u.is_active !== false ? (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                <UserX className="h-3.5 w-3.5" /> Disable
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <UserCheck className="h-3.5 w-3.5" /> Enable
                              </span>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            title="Delete user account"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
