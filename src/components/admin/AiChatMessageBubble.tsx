import { Bot, UserRound } from "lucide-react";
import type { AiChatMessageRole, AiChatTrace } from "../../types";
import { AiExecutionTrace } from "./AiExecutionTrace";

interface AiChatMessageBubbleProps {
  role: AiChatMessageRole;
  content: string;
  createdAt: string;
  trace?: AiChatTrace;
}

export function AiChatMessageBubble({ role, content, createdAt, trace }: AiChatMessageBubbleProps) {
  const isUser = role === "user";
  const timestamp = new Date(createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  return (
    <article className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-primary text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
        {isUser ? <UserRound size={16} /> : <Bot size={16} />}
      </div>
      <div className={`min-w-0 max-w-[88%] ${isUser ? "text-right" : ""}`}>
        <div className={`inline-block rounded-2xl px-4 py-3 text-left text-sm leading-relaxed ${isUser ? "rounded-tr-sm bg-primary text-white" : "rounded-tl-sm border border-outline bg-white text-on-surface dark:bg-slate-900"}`}>
          <p className="whitespace-pre-wrap break-words">{content}</p>
        </div>
        <p className="mt-1 px-1 text-[10px] text-on-surface-variant">{timestamp}</p>
        {trace && <AiExecutionTrace trace={trace} />}
      </div>
    </article>
  );
}
