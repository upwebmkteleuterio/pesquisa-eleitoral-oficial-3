import { useState, useEffect } from "react";
import { CheckCircle, Share2, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PublicSuccessPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-8 animate-bounce">
        <CheckCircle size={60} />
      </div>
      
      <h1 className="text-3xl font-black text-on-surface mb-4 tracking-tight">Muito Obrigado!</h1>
      <p className="text-on-surface-variant text-lg max-w-md mb-12">
        Sua participação é fundamental. Suas respostas foram enviadas com sucesso e ajudarão muito em nosso estudo.
      </p>

      <div className="w-full max-w-xs space-y-4">
        <button 
          onClick={() => window.close()}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
        >
          Fechar Página
        </button>
        
        <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest opacity-60">
          Powered by Veraxus
        </p>
      </div>
    </div>
  );
}
