import { supabase } from "@/src/integrations/supabase/client";
import { Client, Researcher } from "../types";

export const userService = {
  async getProfile(): Promise<(Researcher | Client) | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (error) return null;
    return data as any;
  },

  async updateProfile(data: Partial<Researcher>): Promise<Researcher> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error("No session found");

    const { data: updated, error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', session.user.id)
      .select()
      .single();
    
    if (error) throw error;
    return updated as any;
  },

  async getAllResearchers(): Promise<Researcher[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'pesquisador')
      .order('nome', { ascending: true });
    
    if (error) throw error;
    return data as any;
  },

  async getAllUsers(): Promise<Researcher[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'cliente')
      .order('nome', { ascending: true });
    
    if (error) throw error;
    return data as any;
  },

  async getAllClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'cliente')
      .order('nome', { ascending: true });

    if (error) throw error;
    if (!data.length) return [];

    const { data: links, error: linksError } = await supabase
      .from('pesquisa_clientes')
      .select('cliente_id, pesquisa_id')
      .in('cliente_id', data.map(client => client.id));

    if (linksError) throw linksError;
    const researchIdsByClient = new Map<string, string[]>();
    links.forEach(link => {
      const ids = researchIdsByClient.get(link.cliente_id) || [];
      ids.push(link.pesquisa_id);
      researchIdsByClient.set(link.cliente_id, ids);
    });

    return data.map(client => ({
      ...client,
      pesquisa_ids: researchIdsByClient.get(client.id) || [],
    })) as Client[];
  },

  async saveResearcher(researcher: Partial<Researcher> & { password?: string }): Promise<any> {
    if (researcher.password && !researcher.id) {
      const { data, error } = await supabase.functions.invoke('create-researcher', {
        body: { 
          email: researcher.email, 
          password: researcher.password, 
          nome: researcher.nome,
          cpf: researcher.cpf
        }
      });
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(researcher)
      .select()
      .single();
    
    if (error) throw error;
    return data as any;
  },

  async deleteResearcher(id: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async manageClient(payload: {
    action: 'create' | 'update' | 'delete';
    id?: string;
    nome?: string;
    nome_empresa?: string;
    email?: string;
    cpf?: string;
    password?: string;
    pesquisa_ids?: string[];
  }): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Sessão expirada. Faça login novamente.");

    const { data, error } = await supabase.functions.invoke('manage-client', {
      body: payload,
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) {
      let message = error.message;
      const context = (error as { context?: Response }).context;
      if (context) {
        const responseBody = await context.clone().json().catch(() => null) as { error?: unknown } | null;
        if (typeof responseBody?.error === "string") message = responseBody.error;
      }
      throw new Error(message);
    }
    return data;
  }
};