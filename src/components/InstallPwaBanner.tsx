import { useState } from "react";
import { Download, Info, X } from "lucide-react";
import { isIos, useInstallPwa } from "../contexts/InstallPwaContext";

export function InstallPwaBanner() {
  const { deferredPrompt, isDismissed, isInstalled, dismiss, install } = useInstallPwa();
  const ios = isIos() && !isInstalled;
  const [showInstructions, setShowInstructions] = useState(false);

  if (isInstalled || isDismissed) return null;

  const handleInstall = async () => {
    const promptAccepted = await install();
    if (!promptAccepted) setShowInstructions(true);
  };

  const hasInstructions = ios || showInstructions;

  return (
    <aside className="relative mb-6 rounded-2xl border border-primary/20 bg-surface p-4 shadow-xl" aria-label="Instalação do aplicativo">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar aviso de instalação"
        className="absolute right-3 top-3 rounded-full p-1 text-on-surface-variant hover:bg-primary/10 hover:text-primary"
      >
        <X size={18} />
      </button>
      <div className="flex gap-3 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {hasInstructions ? <Info size={20} /> : <Download size={20} />}
        </div>
        <div>
          <h2 className="font-bold text-on-surface">Instale o Veraxus</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Tenha acesso rápido ao aplicativo mesmo quando estiver sem conexão.</p>
          {hasInstructions && (
            <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
              <p>
                {ios
                  ? "No iPhone ou iPad, toque em Compartilhar e depois em “Adicionar à Tela de Início”."
                  : "Abra o menu do navegador (⋮) e procure “Instalar aplicativo” ou “Adicionar à tela inicial”. A instalação depende do suporte e das permissões do navegador."
                }
              </p>
              {showInstructions && (
                <p role="status" aria-live="polite" className="font-medium text-primary">
                  {ios
                    ? "O iOS não oferece um prompt automático. Siga as instruções acima para instalar."
                    : "Este navegador não disponibilizou o prompt automático. Siga as instruções do menu para continuar."
                  }
                </p>
              )}
            </div>
          )}
          <button type="button" onClick={handleInstall} className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90">
            {deferredPrompt ? "Instalar aplicativo" : "Ver instruções de instalação"}
          </button>
        </div>
      </div>
    </aside>
  );
}
