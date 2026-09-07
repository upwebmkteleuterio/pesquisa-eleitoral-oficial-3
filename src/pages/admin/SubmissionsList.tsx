import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { surveyService } from "../../services/surveyService";
import { submissionService } from "../../services/submissionService";
import { userService } from "../../services/userService";
import { exportSubmissions } from "../../utils/exportUtils";
import { ExportModal } from "../../components/admin/ExportModal";
import { 
  FileSpreadsheet, ChevronDown, Filter, 
  Database, Calendar, Clock, User, Globe, Smartphone, UserPlus
} from "lucide-react";
import { cn } from "../../lib/utils";
import { format } from "date-fns";

export default function SubmissionsList() {
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("");
  const [selectedResearcherId, setSelectedResearcherId] = useState<string>("todos");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const { data: surveys } = useQuery({ 
    queryKey: ['admin_surveys'], 
    queryFn: () => surveyService.getAll() 
  });

  const { data: allUsers } = useQuery({
    queryKey: ['all_users'],
    queryFn: () => userService.getAllUsers()
  });

  const { data: demographicOptions } = useQuery({
    queryKey: ['demographic_options_list'],
    queryFn: () => surveyService.getDemographicOptions()
  });

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['submissions', 'list', selectedSurveyId],
    queryFn: () => submissionService.getBySurveyId(selectedSurveyId),
    enabled: !!selectedSurveyId
  });

  const selectedSurvey = useMemo(() => 
    surveys?.find(s => s.id === selectedSurveyId), 
    [surveys, selectedSurveyId]
  );

  const dynamicColumns = useMemo(() => {
    if (!selectedSurvey?.schema_dinamico?.questions) return [];
    return selectedSurvey.schema_dinamico.questions;
  }, [selectedSurvey]);

  const filteredSubmissions = useMemo(() => {
    if (!submissions) return [];
    
    let filtered = submissions;
    if (selectedResearcherId !== "todos") {
      filtered = submissions.filter(s => 
        s.pesquisador_id === selectedResearcherId || 
        s.referenciado_por === selectedResearcherId
      );
    }

    return [...filtered].sort((a, b) => 
      new Date(b.data_coleta).getTime() - new Date(a.data_coleta).getTime()
    );
  }, [submissions, selectedResearcherId]);

  const handleExport = (format: 'xlsx' | 'csv') => {
    if (!selectedSurvey || !filteredSubmissions.length) return;
    
    exportSubmissions(
      filteredSubmissions,
      selectedSurvey.nome,
      allUsers || [],
      demographicOptions || [],
      dynamicColumns,
      format
    );
    setIsExportModalOpen(false);
  };

  const getLabel = (category: string, value: string) => {
    if (!value) return "-";
    const option = demographicOptions?.find(o => o.categoria === category && o.valor === value);
    return option ? option.label : value;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight">Respostas</h1>
          <p className="text-on-surface-variant font-medium">Dados brutos coletados em campo e web</p>
        </div>
        
        <div className="relative min-w-[320px]">
          <select 
            value={selectedSurveyId}
            onChange={(e) => setSelectedSurveyId(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-900 border border-outline rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm appearance-none cursor-pointer shadow-sm"
          >
            <option value="">Selecionar Formulário...</option>
            {surveys?.map(s => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" size={18} />
          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" size={18} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-outline overflow-hidden">
        {!selectedSurveyId ? (
          <div className="py-32 text-center flex flex-col items-center justify-center space-y-4 px-10">
             <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300">
                <Database size={40} />
             </div>
             <div className="max-w-xs mx-auto">
                <p className="text-on-surface font-bold text-lg">Nenhum formulário selecionado</p>
                <p className="text-on-surface-variant text-sm font-medium mt-1">Escolha uma pesquisa no menu acima para carregar os registros.</p>
             </div>
          </div>
        ) : isLoading ? (
          <div className="py-32 text-center">
             <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
             <p className="font-black text-primary uppercase text-xs tracking-widest">Carregando dados...</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="px-6 py-4 border-b border-outline bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap gap-4 justify-between items-center">
               <div className="flex items-center gap-3">
                 <span className="text-[10px] font-black uppercase text-on-surface-variant bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-outline shadow-sm">
                   {filteredSubmissions.length} Registros
                 </span>
               </div>
               
               <div className="flex items-center gap-3">
                  <div className="relative">
                    <select 
                      value={selectedResearcherId}
                      onChange={(e) => setSelectedResearcherId(e.target.value)}
                      className="pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-outline rounded-xl text-[11px] font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="todos">Todos os Membros</option>
                      {allUsers?.map(r => (
                        <option key={r.id} value={r.id}>{r.nome} {r.role === 'admin' ? '(Adm)' : ''}</option>
                      ))}
                    </select>
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={14} />
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" size={14} />
                  </div>

                  <button 
                    onClick={() => setIsExportModalOpen(true)}
                    disabled={!filteredSubmissions.length}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs shadow-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <FileSpreadsheet size={16} />
                    Exportar
                  </button>
               </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1800px]">
                <thead>
                  <tr className="border-b border-outline bg-slate-50/20 dark:bg-slate-800/10">
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant sticky left-0 bg-white dark:bg-slate-900 z-10">Entrevistado</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Origem</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Responsável (Dono do Link)</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Bairro</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Data/Hora</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant border-l border-outline/50">Sexo</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Faixa Etária</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Escolaridade</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Renda</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Religião</th>
                    {dynamicColumns.map((q: any) => (
                      <th key={q.id} className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-primary border-l border-outline/50 min-w-[200px]">
                        {q.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/50">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={10 + dynamicColumns.length} className="py-20 text-center text-on-surface-variant font-bold italic">Nenhum registro encontrado.</td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub) => {
                      const collector = allUsers?.find(r => r.id === sub.pesquisador_id);
                      const referrer = allUsers?.find(r => r.id === sub.referenciado_por);
                      const isWeb = sub.origem === 'web';

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                          <td className="px-6 py-5 sticky left-0 bg-white dark:bg-slate-900 z-10 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 transition-colors">
                             <span className="font-bold text-on-surface text-sm">{sub.nome_entrevistado || "Anônimo"}</span>
                          </td>
                          <td className="px-6 py-5">
                             <div className={cn(
                               "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border",
                               isWeb 
                                ? "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800" 
                                : "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800"
                             )}>
                               {isWeb ? <Globe size={12} /> : <Smartphone size={12} />}
                               {sub.origem || 'app'}
                             </div>
                          </td>
                          <td className="px-6 py-5">
                             <div className="flex flex-col">
                               <span className={cn(
                                 "text-[10px] font-black uppercase",
                                 isWeb ? "text-blue-600 dark:text-blue-400" : "text-on-surface-variant"
                               )}>
                                 {isWeb ? (referrer?.nome || "Link Direto") : (collector?.nome || "Sistema")}
                               </span>
                               {isWeb && referrer && (
                                 <span className="text-[8px] font-bold text-blue-500 uppercase flex items-center gap-1">
                                   <UserPlus size={10} /> Link do {referrer.role === 'admin' ? 'Adm' : 'Pesquisador'}
                                 </span>
                               )}
                             </div>
                          </td>
                          <td className="px-6 py-5">
                             <span className="text-xs font-medium text-on-surface-variant">{sub.bairro || "-"}</span>
                          </td>
                          <td className="px-6 py-5">
                             <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
                                <Calendar size={12} className="text-primary" />
                                {format(new Date(sub.data_coleta), "dd/MM/yy")}
                                <span className="text-outline mx-1 text-[10px]">|</span>
                                <Clock size={12} className="text-primary" />
                                {format(new Date(sub.data_coleta), "HH:mm")}
                             </div>
                          </td>
                          <td className="px-6 py-5 border-l border-outline/20">
                             <span className="text-xs font-bold text-on-surface">{getLabel('sexo', sub.dados_fixos?.sexo)}</span>
                          </td>
                          <td className="px-6 py-5">
                             <span className="text-xs font-bold text-on-surface">{getLabel('faixa_etaria', sub.dados_fixos?.faixa_etaria)}</span>
                          </td>
                          <td className="px-6 py-5">
                             <span className="text-xs font-medium text-on-surface-variant">{getLabel('escolaridade', sub.dados_fixos?.escolaridade)}</span>
                          </td>
                          <td className="px-6 py-5">
                             <span className="text-xs font-bold text-on-surface">{getLabel('renda', sub.dados_fixos?.renda)}</span>
                          </td>
                          <td className="px-6 py-5">
                             <span className="text-xs font-medium text-on-surface-variant">{getLabel('religiao', sub.dados_fixos?.religiao)}</span>
                          </td>
                          {dynamicColumns.map((q: any) => {
                            const val = sub.respostas_dinamicas[q.id];
                            return (
                              <td key={q.id} className="px-6 py-5 border-l border-outline/10">
                                 <span className="text-xs font-medium text-on-surface/80">
                                    {Array.isArray(val) ? val.join(", ") : (val?.toString() || "-")}
                                 </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
      />
    </div>
  );
}