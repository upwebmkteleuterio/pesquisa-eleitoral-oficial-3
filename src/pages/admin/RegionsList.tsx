import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { surveyService } from "../../services/surveyService";
import { Plus, Search, MoreVertical, Edit2, Trash2, MapPin, X, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { RegionForm } from "./RegionForm";
import { Region } from "../../types";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

export default function RegionsList() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | undefined>(undefined);
  const [regionToDelete, setRegionToDelete] = useState<Region | null>(null);

  const { data: regions, isLoading } = useQuery({
    queryKey: ['regions'],
    queryFn: () => surveyService.getRegions()
  });

  const { data: allSurveys } = useQuery({
    queryKey: ['admin_surveys'],
    queryFn: () => surveyService.getAll()
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => surveyService.deleteRegion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      setRegionToDelete(null);
    }
  });

  const filteredRegions = regions?.filter(r => 
    r.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.estado.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const associatedSurveys = regionToDelete 
    ? allSurveys?.filter(s => s.regiao_id === regionToDelete.id) || []
    : [];

  const handleEdit = (region: Region) => {
    setEditingRegion(region);
    setFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingRegion(undefined);
    setFormOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight">Regiões</h1>
          <p className="text-on-surface-variant font-medium">Municípios e estados de atuação das pesquisas</p>
        </div>
        <button 
          onClick={handleAddNew}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={20} />
          Nova Região
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-outline">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por cidade ou estado..." 
            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-outline rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline">
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">Localidade</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">ID do Sistema</th>
                <th className="px-4 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="py-20 text-center text-on-surface-variant animate-pulse font-bold">Carregando regiões...</td>
                </tr>
              ) : filteredRegions?.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-20 text-center text-on-surface-variant font-bold">Nenhuma região encontrada.</td>
                </tr>
              ) : (
                filteredRegions?.map((region) => (
                  <tr key={region.id} className="border-b border-outline/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                          <MapPin size={24} />
                        </div>
                        <div>
                          <p className="font-bold text-on-surface text-lg">{region.cidade}</p>
                          <p className="text-xs font-black text-on-surface-variant uppercase tracking-widest">{region.estado}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg text-[10px] font-mono font-bold text-on-surface-variant border border-outline">
                        {region.id}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setRegionToDelete(region)}
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

      {/* Delete Modal */}
      <AnimatePresence>
        {regionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRegionToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-outline"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="w-14 h-14 bg-error/10 rounded-2xl flex items-center justify-center text-error">
                  <AlertTriangle size={28} />
                </div>
                <button onClick={() => setRegionToDelete(null)} className="p-2 hover:bg-slate-100 rounded-xl">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-2 mb-8 text-center">
                <h2 className="text-2xl font-black text-on-surface tracking-tight">
                  {associatedSurveys.length > 0 ? "Não é possível excluir" : "Excluir Região?"}
                </h2>
                {associatedSurveys.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-on-surface-variant font-medium text-sm leading-relaxed">
                      Esta região está vinculada aos seguintes formulários. Você precisa excluir ou alterar a região desses formulários antes de remover a localidade:
                    </p>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-outline text-left space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                      {associatedSurveys.map(s => (
                        <div key={s.id} className="flex items-center gap-2 text-xs font-bold text-on-surface">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                          {s.nome}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-on-surface-variant font-medium">
                    Isso removerá <span className="font-bold text-on-surface">{regionToDelete.cidade} - {regionToDelete.estado}</span> permanentemente.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {associatedSurveys.length === 0 && (
                  <button 
                    onClick={() => deleteMutation.mutate(regionToDelete.id)}
                    className="w-full py-4 bg-error text-white rounded-2xl font-black shadow-lg shadow-error/30 active:scale-95 transition-all"
                  >
                    Confirmar Exclusão
                  </button>
                )}
                <button 
                  onClick={() => setRegionToDelete(null)}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-on-surface-variant rounded-2xl font-bold active:scale-95 transition-all"
                >
                  {associatedSurveys.length > 0 ? "Entendido" : "Cancelar"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isFormOpen && (
        <RegionForm 
          onClose={() => setFormOpen(false)} 
          region={editingRegion}
        />
      )}
    </div>
  );
}
