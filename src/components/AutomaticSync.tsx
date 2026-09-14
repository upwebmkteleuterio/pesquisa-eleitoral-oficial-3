import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { audioReconciliationService } from "../services/audioReconciliationService";
import { submissionService } from "../services/submissionService";

export default function AutomaticSync() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    let disposed = false;
    let activeRun: Promise<void> | null = null;

    const synchronize = () => {
      if (disposed || !navigator.onLine || activeRun) return;

      const run = (async () => {
        try {
          await submissionService.syncAll();
        } catch {
          // Background failures must not interrupt the reconciliation attempt.
        }

        if (disposed || !navigator.onLine) return;

        try {
          await audioReconciliationService.reconcile(user.id);
        } catch {
          return;
        }

        if (!disposed) {
          void queryClient.invalidateQueries({ queryKey: ["submissions"] });
        }
      })();

      activeRun = run.finally(() => {
        activeRun = null;
      });
    };

    synchronize();
    window.addEventListener("online", synchronize);

    return () => {
      disposed = true;
      window.removeEventListener("online", synchronize);
    };
  }, [queryClient, user?.id]);

  return null;
}
