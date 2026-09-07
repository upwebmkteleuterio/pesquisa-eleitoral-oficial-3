"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import logo from '../assets/logo_veraxus.png';

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 3000; // Reduzido para 3 segundos
    const interval = 50;
    const step = 100 / (duration / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onFinish, 300); // Finaliza um pouco mais rápido também
          return 100;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center z-[9999]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-sm px-10 flex flex-col items-center"
      >
        <img src={logo} alt="Veraxus Logo" className="w-full h-auto mb-12" />
        
        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-[#053261]" // Cor aproximada da logo
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "linear" }}
          />
        </div>
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          Carregando Veraxus... {Math.round(progress)}%
        </p>
      </motion.div>
    </div>
  );
};

export default SplashScreen;