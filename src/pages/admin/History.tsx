import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { submissionService } from "../../services/submissionService";
import { surveyService } from "../../services/surveyService";
import { userService } from "../../services/userService";
import { Calendar, Clock, Search, History as HistoryIcon, ChevronDown, User, ChevronRight, ClipboardList } from "lucide-react";
import { format, startOfDay, endOfDay, subDays, startOfWeek, startOfMonth } from "date-fns";
import { HistoryDrawer } from "../../components/admin/HistoryDrawer";
import Pagination from "../../components/Pagination";
import { Submission } from "../../types";
import type { HistoryPage } from "../../services/submissionService";

type DateFilter = 'hoje' | 'ontem' | 'semana' | 'mes' | 'personalizado';

const dateValue = (value: string, fallback: Date): Date => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

export default function History() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>('hoje');
  const [customStartDate, setCustomStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [page, setPage] = useState(1);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end = endOfDay(now);
    switch (dateFilter) {
      case 'hoje': start = startOfDay(now); break;
      case 'ontem': start = startOfDay(subDays(now, 1)); end = endOfDay(subDays(now, 1)); break;
      case 'semana': start = startOfWeek(now, { weekStartsOn: 0 }); break;
      case 'mes': start = startOfMonth(now); break;
      case 'personalizado':
        start = startOfDay(dateValue(customStartDate, now));
        end = endOfDay(dateValue(customEndDate, now));
        break;
      default: start = startOfDay(now);
    }
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }, [dateFilter, customStartDate, customEndDate]);

  const { data: historyPage, isLoading: submissionsLoading } = useQuery<HistoryPage>({
    queryKey: ['submissions', 'history', dateRange.startIso, dateRange.endIso, searchTerm, page],
    queryFn: () => submissionService.getHistoryPage({ ...dateRange, searchTerm, page }),
  });
  const submissions = historyPage?.data || [];
  const totalPages = Math.max(1, Math.ceil((historyPage?.total || 0) / 50));

  const { data: surveys } = useQuery({ queryKey: ['admin_surveys'], queryFn: () => surveyService.getAll() });
  const { data: researchers } = useQuery({ queryKey: ['researchers'], queryFn: () => userService.getAllResearchers() });
  const { data: demographicOptions } = useQuery({ queryKey: ['demographicOptions'], queryFn: () => surveyService.getDemographicOptions() });

  useEffect(() => {
    setPage(1);
  }, [dateFilter, customStartDate, customEndDate, searchTerm]);

  const handleOpenDetail = (sub: Submission) => {
    setSelectedSubmission(sub);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary shadow-sm"><HistoryIcon size={28} /></div>
          <div><h1 className="mb-1 text-3xl font-black leading-none tracking-tight text-on-surface">Histórico</h1><p className="text-sm font-medium text-on-surface-variant">Registro cronológico de todas as entrevistas</p></div>
        </div>
        <div className="flex flex-col items-center gap-3 md:flex-row">
          {dateFilter === 'personalizado' && <div className="flex items-center gap-2 rounded-2xl border border-outline bg-white p-2 shadow-sm dark:bg-slate-900"><input type="date" value={customStartDate} onChange={event => setCustomStartDate(event.target.value)} className="bg-transparent p-1 text-[10px] font-black uppercase focus:outline-none" /><span className="text-outline">/</span><input type="date" value={customEndDate} onChange={event => setCustomEndDate(event.target.value)} className="bg-transparent p-1 text-[10px] font-black uppercase focus:outline-none" /></div>}
          <div className="relative min-w-[180px]"><select value={dateFilter} onChange={event => setDateFilter(event.target.value as DateFilter)} className="w-full appearance-none rounded-2xl border border-outline bg-white py-3 pl-10 pr-10 text-xs font-bold uppercase tracking-widest shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-900"><option value="hoje">Hoje</option><option value="ontem">Ontem</option><option value="semana">Esta Semana</option><option value="mes">Este Mês</option><option value="personalizado">Personalizado</option></select><Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary" size={16} /><ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} /></div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2.5rem] border border-outline bg-white p-8 shadow-sm dark:bg-slate-900">
        <div className="relative mb-8"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} /><input type="text" placeholder="Buscar por nome do respondente ou bairro..." className="w-full rounded-2xl border border-outline bg-slate-50 py-4 pl-12 pr-4 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-800/50" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} /></div>
        <div className="custom-scrollbar overflow-x-auto">
          <table className="w-full border-collapse text-left"><thead><tr className="border-b border-outline"><th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Respondente</th><th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Pesquisa</th><th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Data/Hora</th><th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Pesquisador</th><th className="px-4 py-4 text-right"></th></tr></thead>
            <tbody>{submissionsLoading ? <tr><td colSpan={5} className="animate-pulse py-20 text-center font-bold text-on-surface-variant">Buscando registros históricos...</td></tr> : !submissions.length ? <tr><td colSpan={5} className="py-24 text-center"><div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300 dark:bg-slate-800"><ClipboardList size={40} /></div><p className="text-lg font-bold text-on-surface-variant">Nenhum registro para este período.</p></td></tr> : submissions.map(sub => {
              const survey = surveys?.find(item => item.id === sub.formulario_id);
              const researcher = researchers?.find(item => item.id === sub.pesquisador_id);
              return <tr key={sub.id} onClick={() => handleOpenDetail(sub)} className="group cursor-pointer border-b border-outline/50 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50"><td className="px-4 py-5"><div className="flex items-center gap-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary transition-transform group-hover:scale-110"><User size={20} /></div><div><p className="font-bold text-on-surface">{sub.nome_entrevistado || "Anônimo"}</p><p className="text-[10px] font-medium text-on-surface-variant">{sub.bairro || "Sem bairro"}</p></div></div></td><td className="px-4 py-5"><span className="block max-w-[200px] truncate text-xs font-bold text-on-surface">{survey?.nome || "-"}</span></td><td className="px-4 py-5"><div className="flex flex-col gap-0.5"><span className="flex items-center gap-1.5 text-xs font-black text-on-surface"><Calendar size={12} className="text-primary" />{format(new Date(sub.data_coleta), "dd/MM/yy")}</span><span className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant"><Clock size={12} className="text-primary" />{format(new Date(sub.data_coleta), "HH:mm")}</span></div></td><td className="px-4 py-5"><span className="text-[10px] font-black uppercase text-on-surface-variant">{researcher?.nome || "Sistema"}</span></td><td className="px-4 py-5 text-right"><div className="p-2 text-on-surface-variant transition-colors group-hover:text-primary"><ChevronRight size={20} /></div></td></tr>;
            })}</tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <HistoryDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} submission={selectedSubmission} survey={surveys?.find(s => s.id === selectedSubmission?.formulario_id)} researcher={researchers?.find(r => r.id === selectedSubmission?.pesquisador_id)} demographicOptions={demographicOptions} />
    </div>
  );
}
