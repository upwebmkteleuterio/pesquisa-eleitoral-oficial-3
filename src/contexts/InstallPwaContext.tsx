import { createContext, ReactNode, useContext, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

interface InstallPwaContextValue {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  isDismissed: boolean;
  dismiss: () => void;
  install: () => Promise<boolean>;
}

const InstallPwaContext = createContext<InstallPwaContextValue | undefined>(undefined);

function isStandalone() {
  const supportsDisplayMode = typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches;
  return supportsDisplayMode ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InstallPwaProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(isStandalone);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    if (!isStandalone()) {
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    }
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const dismiss = () => setIsDismissed(true);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return choice.outcome === "accepted";
  };

  return (
    <InstallPwaContext.Provider value={{ deferredPrompt, isInstalled, isDismissed, dismiss, install }}>
      {children}
    </InstallPwaContext.Provider>
  );
}

export function useInstallPwa() {
  const context = useContext(InstallPwaContext);
  if (!context) {
    throw new Error("useInstallPwa must be used within an InstallPwaProvider");
  }
  return context;
}

export function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
