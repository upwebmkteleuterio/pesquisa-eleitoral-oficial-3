import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, History, LoaderCircle, Plus, Send, X } from "lucide-react";
import { motion } from "motion/react";
import { createConversation, deleteConversation, listConversations, listMessages, sendMessage } from "../../services/aiChatService";
import { AiLoader } from "../ui/ai-loader";
import type { AiChatConversation, AiChatMessage, AiChatTrace } from "../../types";
import { sanitizeAiAnalysisBlocks } from "../../utils/aiAnalysisBlocks";
import { exportAiAnalysisPdf } from "../../utils/aiPdfUtils";
import { AiChatHistoryPanel } from "./AiChatHistoryPanel";
import { AiChatMessageBubble } from "./AiChatMessageBubble";

interface AiAssistantPanelProps {
  onClose: () => void;
}

interface LocalMessage extends AiChatMessage {
  trace?: AiChatTrace;
  requestId: string;
}

function getStoredTrace(metadata: Record<string, unknown>): AiChatTrace | undefined {
  const value = metadata.trace;
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as { steps?: unknown };
  if (!Array.isArray(candidate.steps)) return undefined;
  const steps = candidate.steps.filter((step): step is AiChatTrace["steps"][number] =>
    Boolean(step) && typeof step === "object" && typeof step.step === "string" &&
    (step.status === "completed" || step.status === "failed" || step.status === "skipped") &&
    typeof step.durationMs === "number",
  );
  return { steps, totalDurationMs: steps.reduce((total, step) => total + step.durationMs, 0) };
}

