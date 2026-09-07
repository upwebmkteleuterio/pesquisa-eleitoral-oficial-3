import { supabase } from "@/src/integrations/supabase/client";
import { Researcher } from "../types";

export const userService = {
  async getProfile(): Promise<Researcher | null> {
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
      .order('nome', { ascending: true });
    
    if (error) throw error;
    return data as any;
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
  }
};