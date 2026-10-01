import { useState } from "react";
import { Bot, CalendarDays, LoaderCircle, Trash2, X } from "lucide-react";
import type { AiChatConversation } from "../../types";

interface AiChatHistoryPanelProps {
  conversations: AiChatConversation[];
  selectedId?: string;
  isLoading: boolean;
  isDeleting: boolean;
  error?: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AiChatHistoryPanel({ conversations, selectedId, isLoading, isDeleting, error, onClose, onSelect, onDelete }: AiChatHistoryPanelProps) {
  const [confirmId, setConfirmId] = useState<string>();
  return (
    <section role="dialog" aria-modal="true" aria-labelledby="ai-chat-history-title" className="absolute inset-0 z-20 flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="flex shrink-0 items-center justify-between border-b border-outline bg-white px-4 py-4 dark:bg-slate-900">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bot size={22} /></span><div><h2 id="ai-chat-history-title" className="font-bold text-on-surface">Assistente de IA</h2><p className="text-xs text-on-surface-variant">Histórico das suas conversas</p></div></div>
        <button type="button" onClick={onClose} aria-label="Fechar histórico" className="rounded-lg p-2 text-on-surface-variant hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-slate-800"><X size={20} /></button>
      </header>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {isLoading && <div className="flex justify-center py-8"><LoaderCircle size={20} className="animate-spin text-primary" aria-label="Carregando histórico" /></div>}
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
        {!isLoading && !conversations.length && <p className="py-8 text-center text-sm text-on-surface-variant">Ainda não há conversas.</p>}
        {conversations.map((conversation) => (
          <div key={conversation.id} className={`group rounded-xl border p-2 transition-colors ${selectedId === conversation.id ? "border-primary/40 bg-primary/5" : "border-outline bg-white dark:bg-slate-900"}`}>
            <div className="flex items-start gap-2">
              <button type="button" onClick={() => onSelect(conversation.id)} disabled={isDeleting} className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-slate-800 disabled:opacity-50">
                <span className="block truncate text-sm font-semibold text-on-surface">{conversation.title}</span>
                <span className="mt-1 flex items-center gap-1.5 text-[11px] text-on-surface-variant"><CalendarDays size={13} />{new Date(conversation.updated_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
              </button>
              {confirmId === conversation.id ? (
                <div className="flex shrink-0 flex-col items-end gap-1 rounded-lg bg-rose-50 p-2 dark:bg-rose-950/30">
                  <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-200">Excluir conversa?</span>
                  <div className="flex gap-1"><button type="button" onClick={() => { onDelete(conversation.id); setConfirmId(undefined); }} disabled={isDeleting} className="rounded px-2 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50">Excluir</button><button type="button" onClick={() => setConfirmId(undefined)} disabled={isDeleting} className="rounded px-2 py-1 text-[11px] font-semibold text-on-surface hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-slate-800">Cancelar</button></div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmId(conversation.id)} aria-label={`Excluir conversa ${conversation.title}`} title="Excluir conversa" disabled={isDeleting} className="mt-1 rounded-lg p-2 text-on-surface-variant opacity-100 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 disabled:opacity-50"><Trash2 size={17} /></button>
              )}
            </div>
          </div>
        ))}
        {isDeleting && <p className="flex items-center justify-center gap-2 py-2 text-xs text-on-surface-variant"><LoaderCircle size={15} className="animate-spin" />Excluindo conversa...</p>}
      </div>
    </section>
  );
}
