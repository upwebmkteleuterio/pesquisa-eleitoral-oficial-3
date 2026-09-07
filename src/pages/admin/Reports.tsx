import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { surveyService } from "../../services/surveyService";
import { submissionService } from "../../services/submissionService";
import { 
  PieChart as PieChartIcon, 
  BarChart as BarChartIcon, Users, 
  BarChart3, LayoutList
} from "lucide-react";
import { 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer,
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Legend
} from 'recharts';
import { cn } from "../../lib/utils";

const COLORS = ['#10b981', '#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#475569'];

const LABELS_MAP: Record<string, Record<string, string>> = {
  sexo: { masculino: 'Masculino', feminino: 'Feminino', outro: 'Outro' },
  faixa_etaria: { '16-24': '16-24 anos', '25-34': '25-34 anos', '35-44': '35-44 anos', '45-59': '45-59 anos', '60+': '60+ anos' },
  renda: { 'ate_1sm': 'Até 1 SM', '1_2sm': '1-2 SM', '2_5sm': '2-5 SM', '5_10sm': '5-10 SM', 'mais_10sm': '+10 SM', 'sem_renda': 'S/ Renda' },
  escolaridade: { 'analfabeto': 'Analfabeto', 'fund_incomp': 'Fund. Inc', 'fund_comp': 'Fund. Comp', 'medio_incomp': 'Médio Inc', 'medio_comp': 'Médio Comp', 'superior_incomp': 'Sup. Inc', 'superior_comp': 'Sup. Comp' },
  religiao: { 'catolico': 'Católico', 'evangelico': 'Evangélico', 'espirita': 'Espírita', 'umbanda_candomble': 'Afro', 'outra': 'Outras', 'sem_religiao': 'Sem Religião' },
  estado_civil: { 'solteiro': 'Solteiro', 'casado': 'Casado', 'divorciado': 'Divorciado', 'viuvo': 'Viúvo', 'uniao_estavel': 'U. Estável' }
};

type ChartType = 'horizontal' | 'vertical' | 'pie';

