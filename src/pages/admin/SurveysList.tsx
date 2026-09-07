import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { surveyService } from "../../services/surveyService";
import { submissionService } from "../../services/submissionService";
import { Plus, Search, MoreVertical, Edit2, Copy, Trash2, Eye, MapPin, BarChart2, Filter, AlertTriangle, X, Globe, Lock } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { Survey } from "../../types";
import { motion, AnimatePresence } from "motion/react";

export default function SurveysList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [surveyToDelete, setSurveyToDelete] = useState<Survey | null>(null);

  const { data: surveys, isLoading } = useQuery({
    queryKey: ['admin_surveys'],
    queryFn: () => surveyService.getAll()
  });

  const { data: submissions } = useQuery({
    queryKey: ['submissions', 'global'],
    queryFn: () => submissionService.getAllSynced()
  });

  const getSurveyCount = (surveyId: string) => {
    return submissions?.filter(s => s.formulario_id === surveyId).length || 0;
  };

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => surveyService.getRegions()
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => surveyService.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_surveys'] });
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: 'ativo' | 'pausado' | 'concluido' }) => 
      surveyService.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin_surveys'] });
      if (surveyToDelete?.id === variables.id) {
        setSurveyToDelete(prev => prev ? { ...prev, status: variables.status } : null);
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await submissionService.deleteBySurveyId(id);
      await surveyService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_surveys'] });
      setSurveyToDelete(null);
    }
  });

  const filteredSurveys = surveys?.filter(s => {
    const matchesSearch = s.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = () => {
    if (surveyToDelete) {
      deleteMutation.mutate(surveyToDelete.id);
    }
  };

  const handlePauseAndDelete = () => {
    if (surveyToDelete) {
      statusMutation.mutate({ id: surveyToDelete.id, status: 'pausado' });
    }
  };

  const isPaused = surveyToDelete?.status === 'pausado';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight">Formulários</h1>
          <p className="text-on-surface-variant font-medium">Crie e gerencie suas pesquisas eleitorais</p>
        </div>
        <button 
          onClick={() => navigate('/adm/formularios/novo')}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={20} />
          Novo Formulário
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-outline">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
            <input 
              type="text" 
              placeholder="Buscar formulários..." 
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-outline rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 border border-outline p-2 rounded-2xl">
            <Filter size={18} className="ml-2 text-on-surface-variant" />
            <select 
              className="bg-transparent text-sm font-bold focus:outline-none pr-4 cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="todos">Todos os Status</option>
              <option value="ativo">Ativos</option>
              <option value="pausado">Pausados</option>
              <option value="concluido">Concluídos</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline">
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">Formulário</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">Status</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">Progresso Geral</th>
                <th className="px-4 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-on-surface-variant animate-pulse font-bold">Carregando formulários...</td>
                </tr>
              ) : filteredSurveys?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-on-surface-variant font-bold">Nenhum formulário cadastrado.</td>
                </tr>
              ) : (
                filteredSurveys?.map((survey) => {
                  const region = regions?.find(r => r.id === survey.regiao_id);
                  const count = getSurveyCount(survey.id);
                  const progress = (count / (survey.limite_total || 1)) * 100;

                  return (
                    <tr key={survey.id} className="border-b border-outline/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-on-surface">{survey.nome}</p>
                            {survey.permitir_link_publico ? (
                              <div title="Link Público Ativo" className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded-full text-[8px] font-black uppercase border border-primary/20">
                                <Globe size={10} /> WEB
                              </div>
                            ) : (
                              <div title="Acesso Restrito ao App" className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full text-[8px] font-black uppercase border border-slate-200 dark:border-slate-700">
                                <Lock size={10} /> APP
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant font-bold uppercase">
                            <MapPin size={12} className="text-primary" />
                            {region ? `${region.cidade} - ${region.estado}` : "Sem região"}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <select 
                          className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer p-0"
                          value={survey.status}
                          onChange={(e) => statusMutation.mutate({ id: survey.id, status: e.target.value as any })}
                        >
                          <option value="ativo">Ativo</option>
                          <option value="pausado">Pausado</option>
                          <option value="concluido">Concluído</option>
                        </select>
                      </td>
                      <td className="px-4 py-5">
                        <div className="w-full max-w-[150px] space-y-1.5">
                          <div className="flex justify-between text-[10px] font-black uppercase">
                            <span className="text-on-surface-variant">{count} / {survey.limite_total}</span>
                            <span className="text-primary">{Math.round(progress)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-500" 
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => navigate(`/adm/relatorios?id=${survey.id}`)}
                            title="Ver Resultados"
                            className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                          >
                            <BarChart2 size={18} />
                          </button>
                          <button 
                            onClick={() => navigate(`/adm/formularios/editar/${survey.id}`)}
                            title="Editar"
                            className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => duplicateMutation.mutate(survey.id)}
                            title="Duplicar"
                            className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                          >
                            <Copy size={18} />
                          </button>
                          <button 
                            onClick={() => setSurveyToDelete(survey)}
                            title="Excluir"
                            className="p-2 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Modal */}
      <AnimatePresence>
        {surveyToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSurveyToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-outline overflow-hidden"
            >
              <div className={cn("absolute top-0 left-0 w-full h-2", isPaused ? "bg-error" : "bg-primary")} />
              
              <div className="flex items-center justify-between mb-6">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", isPaused ? "bg-error/10 text-error" : "bg-primary/10 text-primary")}>
                  {isPaused ? <AlertTriangle size={24} /> : <Filter size={24} />}
                </div>
                <button 
                  onClick={() => setSurveyToDelete(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <h2 className="text-2xl font-black text-on-surface tracking-tight mb-2">
                {isPaused ? "Excluir Formulário?" : "Formulário não Pausado"}
              </h2>
              
              <div className="text-on-surface-variant font-medium mb-8 leading-relaxed">
                {isPaused ? (
                  <p>
                    Você está prestes a excluir o formulário <span className="font-bold text-on-surface">"{surveyToDelete.nome}"</span>.
                    <br /><br />
                    <span className="text-error font-extrabold flex items-center gap-2 uppercase tracking-tight text-[10px] bg-error/5 p-3 rounded-xl border border-error/10">
                      <AlertTriangle size={14} />
                      Atenção: Todos os dados de relatórios e respostas associados serão permanentemente removidos.
                    </span>
                  </p>
                ) : (
                  <p>
                    Não é possível excluir o formulário <span className="font-bold text-on-surface">"{surveyToDelete.nome}"</span> enquanto ele estiver <span className="text-primary font-bold uppercase tracking-widest text-[10px]">{surveyToDelete.status}</span>.
                    <br /><br />
                    Deseja alterar o status para <span className="font-bold text-on-surface">Pausado</span> agora para poder prosseguir com a exclusão?
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {isPaused ? (
                  <button 
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="w-full py-4 bg-error text-white rounded-2xl font-black shadow-lg shadow-error/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? "Excluindo..." : "Sim, Excluir Tudo"}
                  </button>
                ) : (
                  <button 
                    onClick={handlePauseAndDelete}
                    disabled={statusMutation.isPending}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {statusMutation.isPending ? "Pausando..." : "Pausar Formulário agora"}
                  </button>
                )}
                <button 
                  onClick={() => setSurveyToDelete(null)}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-on-surface-variant rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}