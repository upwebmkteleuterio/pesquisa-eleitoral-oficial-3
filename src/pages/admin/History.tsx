import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { submissionService } from "../../services/submissionService";
import { surveyService } from "../../services/surveyService";
import { userService } from "../../services/userService";
import { 
  Calendar, Clock, Search, History as HistoryIcon, 
  ChevronDown, Filter, User, ChevronRight, ClipboardList
} from "lucide-react";
import { cn } from "../../lib/utils";
import { format, startOfDay, endOfDay, subDays, startOfWeek, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HistoryDrawer } from "../../components/admin/HistoryDrawer";
import { Submission } from "../../types";

type DateFilter = 'hoje' | 'ontem' | 'semana' | 'mes' | 'personalizado';

export default function History() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>('hoje');
  const [customStartDate, setCustomStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: allSubmissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ['submissions', 'global'],
    queryFn: () => submissionService.getAllSynced()
  });

  const { data: surveys } = useQuery({ queryKey: ['admin_surveys'], queryFn: () => surveyService.getAll() });
  const { data: researchers } = useQuery({ queryKey: ['researchers'], queryFn: () => userService.getAllResearchers() });
  const { data: demographicOptions } = useQuery({ queryKey: ['demographicOptions'], queryFn: () => surveyService.getDemographicOptions() });

  const filteredSubmissions = useMemo(() => {
    if (!allSubmissions) return [];

    const now = new Date();
    let start: Date;
    let end: Date = endOfDay(now);

    switch (dateFilter) {
      case 'hoje':
        start = startOfDay(now);
        break;
      case 'ontem':
        start = startOfDay(subDays(now, 1));
        end = endOfDay(subDays(now, 1));
        break;
      case 'semana':
        start = startOfWeek(now, { weekStartsOn: 0 });
        break;
      case 'mes':
        start = startOfMonth(now);
        break;
      case 'personalizado':
        start = startOfDay(new Date(customStartDate + 'T00:00:00'));
        end = endOfDay(new Date(customEndDate + 'T23:59:59'));
        break;
      default:
        start = startOfDay(now);
    }

    return allSubmissions
      .filter(sub => {
        const subDate = new Date(sub.data_coleta);
        const matchesDate = subDate >= start && subDate <= end;
        const matchesSearch = 
          sub.nome_entrevistado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sub.bairro?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesDate && matchesSearch;
      })
      .sort((a, b) => new Date(b.data_coleta).getTime() - new Date(a.data_coleta).getTime());
  }, [allSubmissions, dateFilter, customStartDate, customEndDate, searchTerm]);

  const handleOpenDetail = (sub: Submission) => {
    setSelectedSubmission(sub);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header padrão */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
           <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm border border-primary/10">
              <HistoryIcon size={28} />
           </div>
           <div>
              <h1 className="text-3xl font-black text-on-surface tracking-tight leading-none mb-1">Histórico</h1>
              <p className="text-on-surface-variant font-medium text-sm">Registro cronológico de todas as entrevistas</p>
           </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3">
          {dateFilter === 'personalizado' && (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-outline shadow-sm animate-in slide-in-from-right-2">
               <input 
                type="date" 
                value={customStartDate} 
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-transparent text-[10px] font-black uppercase p-1 focus:outline-none"
               />
               <span className="text-outline">/</span>
               <input 
                type="date" 
                value={customEndDate} 
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-transparent text-[10px] font-black uppercase p-1 focus:outline-none"
               />
            </div>
          )}

          <div className="relative group min-w-[180px]">
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="w-full pl-10 pr-10 py-3 bg-white dark:bg-slate-900 border border-outline rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-xs appearance-none cursor-pointer shadow-sm uppercase tracking-widest"
            >
              <option value="hoje">Hoje</option>
              <option value="ontem">Ontem</option>
              <option value="semana">Esta Semana</option>
              <option value="mes">Este Mês</option>
              <option value="personalizado">Personalizado</option>
            </select>
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" size={16} />
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {/* Tabela de Histórico */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-outline overflow-hidden">
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome do respondente ou bairro..." 
            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-outline rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline">
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Respondente</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Pesquisa</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Data/Hora</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Pesquisador</th>
                <th className="px-4 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {submissionsLoading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-on-surface-variant animate-pulse font-bold">Buscando registros históricos...</td>
                </tr>
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                       <ClipboardList size={40} />
                    </div>
                    <p className="text-on-surface-variant font-bold text-lg">Nenhum registro para este período.</p>
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const survey = surveys?.find(s => s.id === sub.formulario_id);
                  const researcher = researchers?.find(r => r.id === sub.pesquisador_id);
                  
                  return (
                    <tr 
                      key={sub.id} 
                      onClick={() => handleOpenDetail(sub)}
                      className="border-b border-outline/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group"
                    >
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                              <User size={20} />
                           </div>
                           <div>
                              <p className="font-bold text-on-surface">{sub.nome_entrevistado || "Anônimo"}</p>
                              <p className="text-[10px] text-on-surface-variant font-medium">{sub.bairro || "Sem bairro"}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                         <span className="text-xs font-bold text-on-surface truncate max-w-[200px] block">{survey?.nome || "-"}</span>
                      </td>
                      <td className="px-4 py-5">
                         <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-xs font-black text-on-surface">
                               <Calendar size={12} className="text-primary" />
                               {format(new Date(sub.data_coleta), "dd/MM/yy")}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant">
                               <Clock size={12} className="text-primary" />
                               {format(new Date(sub.data_coleta), "HH:mm")}
                            </div>
                         </div>
                      </td>
                      <td className="px-4 py-5">
                         <span className="text-[10px] font-black uppercase text-on-surface-variant">{researcher?.nome || "Sistema"}</span>
                      </td>
                      <td className="px-4 py-5 text-right">
                         <div className="p-2 text-on-surface-variant group-hover:text-primary transition-colors">
                            <ChevronRight size={20} />
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

      {/* Drawer Lateral */}
      <HistoryDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        submission={selectedSubmission}
        survey={surveys?.find(s => s.id === selectedSubmission?.formulario_id)}
        researcher={researchers?.find(r => r.id === selectedSubmission?.pesquisador_id)}
        demographicOptions={demographicOptions}
      />
    </div>
  );
}