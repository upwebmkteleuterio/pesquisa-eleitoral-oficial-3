import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Bot, LoaderCircle, Plus, Send, X } from "lucide-react";
import { motion } from "motion/react";
import { createConversation, listConversations, listMessages, sendMessage } from "../../services/aiChatService";
import type { AiChatMessage, AiChatTrace } from "../../types";
import { sanitizeAiAnalysisBlocks } from "../../utils/aiAnalysisBlocks";
import { exportAiAnalysisPdf } from "../../utils/aiPdfUtils";
import { AiChatMessageBubble } from "./AiChatMessageBubble";

interface AiAssistantPanelProps {
  onClose: () => void;
}

interface LocalMessage extends AiChatMessage {
  trace?: AiChatTrace;
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
  const totalDurationMs = steps.reduce((total, step) => total + step.durationMs, 0);
  return { steps, totalDurationMs };
}

export function AiAssistantPanel({ onClose }: AiAssistantPanelProps) {
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string>();
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [sendError, setSendError] = useState<string>();
  const listRef = useRef<HTMLDivElement>(null);
  const conversations = useQuery({ queryKey: ["ai-chat-conversations"], queryFn: listConversations, refetchOnMount: "always" });
  const messages = useQuery({
    queryKey: ["ai-chat-messages", conversationId],
    queryFn: () => listMessages(conversationId!),
    enabled: Boolean(conversationId),
  });

  useEffect(() => {
    if (conversations.isFetchedAfterMount && !conversationId && conversations.data?.length) {
      setConversationId(conversations.data[0].id);
    }
  }, [conversations.data, conversations.isFetchedAfterMount, conversationId]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.data, localMessages]);

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
    mutationFn: ({ message, id }: { message: string; id?: string }) => sendMessage(message, id),
    onSuccess: async (response) => {
      setConversationId(response.conversationId);
      const returnedMessages = await queryClient.fetchQuery({
        queryKey: ["ai-chat-messages", response.conversationId],
        queryFn: () => listMessages(response.conversationId),
      });
      setLocalMessages([]);
      setSendError(undefined);
      setTraceMessages((current) => ({ ...current, [response.messageId]: response.trace }));
      if (!returnedMessages.some((message) => message.id === response.messageId)) {
        queryClient.invalidateQueries({ queryKey: ["ai-chat-messages", response.conversationId] });
      }
      queryClient.invalidateQueries({ queryKey: ["ai-chat-conversations"] });
    },
    onError: (error) => setSendError(error instanceof Error ? error.message : "Não foi possível enviar a mensagem."),
  });
  const [traceMessages, setTraceMessages] = useState<Record<string, AiChatTrace>>({});

  const submitMessage = (message = draft) => {
    const content = message.trim();
    if (!content || sendMutation.isPending) return;
    setSendError(undefined);
    setDraft("");
    setLocalMessages((current) => [...current, {
      id: `optimistic-${Date.now()}`,
      conversation_id: conversationId ?? "",
      user_id: "",
      role: "user",
      content,
      metadata: {},
      created_at: new Date().toISOString(),
    }]);
    sendMutation.mutate({ message: content, id: conversationId });
  };

  const visibleMessages = [...(messages.data ?? []), ...localMessages];
  const createError = createMutation.error instanceof Error ? createMutation.error.message : "Não foi possível criar uma conversa.";

  return (
    <>
      <button type="button" aria-label="Fechar Assistente de IA" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden" />
      <motion.aside
        initial={{ x: -24, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex h-dvh w-full flex-col border-r border-outline bg-slate-50 shadow-2xl dark:bg-slate-950 lg:relative lg:h-screen lg:w-[440px] lg:shrink-0"
        aria-label="Assistente de IA"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-outline bg-white px-4 py-4 dark:bg-slate-900">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bot size={22} /></span>
            <div className="min-w-0"><h2 className="font-bold text-on-surface">Assistente de IA</h2><p className="text-xs text-on-surface-variant">Converse com seus dados de forma inteligente</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar Assistente de IA" title="Fechar" className="rounded-lg p-2 text-on-surface-variant hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-slate-800"><X size={20} /></button>
        </header>

        <div className="flex shrink-0 items-center gap-2 border-b border-outline px-4 py-3">
          <select aria-label="Selecionar conversa anterior" value={conversationId ?? ""}
            onChange={(event) => { setConversationId(event.target.value || undefined); setLocalMessages([]); setSendError(undefined); }}
            disabled={sendMutation.isPending}
            className="min-w-0 flex-1 rounded-lg border border-outline bg-white px-2.5 py-2 text-xs text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 dark:bg-slate-900">
            <option value="" disabled>{conversations.data?.length ? "Selecione uma conversa" : "Nova conversa"}</option>
            {(conversations.data ?? []).map((conversation) => <option key={conversation.id} value={conversation.id}>{conversation.title}</option>)}
          </select>
          <button type="button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || sendMutation.isPending} className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">
            {createMutation.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />} Nova
          </button>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5" aria-live="polite">
          {conversations.isLoading && !conversationId && <div className="flex items-center justify-center gap-2 py-8 text-sm text-on-surface-variant"><LoaderCircle size={18} className="animate-spin" /> Carregando histórico...</div>}
          {conversations.isError && !conversationId && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{conversations.error instanceof Error ? conversations.error.message : "Não foi possível carregar o histórico."}</p>}
          {!conversationId && !conversations.isLoading && !conversations.isError && (
            <div className="mx-auto mt-10 max-w-xs text-center"><span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Bot size={26} /></span><h3 className="font-bold text-on-surface">Olá! Como posso ajudar?</h3><p className="mt-2 text-sm text-on-surface-variant">Envie uma mensagem para começar uma conversa com o assistente.</p></div>
          )}
          {conversationId && messages.isLoading && <div className="flex justify-center py-8"><LoaderCircle size={20} className="animate-spin text-primary" aria-label="Carregando mensagens" /></div>}
          {messages.isError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{messages.error instanceof Error ? messages.error.message : "Não foi possível carregar as mensagens."}</p>}
          {!messages.isLoading && visibleMessages.map((message, index) => {
            const blocks = sanitizeAiAnalysisBlocks(message.blocks ?? message.metadata?.blocks);
            const previousQuestion = [...visibleMessages.slice(0, index)].reverse().find((item) => item.role === "user")?.content;
            return <div key={message.id}>
              <AiChatMessageBubble
                role={message.role}
                content={message.content}
                createdAt={message.created_at}
                trace={traceMessages[message.id] ?? getStoredTrace(message.metadata)}
                blocks={blocks}
                onExport={message.role === "assistant" && blocks.length ? () => exportAiAnalysisPdf({ messageId: message.id, question: previousQuestion, content: message.content, blocks }) : undefined}
              />
            </div>;
          })}
          {sendMutation.isPending && <div className="flex items-center gap-2 text-xs text-on-surface-variant"><LoaderCircle size={16} className="animate-spin text-primary" /> Processando sua mensagem...</div>}
        </div>

        <div className="shrink-0 border-t border-outline bg-white p-4 dark:bg-slate-900">
          {sendError && <div role="alert" className="mb-3 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"><AlertCircle size={17} className="mt-0.5 shrink-0" /><p className="min-w-0 flex-1">{sendError}</p><button type="button" onClick={() => { const content = localMessages.at(-1)?.content; if (content) { setSendError(undefined); sendMutation.mutate({ message: content, id: conversationId }); } }} disabled={sendMutation.isPending} className="shrink-0 font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Tentar novamente</button></div>}
          {createMutation.isError && <p role="alert" className="mb-3 text-sm text-rose-600 dark:text-rose-400">{createError}</p>}
          <form onSubmit={(event) => { event.preventDefault(); submitMessage(); }} className="flex items-end gap-2">
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); submitMessage(); } }} rows={2} maxLength={12000} aria-label="Mensagem para o Assistente de IA" placeholder="Escreva sua mensagem... (Ctrl/Cmd + Enter para enviar)" className="max-h-36 min-h-12 flex-1 resize-y rounded-xl border border-outline bg-slate-50 px-3 py-3 text-sm text-on-surface outline-none placeholder:text-on-surface-variant focus-visible:ring-2 focus-visible:ring-primary dark:bg-slate-950" />
            <button type="submit" disabled={!draft.trim() || sendMutation.isPending} aria-label="Enviar mensagem" title="Enviar mensagem" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{sendMutation.isPending ? <LoaderCircle size={19} className="animate-spin" /> : <Send size={19} />}</button>
          </form>
          <p className="mt-2 text-[10px] text-on-surface-variant">Enter cria uma nova linha. Use Ctrl/Cmd + Enter para enviar.</p>
        </div>
      </motion.aside>
    </>
  );
}
