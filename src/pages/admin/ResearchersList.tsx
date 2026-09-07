import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "../../services/userService";
import { submissionService } from "../../services/submissionService";
import { Plus, Search, MoreVertical, Edit2, Trash2, Mail, CreditCard, AlertTriangle, X, UserPlus, ArrowRight } from "lucide-react";
import { useState } from "react";
import { ResearcherForm } from "./ResearcherForm";
import { Researcher } from "../../types";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

export default function ResearchersList() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingResearcher, setEditingResearcher] = useState<Researcher | undefined>(undefined);
  
  // Deletion states
  const [researcherToDelete, setResearcherToDelete] = useState<Researcher | null>(null);
  const [targetResearcherId, setTargetResearcherId] = useState<string>("");

  const { data: researchers, isLoading } = useQuery({
    queryKey: ['researchers'],
    queryFn: () => userService.getAllResearchers()
  });

  const { data: allSubmissions } = useQuery({
    queryKey: ['submissions'],
    queryFn: () => submissionService.getAll()
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, newResearcherId }: { id: string, newResearcherId?: string }) => {
      if (newResearcherId) {
        await submissionService.reassociateSubmissions(id, newResearcherId);
      }
      await userService.deleteResearcher(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['researchers'] });
      setResearcherToDelete(null);
      setTargetResearcherId("");
    }
  });

  const hasSubmissions = researcherToDelete 
    ? allSubmissions?.some(s => s.pesquisador_id === researcherToDelete.id)
    : false;

  const otherResearchers = researchers?.filter(r => r.id !== researcherToDelete?.id);

  const filteredResearchers = researchers?.filter(r => 
    r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.cpf.includes(searchTerm)
  );

  const handleEdit = (researcher: Researcher) => {
    setEditingResearcher(researcher);
    setFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingResearcher(undefined);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!researcherToDelete) return;
    if (hasSubmissions && !targetResearcherId) {
      alert("Por favor, selecione um pesquisador para herdar os dados.");
      return;
    }
    deleteMutation.mutate({ 
      id: researcherToDelete.id, 
      newResearcherId: targetResearcherId || undefined 
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight">Pesquisadores</h1>
          <p className="text-on-surface-variant font-medium">Gerencie a equipe de coleta em campo</p>
        </div>
        <button 
          onClick={handleAddNew}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={20} />
          Novo Pesquisador
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-outline">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome, email ou CPF..." 
            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-outline rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline">
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">Pesquisador</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">Contato</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">Documento</th>
                <th className="px-4 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-on-surface-variant animate-pulse font-bold">Carregando pesquisadores...</td>
                </tr>
              ) : filteredResearchers?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-on-surface-variant font-bold">Nenhum pesquisador encontrado.</td>
                </tr>
              ) : (
                filteredResearchers?.map((researcher) => (
                  <tr key={researcher.id} className="border-b border-outline/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-4">
                        {researcher.foto_avatar_url ? (
                          <img 
                            src={researcher.foto_avatar_url} 
                            alt={researcher.nome} 
                            className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl border-2 border-white shadow-sm uppercase">
                            {researcher.nome.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-on-surface">{researcher.nome}</p>
                          <p className="text-[10px] text-primary font-black uppercase tracking-tighter">ID: {researcher.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
                          <Mail size={14} className="text-primary" />
                          {researcher.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                        <CreditCard size={14} className="text-primary" />
                        {researcher.cpf}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(researcher)}
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => setResearcherToDelete(researcher)}
                          className="p-2 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complex Delete Modal */}
      <AnimatePresence>
        {researcherToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setResearcherToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-outline overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-error" />
              
              <div className="flex items-center justify-between mb-8">
                <div className="w-14 h-14 bg-error/10 rounded-2xl flex items-center justify-center text-error border border-error/20">
                  <AlertTriangle size={28} />
                </div>
                <button 
                  onClick={() => setResearcherToDelete(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <h2 className="text-3xl font-black text-on-surface tracking-tight leading-tight">Remover Pesquisador?</h2>
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-outline">
                  {researcherToDelete.foto_avatar_url ? (
                    <img src={researcherToDelete.foto_avatar_url} className="w-12 h-12 rounded-xl object-cover" alt="" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl uppercase">
                      {researcherToDelete.nome.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-on-surface">{researcherToDelete.nome}</p>
                    <p className="text-xs text-on-surface-variant">{researcherToDelete.email}</p>
                  </div>
                </div>
              </div>

              {hasSubmissions ? (
                <div className="space-y-6 mb-8 animate-in fade-in slide-in-from-top-2">
                   <div className="p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl">
                      <p className="text-sm text-amber-700 dark:text-amber-400 font-medium leading-relaxed">
                        Este pesquisador possui <span className="font-black italic">coletas de dados vinculadas</span>. Para deletá-lo, você deve transferir o histórico para outro membro da equipe.
                      </p>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant flex items-center gap-2">
                        <UserPlus size={14} className="text-primary" />
                        Transferir dados para:
                      </label>
                      <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                        {otherResearchers?.map(r => (
                          <button
                            key={r.id}
                            onClick={() => setTargetResearcherId(r.id)}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-2xl border-2 transition-all text-left",
                              targetResearcherId === r.id 
                                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.01]" 
                                : "bg-white dark:bg-slate-800 border-outline hover:border-primary/40"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              {r.foto_avatar_url ? (
                                <img src={r.foto_avatar_url} className="w-8 h-8 rounded-lg object-cover" alt="" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                  {r.nome.charAt(0)}
                                </div>
                              )}
                              <span className="text-sm font-bold truncate max-w-[180px]">{r.nome}</span>
                            </div>
                            {targetResearcherId === r.id && <ArrowRight size={16} />}
                          </button>
                        ))}
                      </div>
                   </div>
                </div>
              ) : (
                <p className="text-on-surface-variant font-medium mb-8 leading-relaxed">
                  Confirma a exclusão permanente deste colaborador? Esta ação não pode ser desfeita.
                </p>
              )}

              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending || (hasSubmissions && !targetResearcherId)}
                  className="w-full py-4 bg-error text-white rounded-2xl font-black shadow-lg shadow-error/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  {deleteMutation.isPending ? "Processando..." : (hasSubmissions ? "Transferir e Excluir" : "Sim, Excluir")}
                </button>
                <button 
                  onClick={() => setResearcherToDelete(null)}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-on-surface-variant rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isFormOpen && (
        <ResearcherForm 
          onClose={() => setFormOpen(false)} 
          researcher={editingResearcher}
        />
      )}
    </div>
  );
}