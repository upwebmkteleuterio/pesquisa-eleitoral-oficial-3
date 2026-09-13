import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { submissionService } from "../services/submissionService";

export default function AutomaticSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let disposed = false;

    const synchronize = async () => {
      try {
        await submissionService.syncAll();
      } catch (error) {
        console.error("[AutomaticSync] Failed to sync pending submissions", error);
      } finally {
        if (!disposed) {
          void queryClient.invalidateQueries({ queryKey: ["submissions"] });
        }
      }
    };

    const handleOnline = () => {
      void synchronize();
    };

    void synchronize();
    window.addEventListener("online", handleOnline);

    return () => {
      disposed = true;
      window.removeEventListener("online", handleOnline);
    };
  }, [queryClient]);

  return null;
}
