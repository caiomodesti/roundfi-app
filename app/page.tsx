"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useState, useEffect } from "react";

export default function Home() {
  const { connected } = useWallet();
  const [yieldAmount, setYieldAmount] = useState(12.4582);
  const [mounted, setMounted] = useState(false);

  // Garante que a página carregou no cliente antes de renderizar a interface baseada na carteira
  useEffect(() => {
    setMounted(true);
  }, []);

  // Simulação de Yield
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      setYieldAmount((prev) => prev + 0.0015);
    }, 2000);
    return () => clearInterval(interval);
  }, [connected]);

  // Enquanto a página não montar, não renderizamos nada para evitar o erro de hidratação
  if (!mounted) return null;

  // ==========================================
  // TELA 2: SE O USUÁRIO ESTIVER CONECTADO (DASHBOARD)
  // ==========================================
  if (connected) {
    return (
      <main className="flex min-h-screen flex-col bg-[#0B132B] p-6 text-white font-sans">
        {/* Cabeçalho Superior */}
        <header className="flex justify-between items-center mb-10 border-b border-gray-800 pb-4 max-w-5xl w-full mx-auto">
          <div className="text-2xl font-bold">
            Round<span className="text-[#00FFA3]">Fi</span>
          </div>
          <WalletMultiButton style={{ backgroundColor: "#1C2541", color: "#00FFA3", border: "1px solid #00FFA3", height: "40px", borderRadius: "12px" }} />
        </header>

        {/* Conteúdo Central do Painel */}
        <div className="max-w-5xl w-full mx-auto space-y-8">
          <h2 className="text-3xl font-extrabold mb-2">Meu Painel</h2>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#1C2541] p-6 rounded-2xl border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">Total Travado (Stake)</p>
              <p className="text-3xl font-bold">5,000 <span className="text-sm font-normal text-gray-500">USDC</span></p>
            </div>

            <div className="bg-[#1C2541] p-6 rounded-2xl border border-[#00FFA3]/30 shadow-[0_0_20px_rgba(0,255,163,0.15)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#00FFA3] blur-3xl opacity-20"></div>
              <p className="text-gray-400 text-sm mb-1">Yield Gerado (Kamino)</p>
              <p className="text-3xl font-bold text-[#00FFA3]">+{yieldAmount.toFixed(4)} <span className="text-sm font-normal text-[#00FFA3]/70">USDC</span></p>
            </div>

            <div className="bg-[#1C2541] p-6 rounded-2xl border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">Meu Score (Reputação)</p>
              <p className="text-3xl font-bold text-[#8A2BE2]">Nível 1 <span className="text-sm font-normal text-gray-500">Iniciante</span></p>
            </div>
          </div>

          {/* Seção de Grupos Ativos */}
          <div className="mt-12">
            <h3 className="text-xl font-bold mb-4">Meus Grupos Ativos</h3>
            
            <div className="bg-[#1C2541] p-6 rounded-2xl border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-gray-600 transition-colors cursor-pointer">
              <div>
                <h4 className="text-lg font-bold text-white">Grupo Máquinas Pesadas</h4>
                <p className="text-gray-400 text-sm mt-1">Carta: 10,000 USDC • Prazo: 20 meses</p>
                <div className="flex gap-2 mt-3">
                  <span className="bg-gray-800 text-xs px-2 py-1 rounded text-gray-300">Mensalidade: 500 USDC</span>
                  <span className="bg-[#00FFA3]/10 text-[#00FFA3] text-xs px-2 py-1 rounded">Aguardando Sorteio</span>
                </div>
              </div>
              
              <div className="text-left md:text-right w-full md:w-auto bg-gray-900/50 p-4 rounded-xl">
                <p className="text-sm text-gray-400">Próximo Sorteio (Oráculo)</p>
                <p className="text-[#00FFA3] font-bold text-xl">Em 12 dias</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // TELA 1: SE O USUÁRIO NÃO ESTIVER CONECTADO (ONBOARDING)
  // ==========================================
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0B132B] p-6 text-white font-sans">
      <div className="flex flex-col items-center mb-12">
        <h1 className="text-5xl font-extrabold tracking-tight mb-4">
          Round<span className="text-[#00FFA3]">Fi</span>
        </h1>
        <p className="text-lg text-gray-300 text-center max-w-md">
          O seu colateral trabalhando. O seu crédito expandindo.
        </p>
      </div>

      <div className="hover:scale-105 transition-all duration-300">
        <WalletMultiButton style={{ backgroundColor: "#00FFA3", color: "#0B132B", fontWeight: "bold", borderRadius: "9999px", padding: "0 32px", height: "56px", fontSize: "1.125rem" }} />
      </div>

      <div className="absolute bottom-6 text-sm text-gray-500">
        Construído para o Colosseum Hackathon
      </div>
    </main>
  );
}