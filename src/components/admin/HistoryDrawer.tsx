"use client";

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, MapPin, Calendar, Clock, FileText, ClipboardCheck, Phone, Sparkles, Download } from 'lucide-react';
import { Submission, Survey, Researcher, DemographicOption } from '../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateInterviewPDF } from '../../utils/pdfUtils';
import { cn } from '../../lib/utils';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  submission: Submission | null;
  survey?: Survey;
  researcher?: Researcher;
  demographicOptions?: DemographicOption[];
}

export function HistoryDrawer({ isOpen, onClose, submission, survey, researcher, demographicOptions }: HistoryDrawerProps) {
  if (!submission) return null;

  const getLabel = (category: string, value: string) => {
    if (!value) return "-";
    const option = demographicOptions?.find(o => o.categoria === category && o.valor === value);
    return option ? option.label : value;
  };

  const demographicFields = [
    { label: 'Sexo', value: getLabel('sexo', submission.dados_fixos?.sexo) },
    { label: 'Faixa Etária', value: getLabel('faixa_etaria', submission.dados_fixos?.faixa_etaria) },
    { label: 'Escolaridade', value: getLabel('escolaridade', submission.dados_fixos?.escolaridade) },
    { label: 'Renda', value: getLabel('renda', submission.dados_fixos?.renda) },
    { label: 'Religião', value: getLabel('religiao', submission.dados_fixos?.religiao) },
    { label: 'Estado Civil', value: getLabel('estado_civil', submission.dados_fixos?.estado_civil) },
  ];

  const handleExportPDF = () => {
    generateInterviewPDF(submission, survey, researcher, demographicOptions);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex justify-end">
          {/* Backdrop com cobertura total forçada */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-md w-screen h-screen"
            style={{ height: '100dvh', width: '100dvw' }}
          />
          
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl border-l border-outline flex flex-col h-full"
          >
            {/* Header */}
            <div className="p-6 border-b border-outline flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <ClipboardCheck size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-on-surface tracking-tight">Ficha da Entrevista</h2>
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Protocolo: {submission.id.slice(0, 8)}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 text-on-surface-variant hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all shadow-sm"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
              {/* Pesquisa e Pesquisador */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-outline">
                    <p className="text-[9px] font-black uppercase text-on-surface-variant mb-1">Pesquisa</p>
                    <p className="text-sm font-bold text-on-surface line-clamp-1">{survey?.nome || 'Não identificada'}</p>
                 </div>
                 <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-outline">
                    <p className="text-[9px] font-black uppercase text-on-surface-variant mb-1">Coletor</p>
                    <p className="text-sm font-bold text-on-surface line-clamp-1">{researcher?.nome || 'Sistema'}</p>
                 </div>
              </div>

              {/* Dados do Respondente */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-outline pb-2">
                   <User size={18} className="text-primary" />
                   <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">Respondente</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                   <div className="space-y-1">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase">Nome Completo</p>
                      <p className="text-lg font-black text-on-surface">{submission.nome_entrevistado || "Anônimo"}</p>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase flex items-center gap-1">
                          <Phone size={10} /> Telefone
                        </p>
                        <p className="text-sm font-bold text-on-surface">{submission.telefone || "-"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase flex items-center gap-1">
                          <MapPin size={10} /> Bairro
                        </p>
                        <p className="text-sm font-bold text-on-surface">{submission.bairro || "-"}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-6 pt-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                         <Calendar size={14} className="text-primary" />
                         {format(new Date(submission.data_coleta), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                         <Clock size={14} className="text-primary" />
                         {format(new Date(submission.data_coleta), "HH:mm")}
                      </div>
                   </div>
                </div>
              </section>

              {/* Perfil Demográfico */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-outline pb-2">
                   <FileText size={18} className="text-primary" />
                   <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">Perfil Demográfico</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                   {demographicFields.map(f => (
                     <div key={f.label} className="space-y-1">
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase">{f.label}</p>
                        <p className="text-sm font-black text-on-surface">{f.value}</p>
                     </div>
                   ))}
                </div>
              </section>

              {/* Respostas da Pesquisa */}
              <section className="space-y-6 pb-10">
                <div className="flex items-center gap-2 border-b border-outline pb-2">
                   <Sparkles size={18} className="text-primary" />
                   <h3 className="text-xs font-black uppercase tracking-widest text-on-surface">Respostas da Pesquisa</h3>
                </div>
                <div className="space-y-8">
                   {survey?.schema_dinamico?.questions.map((q: any) => {
                     const value = submission.respostas_dinamicas[q.id];
                     return (
                       <div key={q.id} className="space-y-2 group">
                          <p className="text-xs font-bold text-on-surface-variant leading-relaxed group-hover:text-primary transition-colors">{q.label}</p>
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-outline">
                             <p className="text-sm font-black text-on-surface">
                                {Array.isArray(value) ? value.join(", ") : (value?.toString() || "-")}
                             </p>
                          </div>
                       </div>
                     );
                   })}
                </div>
              </section>
            </div>

            {/* Footer com botão de Exportação Verde */}
            <div className="p-6 border-t border-outline shrink-0 bg-white dark:bg-slate-900">
               <button 
                 onClick={handleExportPDF}
                 className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-tighter"
               >
                 <Download size={20} />
                 Exportar ficha em PDF
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}