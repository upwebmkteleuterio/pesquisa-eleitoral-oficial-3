import React, { useState } from "react";
import { 
  FileUp, 
  Sparkles, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileText,
  Trash2,
  ExternalLink
} from "lucide-react";
import { cn } from "../../lib/utils";

export default function AiFormGenerator() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const [generatedJson, setGeneratedJson] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== 'application/pdf') {
        setErrorMessage("Por favor, selecione apenas arquivos PDF.");
        setStatus('error');
        return;
      }
      setFile(selected);
      setStatus('idle');
      setErrorMessage("");
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    setStatus('processing');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/ai/process-survey', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao processar arquivo");
      }

      const data = await response.json();
      setGeneratedJson(data);
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Ocorreu um erro inesperado.");
      setStatus('error');
    }
  };

  const copyToClipboard = () => {
    if (!generatedJson) return;
    navigator.clipboard.writeText(JSON.stringify(generatedJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setFile(null);
    setGeneratedJson(null);
    setStatus('idle');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-outline">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Sparkles size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-on-surface tracking-tight leading-none mb-2">
              Gerador de Formulários IA
            </h1>
            <p className="text-on-surface-variant font-medium text-sm">
              Transforme um PDF em um formulário digital instantaneamente.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Side */}
        <div className={cn(
          "bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 border-dashed transition-all",
          file ? "border-primary/30" : "border-outline hover:border-primary/20",
          status === 'processing' && "opacity-50 pointer-events-none"
        )}>
          {!file ? (
            <label className="flex flex-col items-center justify-center py-20 cursor-pointer text-center group">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-on-surface-variant mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                <FileUp size={40} />
              </div>
              <h3 className="text-xl font-black text-on-surface mb-2">Enviar PDF da Pesquisa</h3>
              <p className="text-on-surface-variant text-sm px-10">Arraste aqui ou clique para selecionar o arquivo da pesquisa em PDF.</p>
              <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
            </label>
          ) : (
            <div className="space-y-8 py-10 text-center">
              <div className="inline-flex items-center justify-center p-6 bg-primary/5 rounded-3xl text-primary">
                <FileText size={64} />
              </div>
              <div>
                <h3 className="text-xl font-black text-on-surface truncate px-4">{file.name}</h3>
                <p className="text-on-surface-variant text-sm">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>

              {status !== 'success' && (
                <div className="flex items-center gap-3 justify-center">
                  <button 
                    onClick={reset}
                    className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-on-surface-variant hover:text-error transition-all"
                  >
                    <Trash2 size={24} />
                  </button>
                  <button 
                    onClick={handleProcess}
                    disabled={status === 'processing'}
                    className="flex-1 max-w-[200px] py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {status === 'processing' ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Sparkles size={20} />
                    )}
                    {status === 'processing' ? "Processando..." : "Gerar Agora"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions / Result Side */}
        <div className="space-y-6">
          {status === 'idle' && (
            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl h-full flex flex-col">
              <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                <InfoIcon size={24} className="text-primary" />
                Como funciona
              </h3>
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0 font-black text-primary">1</div>
                  <p className="text-sm text-slate-300 font-medium">Você carrega o PDF da sua pesquisa em papel ou digital.</p>
                </li>
                <li className="flex gap-4">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0 font-black text-primary">2</div>
                  <p className="text-sm text-slate-300 font-medium">A IA do Gemini identifica todas as perguntas e alternativas automaticamente.</p>
                </li>
                <li className="flex gap-4">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0 font-black text-primary">3</div>
                  <p className="text-sm text-slate-300 font-medium">O sistema gera um código estruturado que você pode copiar.</p>
                </li>
                <li className="flex gap-4">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0 font-black text-primary">4</div>
                  <p className="text-sm text-slate-300 font-medium">Lá na criação de formulário, você cola esse código e a mágica acontece!</p>
                </li>
              </ul>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 dark:bg-red-900/10 border-2 border-red-500/20 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center h-full">
              <AlertCircle size={48} className="text-red-500 mb-4" />
              <h3 className="text-xl font-black text-on-surface mb-2">Ops! Algo deu errado</h3>
              <p className="text-red-600 dark:text-red-400 font-medium text-sm mb-6">{errorMessage}</p>
              <button 
                onClick={reset}
                className="px-8 py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {status === 'success' && generatedJson && (
            <div className="bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-500/20 p-8 rounded-[2.5rem] h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 text-emerald-500 rounded-xl flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="text-xl font-black text-on-surface">Pronto!</h3>
                </div>
                <button 
                  onClick={copyToClipboard}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all",
                    copied ? "bg-emerald-500 text-white" : "bg-white border-2 border-outline hover:border-primary/30"
                  )}
                >
                  {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copied ? "Copiado" : "Copiar Estrutura"}
                </button>
              </div>

              <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border-2 border-outline p-4 overflow-hidden flex flex-col relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white dark:to-slate-900 pointer-events-none opacity-50" />
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-3">Estrutura Gerada</p>
                <div className="overflow-y-auto custom-scrollbar flex-1">
                   <pre className="text-[10px] font-mono text-on-surface-variant font-medium">
                     {JSON.stringify(generatedJson, null, 2)}
                   </pre>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <p className="text-xs font-bold text-on-surface-variant text-center">Agora vá para a criação de formulário e use o botão "Importar IA".</p>
                <button 
                  onClick={() => window.open('/adm/formularios/novo', '_blank')}
                  className="w-full py-4 border-2 border-primary text-primary rounded-2xl font-black hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                >
                  Criar Novo Formulário
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoIcon({ size, className }: { size: number, className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