export default function Reports() {
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("");
  const [chartType, setChartType] = useState<ChartType>('horizontal');

  const { data: surveys } = useQuery({ 
    queryKey: ['admin_surveys'], 
    queryFn: () => surveyService.getAll() 
  });

  const { data: submissions } = useQuery({
    queryKey: ['submissions', selectedSurveyId],
    queryFn: () => submissionService.getBySurveyId(selectedSurveyId),
    enabled: !!selectedSurveyId
  });

  const stats = useMemo(() => {
    if (!submissions || submissions.length === 0) return null;

    const demographicData: Record<string, any[]> = {};
    const dynamicData: Record<string, any[]> = {};

    ['sexo', 'faixa_etaria', 'renda', 'escolaridade', 'religiao', 'estado_civil'].forEach(key => {
      const counts: Record<string, number> = {};
      submissions.forEach(sub => {
        const val = sub.dados_fixos[key];
        if (val) counts[val] = (counts[val] || 0) + 1;
      });
      demographicData[key] = Object.entries(counts).map(([name, value]) => ({ 
        name: LABELS_MAP[key]?.[name] || name, 
        value 
      }));
    });

    submissions.forEach(sub => {
      Object.entries(sub.respostas_dinamicas).forEach(([key, value]) => {
        if (typeof value === 'string' && value.trim()) {
          if (!dynamicData[key]) dynamicData[key] = [];
          const existing = dynamicData[key].find(d => d.name === value);
          if (existing) existing.value++; 
          else dynamicData[key].push({ name: value, value: 1 });
        }
      });
    });

    return { total: submissions.length, demographicData, dynamicData };
  }, [submissions]);

  const renderChart = (data: any[]) => {
    if (chartType === 'horizontal') {
      return (
        <div className="space-y-4">
          {data.sort((a, b) => b.value - a.value).map((item, idx) => {
            const percent = (item.value / (stats?.total || 1)) * 100;
            return (
              <div key={idx} className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-[1.5rem] space-y-3 border border-transparent hover:border-primary/20">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-on-surface-variant truncate max-w-[200px]">{item.name}</span>
                  <span className="text-white px-2.5 py-0.5 rounded-lg" style={{ backgroundColor: COLORS[idx % COLORS.length] }}>{percent.toFixed(1)}%</span>
                </div>
                <div className="h-2.5 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border border-outline">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${percent}%` }} 
                    className="h-full rounded-full" 
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (chartType === 'vertical') {
      return (
        <div className="h-[300px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ReBarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
              <Tooltip 
                cursor={{ fill: 'rgba(5, 150, 105, 0.05)' }} 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
              />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </ReBarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div className="h-[400px] w-full flex flex-col relative">
        <ResponsiveContainer width="100%" height="100%">
          <RePieChart>
            <Pie 
              data={data} 
              innerRadius={65} 
              outerRadius={95} 
              paddingAngle={5} 
              dataKey="value"
              cx="50%"
              cy="60%"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
            <Legend 
              verticalAlign="top" 
              align="center" 
              iconType="circle"
              iconSize={10}
              wrapperStyle={{ 
                paddingBottom: '30px',
                fontSize: '11px', 
                fontWeight: '800',
                color: '#64748b',
                textTransform: 'uppercase'
              }}
            />
          </RePieChart>
        </ResponsiveContainer>
        <div className="absolute top-[65%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-on-surface leading-none">{stats?.total}</span>
          <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mt-1">Total</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white dark:bg-slate-900 border border-outline rounded-[3rem] shadow-sm overflow-hidden">
        <div className="p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                 <PieChartIcon size={24} />
               </div>
               <div>
                 <h1 className="text-3xl font-black text-on-surface tracking-tight leading-none mb-1">Relatórios</h1>
                 <p className="text-on-surface-variant font-medium text-sm">Visualização dinâmica dos dados coletados</p>
               </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <select 
                  value={selectedSurveyId}
                  onChange={(e) => setSelectedSurveyId(e.target.value)}
                  className="pl-6 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-outline rounded-2xl focus:border-primary transition-all font-black text-sm appearance-none cursor-pointer"
                >
                  <option value="">Selecione uma Pesquisa...</option>
                  {surveys?.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" size={18} />
              </div>

              <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-outline">
                {[
                  { id: 'horizontal', icon: LayoutList },
                  { id: 'vertical', icon: BarChart3 },
                  { id: 'pie', icon: PieChartIcon }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setChartType(type.id as ChartType)}
                    className={cn(
                      "p-3 rounded-xl transition-all flex items-center justify-center",
                      chartType === type.id 
                        ? "bg-white dark:bg-slate-900 text-primary shadow-md scale-110" 
                        : "text-on-surface-variant opacity-40 hover:opacity-100"
                    )}
                    title={type.id}
                  >
                    <type.icon size={20} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedSurveyId && stats ? (
        <div className="space-y-12">
          {/* Perfil Demográfico */}
          <section className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] border border-outline shadow-sm space-y-12">
             <div className="flex items-center gap-3">
               <Users className="text-primary" size={28} />
               <h3 className="text-2xl font-black text-on-surface tracking-tight">Perfil Demográfico</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-y-16 gap-x-12">
               {Object.entries(stats.demographicData).map(([key, data]) => (
                 <div key={key} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="border-b-2 border-primary/10 pb-3">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
                        {key.replace('_', ' ')}
                      </h4>
                    </div>
                    {renderChart(data)}
                 </div>
               ))}
             </div>
          </section>

          {/* Perguntas Dinâmicas */}
          {Object.keys(stats.dynamicData).length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {Object.entries(stats.dynamicData).map(([key, data]) => (
                <section key={key} className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] border border-outline shadow-sm space-y-10 animate-in fade-in zoom-in-95 duration-500">
                   <div className="flex items-start justify-between gap-4 border-b border-outline pb-6">
                      <h3 className="text-xl font-black text-on-surface leading-tight">
                        {surveys?.find(s => s.id === selectedSurveyId)?.schema_dinamico?.questions?.find((q: any) => q.id === key)?.label || key}
                      </h3>
                      <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center shrink-0 text-primary border border-primary/10">
                        <BarChartIcon size={24} />
                      </div>
                   </div>
                   {renderChart(data)}
                </section>
              ))}
            </div>
          )}
        </div>
      ) : selectedSurveyId && (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-outline border-dashed">
          <p className="text-on-surface-variant font-bold">Nenhum dado coletado para esta pesquisa ainda.</p>
        </div>
      )}
    </div>
  );
}

function ChevronDown({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}