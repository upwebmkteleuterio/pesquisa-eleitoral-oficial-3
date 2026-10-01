import { supabase } from '../integrations/supabase/client';
import type { AiChatConversation, AiChatMessage, AiChatResponse } from '../types';

export async function createConversation(): Promise<AiChatConversation> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Entre na sua conta para criar uma conversa.');

  const { data, error } = await supabase
    .from('ai_chat_conversations')
    .insert({ user_id: user.id, title: 'Nova conversa' })
    .select('id, user_id, title, created_at, updated_at')
    .single();

  if (error || !data) throw new Error('Não foi possível criar a conversa. Tente novamente.');
  return data as AiChatConversation;
}

export async function listConversations(): Promise<AiChatConversation[]> {
  const { data, error } = await supabase
    .from('ai_chat_conversations')
    .select('id, user_id, title, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw new Error('Não foi possível carregar as conversas. Tente novamente.');
  return (data ?? []) as AiChatConversation[];
}

export async function renameConversation(id: string, title: string): Promise<AiChatConversation> {
  const normalizedTitle = title.trim();
  if (!normalizedTitle || normalizedTitle.length > 120) {
    throw new Error('O título deve ter entre 1 e 120 caracteres.');
  }

  const { data, error } = await supabase
    .from('ai_chat_conversations')
    .update({ title: normalizedTitle, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, user_id, title, created_at, updated_at')
    .single();

  if (error || !data) throw new Error('Não foi possível renomear a conversa.');
  return data as AiChatConversation;
}

export async function listMessages(conversationId: string): Promise<AiChatMessage[]> {
  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('id, conversation_id, user_id, role, content, metadata, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw new Error('Não foi possível carregar as mensagens.');
  return (data ?? []) as AiChatMessage[];
}

export async function sendMessage(message: string, conversationId?: string): Promise<AiChatResponse> {
  const normalizedMessage = message.trim();
  if (!normalizedMessage || normalizedMessage.length > 12_000) {
    throw new Error('A mensagem deve ter entre 1 e 12.000 caracteres.');
  }

  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: { message: normalizedMessage, ...(conversationId ? { conversationId } : {}) },
  });

  if (error) {
    let serverMessage: string | undefined;
    const context = error.context;
    if (context instanceof Response) {
      try {
        const body = await context.clone().json() as { error?: unknown };
        if (typeof body.error === 'string') serverMessage = body.error;
      } catch {
        // The function response may not contain JSON.
      }
    }
    throw new Error(serverMessage || 'Não foi possível obter uma resposta da IA. Tente novamente.');
  }

  if (!data || typeof data !== 'object' || typeof data.message !== 'string') {
    throw new Error('A resposta da IA veio em um formato inválido.');
  }
  return data as AiChatResponse;
}
