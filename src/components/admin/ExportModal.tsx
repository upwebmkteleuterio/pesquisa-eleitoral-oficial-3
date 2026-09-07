"use client";

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileSpreadsheet, FileText, Download } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'xlsx' | 'csv') => void;
  isLoading?: boolean;
}

export function ExportModal({ isOpen, onClose, onExport, isLoading }: ExportModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-outline overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Download size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-on-surface tracking-tight">Exportar Dados</h2>
                  <p className="text-on-surface-variant font-medium text-xs">Escolha o formato do arquivo</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-8">
              <button
                onClick={() => onExport('xlsx')}
                disabled={isLoading}
                className="flex items-center gap-4 p-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-outline rounded-3xl hover:border-primary/50 hover:bg-white dark:hover:bg-slate-800 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <p className="font-black text-on-surface">Microsoft Excel (.xlsx)</p>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Ideal para análise e gráficos</p>
                </div>
              </button>

              <button
                onClick={() => onExport('csv')}
                disabled={isLoading}
                className="flex items-center gap-4 p-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-outline rounded-3xl hover:border-primary/50 hover:bg-white dark:hover:bg-slate-800 transition-all text-left group"
              >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText size={24} />
                </div>
                <div>
                  <p className="font-black text-on-surface">Texto Separado por Vírgulas (.csv)</p>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Compatível com qualquer sistema</p>
                </div>
              </button>
            </div>

            <button 
              onClick={onClose}
              className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-on-surface-variant rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Cancelar
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}