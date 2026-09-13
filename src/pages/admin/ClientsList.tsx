import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Mail, Plus, Search, Trash2 } from "lucide-react";
import { userService } from "../../services/userService";
import { Client } from "../../types";
import { ClientForm } from "./ClientForm";
import { useAuth } from "../../contexts/AuthContext";

export default function ClientsList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client>();
  const { data: clients, isLoading } = useQuery({ queryKey: ['clients', user?.id || 'anonymous'], queryFn: () => userService.getAllClients(), enabled: !!user });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.manageClient({ action: 'delete', id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });
  const filteredClients = clients?.filter(client => `${client.nome} ${client.email} ${client.cpf}`.toLowerCase().includes(searchTerm.toLowerCase()));

  return <div className="space-y-8">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><h1 className="text-3xl font-black tracking-tight text-on-surface">Clientes</h1><p className="font-medium text-on-surface-variant">Gerencie acessos de consulta às pesquisas vinculadas</p></div><button type="button" onClick={() => { setEditingClient(undefined); setIsFormOpen(true); }} className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 font-bold text-white shadow-lg shadow-primary/20"><Plus size={20} />Novo Cliente</button></div>
    <div className="rounded-3xl border border-outline bg-white p-6 shadow-sm dark:bg-slate-900"><div className="relative mb-6"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} /><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Buscar por nome, e-mail ou CPF..." className="w-full rounded-2xl border border-outline bg-slate-50 py-4 pl-12 pr-4 font-medium dark:bg-slate-800/50" /></div><div className="overflow-x-auto"><table className="w-full border-collapse text-left"><thead><tr className="border-b border-outline"><th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">Cliente</th><th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">Contato</th><th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">CPF</th><th className="px-4 py-4 text-right" /></tr></thead><tbody>{isLoading ? <tr><td colSpan={4} className="py-20 text-center font-bold text-on-surface-variant">Carregando clientes...</td></tr> : filteredClients?.length ? filteredClients.map(client => <tr key={client.id} className="border-b border-outline/50"><td className="px-4 py-4"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-xl font-black uppercase text-primary">{client.nome.charAt(0)}</div><span className="font-bold text-on-surface">{client.nome}</span></div></td><td className="px-4 py-4"><span className="flex items-center gap-2 text-xs font-medium text-on-surface-variant"><Mail size={14} className="text-primary" />{client.email}</span></td><td className="px-4 py-4 text-xs font-bold text-on-surface-variant">{client.cpf}</td><td className="px-4 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => { setEditingClient(client); setIsFormOpen(true); }} className="rounded-lg p-2 text-on-surface-variant hover:bg-primary/5 hover:text-primary"><Edit2 size={18} /></button><button type="button" onClick={() => { if (window.confirm(`Excluir o cliente ${client.nome}?`)) deleteMutation.mutate(client.id); }} disabled={deleteMutation.isPending} className="rounded-lg p-2 text-on-surface-variant hover:bg-error/5 hover:text-error"><Trash2 size={18} /></button></div></td></tr>) : <tr><td colSpan={4} className="py-20 text-center font-bold text-on-surface-variant">Nenhum cliente encontrado.</td></tr>}</tbody></table></div></div>
    {isFormOpen && <ClientForm client={editingClient} onClose={() => setIsFormOpen(false)} />}
  </div>;
}
