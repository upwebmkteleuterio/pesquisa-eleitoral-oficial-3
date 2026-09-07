import { useState, FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { surveyService } from "../../services/surveyService";
import { Region } from "../../types";
import { X, Save, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface RegionFormProps {
  region?: Region;
  onClose: () => void;
}

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export function RegionForm({ region, onClose }: RegionFormProps) {
  const queryClient = useQueryClient();
  const [cidade, setCidade] = useState(region?.cidade || "");
  const [estado, setEstado] = useState(region?.estado || "");
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: (data: Region) => surveyService.saveRegion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regions"] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || "Erro ao salvar região.");
    }
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cidade || !estado) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    saveMutation.mutate({
      id: region?.id || `region_${Date.now()}`,
      cidade,
      estado
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-2xl border border-outline flex flex-col max-h-[85vh] overflow-hidden"
      >
        <div className="flex items-center justify-between mb-10 shrink-0">
          <div>
            <h2 className="text-3xl font-black text-on-surface tracking-tight">
              {region ? "Editar Região" : "Cadastrar Região"}
            </h2>
            <p className="text-on-surface-variant font-medium">Defina a cidade e o estado para a abrangência de pesquisas</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 transition-all text-on-surface-variant"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar pb-6">
          {error && (
            <div className="p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center gap-3 text-error animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={20} />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant ml-1">Cidade / Município *</label>
              <input 
                type="text" 
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Ex: São Paulo"
                className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-outline rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-xl text-on-surface placeholder:text-on-surface-variant/30"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant ml-1">Estado *</label>
              <select 
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-outline rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-xl text-on-surface appearance-none cursor-pointer"
              >
                <option value="">UF</option>
                {BRAZILIAN_STATES.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>
        </form>

        <div className="pt-8 border-t border-outline shrink-0">
          <button 
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
            className="w-full flex items-center justify-center gap-3 py-5 bg-primary text-white rounded-[2rem] font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            <Save size={24} />
            {saveMutation.isPending ? "Salvando..." : (region ? "Atualizar Região" : "Salvar Localidade")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