export function AiAssistantPanel({ onClose }: AiAssistantPanelProps) {
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string>();
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [sendError, setSendError] = useState<string>();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [traceMessages, setTraceMessages] = useState<Record<string, AiChatTrace>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const conversations = useQuery({ queryKey: ["ai-chat-conversations"], queryFn: listConversations, refetchOnMount: "always" });
  const messages = useQuery({ queryKey: ["ai-chat-messages", conversationId], queryFn: () => listMessages(conversationId!), enabled: Boolean(conversationId) });

  useEffect(() => {
    if (conversations.isFetchedAfterMount && !conversationId && conversations.data?.length) setConversationId(conversations.data[0].id);
  }, [conversations.data, conversations.isFetchedAfterMount, conversationId]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.data, localMessages]);
  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 164)}px`;
  }, [draft]);

  const createMutation = useMutation({
    mutationFn: createConversation,
    onSuccess: async (conversation) => {
      setConversationId(conversation.id);
      setLocalMessages([]);
      setDraft("");
      setSendError(undefined);
      await queryClient.invalidateQueries({ queryKey: ["ai-chat-conversations"] });
    },
  });
  const sendMutation = useMutation({
    mutationFn: ({ message, id, requestId, allowAutomaticRetry }: { message: string; id?: string; requestId: string; allowAutomaticRetry?: boolean }) => sendMessage(message, id, requestId, allowAutomaticRetry),
    onSuccess: async (response) => {
      setConversationId(response.conversationId);
      const returnedMessages = await queryClient.fetchQuery({ queryKey: ["ai-chat-messages", response.conversationId], queryFn: () => listMessages(response.conversationId) });
      setLocalMessages([]);
      setSendError(undefined);
      setTraceMessages((current) => ({ ...current, [response.messageId]: response.trace }));
      if (!returnedMessages.some((message) => message.id === response.messageId)) queryClient.invalidateQueries({ queryKey: ["ai-chat-messages", response.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["ai-chat-conversations"] });
    },
    onError: (error) => setSendError(error instanceof Error ? error.message : "Não foi possível enviar a mensagem."),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: async (_, deletedId) => {
      const current = queryClient.getQueryData<AiChatConversation[]>(["ai-chat-conversations"]) ?? [];
      const remaining = current.filter((conversation) => conversation.id !== deletedId);
      queryClient.setQueryData(["ai-chat-conversations"], remaining);
      queryClient.removeQueries({ queryKey: ["ai-chat-messages", deletedId] });
      if (conversationId === deletedId) {
        setConversationId(remaining[0]?.id);
        setLocalMessages([]);
        setSendError(undefined);
      }
      await queryClient.invalidateQueries({ queryKey: ["ai-chat-conversations"] });
    },
  });

  const submitMessage = (message = draft) => {
    const content = message.trim();
    if (!content || sendMutation.isPending) return;
    const requestId = crypto.randomUUID();
    setSendError(undefined);
    setDraft("");
    setLocalMessages((current) => [...current, { id: requestId, requestId, conversation_id: conversationId ?? "", user_id: "", role: "user", content, metadata: {}, created_at: new Date().toISOString() }]);
    sendMutation.mutate({ message: content, id: conversationId, requestId });
  };
  const storedMessageIds = new Set((messages.data ?? []).map((message) => message.id));
  const visibleMessages = [...(messages.data ?? []), ...localMessages.filter((message) => !storedMessageIds.has(message.id))];
  const selectedConversation = (conversations.data ?? []).find((conversation) => conversation.id === conversationId);

  return (
    <>
      <button type="button" aria-label="Fechar Assistente de IA" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden" />
      <motion.aside initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 flex h-dvh w-full flex-col border-r border-outline bg-slate-50 shadow-2xl dark:bg-slate-950 lg:inset-auto lg:sticky lg:top-0 lg:h-screen lg:w-[440px] lg:shrink-0" aria-label="Assistente de IA">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-outline bg-white px-4 py-4 dark:bg-slate-900">
          <div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><AiLoader size={24} /></span><div className="min-w-0"><h2 className="font-bold text-on-surface">Assistente de IA</h2><p className="text-xs text-on-surface-variant">Converse com seus dados de forma inteligente</p></div></div>
          <button type="button" onClick={onClose} aria-label="Fechar Assistente de IA" title="Fechar" className="rounded-lg p-2 text-on-surface-variant hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-slate-800"><X size={20} /></button>
        </header>

        <div className="flex shrink-0 items-center gap-2 border-b border-outline px-4 py-3">
          <button type="button" onClick={() => setHistoryOpen(true)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg border border-outline bg-white px-3 py-2 text-left text-xs font-semibold text-on-surface hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-slate-900 dark:hover:bg-slate-800"><History size={16} className="shrink-0 text-primary" /><span className="truncate">Histórico{selectedConversation ? ` · ${selectedConversation.title}` : ""}</span></button>
          <button type="button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || sendMutation.isPending} className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50">{createMutation.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />} Nova</button>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5" aria-live="polite">
          {conversations.isLoading && !conversationId && <div className="flex items-center justify-center gap-2 py-8 text-sm text-on-surface-variant"><LoaderCircle size={18} className="animate-spin" /> Carregando histórico...</div>}
          {conversations.isError && !conversationId && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{conversations.error instanceof Error ? conversations.error.message : "Não foi possível carregar o histórico."}</p>}
          {!conversationId && !conversations.isLoading && !conversations.isError && <div className="mx-auto mt-10 max-w-xs text-center"><span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><AiLoader size={28} /></span><h3 className="font-bold text-on-surface">Olá! Como posso ajudar?</h3><p className="mt-2 text-sm text-on-surface-variant">Envie uma mensagem para começar uma conversa com o assistente.</p></div>}
          {conversationId && messages.isLoading && <div className="flex justify-center py-8"><LoaderCircle size={20} className="animate-spin text-primary" aria-label="Carregando mensagens" /></div>}
          {messages.isError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{messages.error instanceof Error ? messages.error.message : "Não foi possível carregar as mensagens."}</p>}
          {!messages.isLoading && visibleMessages.map((message, index) => {
            const blocks = sanitizeAiAnalysisBlocks(message.blocks ?? message.metadata?.blocks);
            const previousQuestion = [...visibleMessages.slice(0, index)].reverse().find((item) => item.role === "user")?.content;
            return <div key={message.id}><AiChatMessageBubble role={message.role} content={message.content} createdAt={message.created_at} trace={traceMessages[message.id] ?? getStoredTrace(message.metadata)} blocks={blocks} onExport={message.role === "assistant" && blocks.length ? () => exportAiAnalysisPdf({ messageId: message.id, question: previousQuestion, content: message.content, blocks }) : undefined} /></div>;
          })}
          {sendMutation.isPending && <div className="flex items-center gap-2 text-xs text-on-surface-variant"><LoaderCircle size={16} className="animate-spin text-primary" /> Processando sua mensagem...</div>}
        </div>

        <div className="shrink-0 border-t border-outline bg-white p-4 shadow-[0_-4px_18px_rgba(15,23,42,0.08)] dark:bg-slate-900">
          {sendError && <div role="alert" className="mb-3 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"><AlertCircle size={17} className="mt-0.5 shrink-0" /><p className="min-w-0 flex-1">{sendError}</p><button type="button" onClick={() => { const pendingMessage = localMessages.at(-1); if (pendingMessage) { setSendError(undefined); sendMutation.mutate({ message: pendingMessage.content, id: conversationId, requestId: pendingMessage.requestId, allowAutomaticRetry: false }); } }} disabled={sendMutation.isPending} className="shrink-0 font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Tentar novamente</button></div>}
          {createMutation.isError && <p role="alert" className="mb-3 text-sm text-rose-600 dark:text-rose-400">{createMutation.error instanceof Error ? createMutation.error.message : "Não foi possível criar uma conversa."}</p>}
          {deleteMutation.isError && <p role="alert" className="mb-3 text-sm text-rose-600 dark:text-rose-400">{deleteMutation.error instanceof Error ? deleteMutation.error.message : "Não foi possível excluir a conversa."}</p>}
          <form onSubmit={(event) => { event.preventDefault(); submitMessage(); }} className="relative rounded-2xl border border-outline bg-slate-50 p-2 shadow-md transition-shadow focus-within:border-primary/50 focus-within:shadow-lg dark:bg-slate-950">
            <textarea ref={composerRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submitMessage(); } }} rows={1} maxLength={12000} aria-label="Mensagem para o Assistente de IA" placeholder="Escreva sua mensagem..." className="block max-h-[164px] min-h-10 w-full resize-none overflow-y-auto bg-transparent px-3 py-2.5 pr-12 text-sm leading-6 text-on-surface outline-none placeholder:text-on-surface-variant" />
            <button type="submit" disabled={!draft.trim() || sendMutation.isPending} aria-label="Enviar mensagem" title="Enviar mensagem" className="absolute bottom-2 right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-primary text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{sendMutation.isPending ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}</button>
          </form>
          <p className="mt-2 text-[10px] text-on-surface-variant">Enter envia · Shift+Enter quebra linha</p>
        </div>
        {historyOpen && <AiChatHistoryPanel conversations={conversations.data ?? []} selectedId={conversationId} isLoading={conversations.isLoading} isDeleting={deleteMutation.isPending} error={deleteMutation.error instanceof Error ? deleteMutation.error.message : undefined} onClose={() => setHistoryOpen(false)} onSelect={(id) => { setConversationId(id); setLocalMessages([]); setSendError(undefined); setHistoryOpen(false); }} onDelete={(id) => deleteMutation.mutate(id)} />}
      </motion.aside>
    </>
  );
}
