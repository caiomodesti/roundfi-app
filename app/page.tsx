"use client";

import { useWallet, useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useState, useEffect } from "react";
import { PublicKey, SystemProgram } from "@solana/web3.js"; 
import { utils, BN } from "@coral-xyz/anchor";
import { getProvider, getProgram, PROGRAM_ID } from "./utils/anchor";

export default function Home() {
  const { connected, publicKey } = useWallet();
  const anchorWallet = useAnchorWallet(); 
  
  const [yieldAmount, setYieldAmount] = useState(12.4582);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const [isSigned, setIsSigned] = useState(true); 
  const [installmentPaid, setInstallmentPaid] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isProcessingTx, setIsProcessingTx] = useState(false); 
  
  // Estados do Leilão e Tempo
  const [bidAmount, setBidAmount] = useState("");
  const [isBidding, setIsBidding] = useState(false);
  const [daysUntilDue, setDaysUntilDue] = useState(7); // Começa faltando 7 dias (Amarelo)

  const [realTotalPool, setRealTotalPool] = useState<number>(0);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [marketFilter, setMarketFilter] = useState("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      setYieldAmount((prev) => prev + 0.0015);
    }, 2000);
    return () => clearInterval(interval);
  }, [connected]);

  const fetchBlockchainData = async () => {
    if (!anchorWallet) return;
    try {
      setIsLoadingData(true);
      const provider = getProvider(anchorWallet);
      const program = getProgram(provider);

      const [groupStatePDA] = PublicKey.findProgramAddressSync(
        [utils.bytes.utf8.encode("group_state")],
        PROGRAM_ID
      );

      // Adicionamos o "as any" aqui para o TypeScript parar de reclamar
      const groupData = await program.account.groupState.fetch(groupStatePDA) as any;

const pool = groupData.totalAmount ? groupData.totalAmount.toNumber() : 
             (groupData.totalPool ? groupData.totalPool.toNumber() : 0);

const highest = groupData.highestBid ? groupData.highestBid.toNumber() : 0;

      setRealTotalPool(pool);
      // Se você tiver o estado de highest bid criado:
      // setRealHighestBid(highest); 

    } catch (error) {
      console.log("Cofre ainda não inicializado ou sem dados.");
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchBlockchainData();
  }, [anchorWallet, activeTab]);

  const handleInitGroup = async () => {
    try {
      if (!anchorWallet) return alert("Conecte a carteira!");
      setIsProcessingTx(true);
      const provider = getProvider(anchorWallet);
      const program = getProgram(provider);
      const [groupStatePDA] = PublicKey.findProgramAddressSync([utils.bytes.utf8.encode("group_state")], PROGRAM_ID);

      await program.methods.initializeGroup().accounts({
          groupState: groupStatePDA,
          admin: anchorWallet.publicKey,
          systemProgram: SystemProgram.programId,
      }).rpc();

      alert("Cofre inicializado!");
      fetchBlockchainData();
    } catch (error: any) { alert("Erro: " + error.message); } finally { setIsProcessingTx(false); }
  };

  const handleParticipate = async () => {
    try {
      if (!anchorWallet || !publicKey) return alert("Carteira não está pronta.");
      setIsProcessingTx(true);
      const provider = getProvider(anchorWallet);
      const program = getProgram(provider);
      const [groupStatePDA] = PublicKey.findProgramAddressSync([utils.bytes.utf8.encode("group_state")], PROGRAM_ID);
      const [userPositionPDA] = PublicKey.findProgramAddressSync([utils.bytes.utf8.encode("user"), anchorWallet.publicKey.toBuffer()], PROGRAM_ID);

      await program.methods.joinGroup(1, new BN(100)).accounts({
          groupState: groupStatePDA, userPosition: userPositionPDA, user: anchorWallet.publicKey, systemProgram: SystemProgram.programId,
      }).rpc();
      
      setIsSigned(true);
      setActiveTab("dashboard");
      fetchBlockchainData();
    } catch (error: any) { alert("Falha na transação."); } finally { setIsProcessingTx(false); }
  };

  const handlePlaceBid = async () => {
    try {
      if (!anchorWallet) return alert("Conecte a carteira!");
      if (!bidAmount || isNaN(Number(bidAmount))) return alert("Digite um valor válido.");
      setIsBidding(true);
      const provider = getProvider(anchorWallet);
      const program = getProgram(provider);
      const [groupStatePDA] = PublicKey.findProgramAddressSync([utils.bytes.utf8.encode("group_state")], PROGRAM_ID);
      const [userPositionPDA] = PublicKey.findProgramAddressSync([utils.bytes.utf8.encode("user"), anchorWallet.publicKey.toBuffer()], PROGRAM_ID);

      await program.methods.placeBid(new BN(Number(bidAmount))).accounts({
          groupState: groupStatePDA, userPosition: userPositionPDA, user: anchorWallet.publicKey,
      }).rpc();

      alert(`Seu lance secreto de ${bidAmount} USDC foi enviado para a urna do contrato!`);
      setBidAmount("");
    } catch (error: any) {
      alert("Erro ao enviar lance secreto.");
    } finally {
      setIsBidding(false);
    }
  };

  const handlePayInstallment = () => {
    setIsPaying(true);
    setTimeout(() => { setIsPaying(false); setInstallmentPaid(true); }, 1500);
  };

  // Lógica de Cores do Semáforo
  const isUrgent = daysUntilDue <= 3;

  if (!mounted) return null;

  // ==========================================
  // TELA DO USUÁRIO CONECTADO (APP)
  // ==========================================
  if (connected) {
    return (
      <main className="flex min-h-screen flex-col bg-[#0B132B] p-6 text-white font-sans relative">
        
        {/* MODAL DE SCORE DE REPUTAÇÃO */}
        {showScoreModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#1C2541] border border-[#8A2BE2] p-8 rounded-2xl max-w-md w-full shadow-[0_0_40px_rgba(138,43,226,0.2)]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Score de Reputação</h3>
                <button onClick={() => setShowScoreModal(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
              </div>
              <div className="space-y-4 text-gray-300">
                <p>O <strong>RoundFi Score</strong> mede o seu comprometimento com o protocolo e destrava benefícios exclusivos.</p>
                <ul className="space-y-3 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                  <li className="flex justify-between"><span className="text-[#8A2BE2] font-bold">Nível 1 (Iniciante)</span> <span>Taxa Padrão</span></li>
                  <li className="flex justify-between"><span className="text-[#00FFA3] font-bold">Nível 2 (Confiável)</span> <span>Yield turbinado +2%</span></li>
                  <li className="flex justify-between"><span className="text-yellow-400 font-bold">Nível 3 (Mestre)</span> <span>Acesso a Grupos VIP</span></li>
                </ul>
                <p className="text-sm text-gray-400 pt-2 border-t border-gray-800">💡 <em>Pague suas mensalidades em dia e mantenha seu colateral travado para subir de nível automaticamente.</em></p>
              </div>
            </div>
          </div>
        )}

        {/* ALERTA DINÂMICO DE INADIMPLÊNCIA (AMARELO OU VERMELHO) */}
        {isSigned && !installmentPaid && (
          <div className={`px-4 py-3 rounded-xl mb-6 max-w-5xl w-full mx-auto flex justify-between items-center transition-colors duration-500 ${isUrgent ? 'bg-red-500/10 border border-red-500 text-red-400 animate-pulse' : 'bg-yellow-500/10 border border-yellow-500/50 text-yellow-500'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{isUrgent ? '🚨' : '⚠️'}</span>
              <div>
                <p className="font-bold text-sm">{isUrgent ? 'Atenção: Vencimento Iminente' : 'Lembrete de Mensalidade'}</p>
                <p className={`text-xs ${isUrgent ? 'text-red-400/80' : 'text-yellow-500/80'}`}>A mensalidade do Grupo "Expansão Comercial" vence em {daysUntilDue} {daysUntilDue === 1 ? 'dia' : 'dias'}.</p>
              </div>
            </div>
            <button onClick={() => setActiveTab("dashboard")} className={`text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors ${isUrgent ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-600 hover:bg-yellow-700'}`}>
              Pagar Agora
            </button>
          </div>
        )}

        {/* CABEÇALHO */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-gray-800 pb-4 max-w-5xl w-full mx-auto gap-4">
          <div className="text-2xl font-bold cursor-pointer flex items-center gap-2" onClick={() => setActiveTab("dashboard")}>
            {/* <img src="/logo.png" alt="RoundFi Logo" className="h-8 w-auto" /> */}
            Round<span className="text-[#00FFA3]">Fi</span>
          </div>
          
          <nav className="flex gap-6 bg-[#1C2541] px-6 py-2 rounded-full border border-gray-800">
            <button onClick={() => setActiveTab("dashboard")} className={`font-medium transition-colors ${activeTab === "dashboard" ? "text-[#00FFA3]" : "text-gray-400 hover:text-white"}`}>
              Meu Painel
            </button>
            <button onClick={() => setActiveTab("explorer")} className={`font-medium transition-colors ${activeTab === "explorer" ? "text-[#00FFA3]" : "text-gray-400 hover:text-white"}`}>
              Explorar Grupos
            </button>
          </nav>
          <WalletMultiButton style={{ backgroundColor: "#1C2541", color: "#00FFA3", border: "1px solid #00FFA3", height: "40px", borderRadius: "12px" }} />
        </header>

        {/* ABA: MEU PAINEL */}
        {activeTab === "dashboard" && (
          <div className="max-w-5xl w-full mx-auto space-y-8 animate-in fade-in duration-500">
            <h2 className="text-3xl font-extrabold mb-2">Meu Painel</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#1C2541] p-6 rounded-2xl border border-gray-800 transition-all">
                <p className="text-gray-400 text-sm mb-1">Total Travado no Cofre</p>
                <p className="text-3xl font-bold">{isLoadingData ? "..." : realTotalPool} <span className="text-sm font-normal text-gray-500">USDC</span></p>
              </div>
              <div className="bg-[#1C2541] p-6 rounded-2xl border border-[#00FFA3]/30 shadow-[0_0_20px_rgba(0,255,163,0.15)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#00FFA3] blur-3xl opacity-20"></div>
                <p className="text-gray-400 text-sm mb-1">Yield Gerado (Kamino)</p>
                <p className="text-3xl font-bold text-[#00FFA3]">+{yieldAmount.toFixed(4)} <span className="text-sm font-normal text-[#00FFA3]/70">USDC</span></p>
              </div>
              <div 
                className="bg-[#1C2541] p-6 rounded-2xl border border-[#8A2BE2]/50 hover:border-[#8A2BE2] cursor-pointer transition-all group"
                onClick={() => setShowScoreModal(true)}
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="text-gray-400 text-sm">Meu Score (Reputação)</p>
                  <span className="text-[#8A2BE2] text-xs opacity-0 group-hover:opacity-100 transition-opacity">Ver Detalhes ↗</span>
                </div>
                <p className="text-3xl font-bold text-[#8A2BE2]">Nível 1 <span className="text-sm font-normal text-gray-500">Iniciante</span></p>
              </div>
            </div>

            <div className="mt-12">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-xl font-bold">Meus Grupos Ativos</h3>
                {/* BOTÃO ESCONDIDO PARA TESTE: Simula os dias passando */}
                {!installmentPaid && (
                  <button onClick={() => setDaysUntilDue(prev => prev > 1 ? prev - 1 : 7)} className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded hover:bg-gray-700">
                    ⚙️ Simular Tempo (-1 dia)
                  </button>
                )}
              </div>
              
              {isSigned && (
                <div className={`bg-[#1C2541] p-6 rounded-2xl border transition-all animate-in fade-in ${
                  installmentPaid ? 'border-[#00FFA3]/50 hover:border-[#00FFA3]' : 
                  (isUrgent ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-yellow-500/30 hover:border-yellow-500/50')
                }`}>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex justify-between items-start">
                        <h4 className="text-lg font-bold text-white mb-2">Expansão Comercial</h4>
                        {installmentPaid ? (
                          <span className="bg-[#00FFA3]/20 text-[#00FFA3] text-xs px-3 py-1 rounded-full font-bold border border-[#00FFA3]/30">✓ Em Dia</span>
                        ) : (
                          <span className={`${isUrgent ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'} text-xs px-3 py-1 rounded-full font-bold border`}>
                            Pendente
                          </span>
                        )}
                      </div>
                      
                      <div className="w-full bg-gray-800 rounded-full h-2 mb-2 mt-1">
                        <div className={`h-2 rounded-full transition-all duration-1000 ${installmentPaid ? 'bg-[#00FFA3] w-[5%]' : (isUrgent ? 'bg-red-500 w-[0%]' : 'bg-yellow-500 w-[0%]')}`}></div>
                      </div>
                      <p className="text-gray-400 text-xs mb-4">{installmentPaid ? '1/20 Parcelas Pagas' : '0/20 Parcelas Pagas'}</p>

                      {!installmentPaid ? (
                        <button 
                          onClick={handlePayInstallment} disabled={isPaying}
                          className={`${isUrgent ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-yellow-500 hover:bg-yellow-600 text-black shadow-[0_0_10px_rgba(234,179,8,0.2)]'} text-white font-bold py-2 px-6 rounded-lg text-sm transition-all disabled:opacity-50 flex items-center gap-2`}
                        >
                          {isPaying ? "Processando..." : "Pagar Mensalidade (1,000 USDC)"}
                        </button>
                      ) : (
                        <p className="text-sm text-[#00FFA3] border border-[#00FFA3]/30 inline-block px-4 py-2 rounded-lg bg-[#00FFA3]/10">Mensalidade deste mês paga.</p>
                      )}
                    </div>

                    <div className="text-left md:text-right w-full md:w-auto bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                      <p className="text-sm text-gray-400 mb-1">Último Lance Vencedor</p>
                      <p className="text-white font-bold text-xl">6,500 USDC</p>
                      <p className="text-xs text-gray-500 mt-1">Sorteio em 30 dias</p>
                    </div>
                  </div>

                  {/* LEILÃO SECRETO (ENVELOPE FECHADO) */}
                  <div className="mt-6 pt-6 border-t border-gray-800">
                    <p className="text-sm text-gray-400 mb-2">Urna de Lances (Envelope Fechado - Seu lance é secreto)</p>
                    <div className="flex gap-3">
                      <input 
                        type="number" 
                        placeholder="Digite seu lance em USDC" 
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg focus:ring-[#8A2BE2] focus:border-[#8A2BE2] block w-full p-2.5 outline-none transition-colors"
                      />
                      <button 
                        onClick={handlePlaceBid}
                        disabled={isBidding || !bidAmount}
                        className="bg-transparent border border-[#8A2BE2] text-[#8A2BE2] hover:bg-[#8A2BE2] hover:text-white font-bold py-2 px-6 rounded-lg text-sm transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isBidding ? "Selando..." : "Enviar Lance Secreto"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: EXPLORAR COM FILTROS */}
        {activeTab === "explorer" && (
          <div className="max-w-5xl w-full mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-extrabold mb-2">Grupos Abertos</h2>
                <p className="text-gray-400 text-lg">Escolha um consórcio para fazer Stake de acordo com seu perfil.</p>
              </div>
              <button onClick={handleInitGroup} disabled={isProcessingTx} className="text-xs text-gray-600 hover:text-[#00FFA3] transition-colors bg-transparent border border-gray-800 px-3 py-1 rounded">
                ⚙️ Setup Admin
              </button>
            </div>

            {/* FILTROS DO MERCADO */}
            <div className="flex flex-wrap gap-3 mb-6">
              {['all', 'small', 'medium', 'large'].map((filter) => (
                <button 
                  key={filter}
                  onClick={() => setMarketFilter(filter)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                    marketFilter === filter 
                    ? 'bg-[#00FFA3] text-[#0B132B] border-[#00FFA3]' 
                    : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  {filter === 'all' && 'Todos os Grupos'}
                  {filter === 'small' && 'Até 10k USDC'}
                  {filter === 'medium' && '10k a 50k USDC'}
                  {filter === 'large' && 'Acima de 50k USDC'}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* CARD DE GRUPO */}
              <div className="bg-[#1C2541] p-6 rounded-2xl border border-gray-800 hover:border-[#00FFA3] transition-all group shadow-lg shadow-[#00FFA3]/5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold">Expansão Comercial</h3>
                  <span className="bg-[#00FFA3]/20 text-[#00FFA3] text-xs px-2 py-1 rounded font-bold">Vagas: 18/20</span>
                </div>
                <div className="space-y-3 mb-8">
                  <p className="flex justify-between text-gray-400 border-b border-gray-800 pb-2"><span className="text-sm">Carta:</span> <span className="text-white font-bold">20,000 USDC</span></p>
                  <p className="flex justify-between text-gray-400 border-b border-gray-800 pb-2"><span className="text-sm">Stake Inicial:</span> <span className="text-[#00FFA3] font-bold">100 USDC</span></p>
                  <p className="flex justify-between text-gray-400"><span className="text-sm">Prazo:</span> <span className="text-white">20 meses</span></p>
                </div>
                <button 
                  onClick={handleParticipate} 
                  disabled={isProcessingTx}
                  className="w-full bg-[#00FFA3] text-[#0B132B] py-3 rounded-xl font-bold hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {isProcessingTx ? "Aprovando Transação..." : "Assinar Contrato & Entrar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // ==========================================
  // TELA INICIAL (LANDING PAGE PROFISSIONAL)
  // ==========================================
  return (
    <main className="flex min-h-screen flex-col bg-[#0B132B] text-white font-sans relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-1/2 transform -translate-x-1/2 w-[800px] h-[400px] bg-[#00FFA3] blur-[150px] opacity-10 pointer-events-none"></div>

      {/* Header Landing */}
      <header className="flex justify-between items-center p-6 max-w-6xl w-full mx-auto z-10">
        <div className="text-2xl font-bold flex items-center gap-2">
          {/* <img src="/logo.png" alt="RoundFi" className="h-8 w-auto" /> */}
          Round<span className="text-[#00FFA3]">Fi</span>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-400">
          <a href="#" className="hover:text-white transition-colors">Protocolo</a>
          <a href="#" className="hover:text-white transition-colors">Docs</a>
          <a href="#" className="hover:text-white transition-colors">Auditoria</a>
        </nav>
        <WalletMultiButton style={{ backgroundColor: "transparent", color: "#00FFA3", border: "1px solid #00FFA3", borderRadius: "8px", height: "40px" }} />
      </header>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 mt-10">
        <div className="inline-block bg-[#00FFA3]/10 border border-[#00FFA3]/30 text-[#00FFA3] px-4 py-1.5 rounded-full text-xs font-bold mb-8 uppercase tracking-widest">
          Consórcio Descentralizado na Solana
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl leading-tight">
          O seu colateral trabalhando. <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FFA3] to-[#8A2BE2]">
            O seu crédito expandindo.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-12">
          Acesse capital sem liquidar seus ativos. Grupos de crédito justos, transparentes e impulsionados por Yield em DeFi.
        </p>

        <div className="hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(0,255,163,0.3)] rounded-full mb-16">
          <WalletMultiButton style={{ backgroundColor: "#00FFA3", color: "#0B132B", fontWeight: "bold", borderRadius: "9999px", padding: "0 40px", height: "60px", fontSize: "1.125rem" }} />
        </div>

        {/* TVL Métrica Gignate */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl border-t border-gray-800 pt-12">
          <div>
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Total Value Locked</p>
            <p className="text-4xl font-bold">$1,245,800</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Grupos Ativos</p>
            <p className="text-4xl font-bold">14</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-2">Yield Médio (APY)</p>
            <p className="text-4xl font-bold text-[#00FFA3]">8.5%</p>
          </div>
        </div>
      </div>

      {/* Footer Footer Profissional */}
      <footer className="border-t border-gray-800/50 mt-auto py-8 text-center text-sm text-gray-500 z-10 flex flex-col md:flex-row justify-between items-center px-10 max-w-6xl w-full mx-auto">
        <p>© 2026 RoundFi Protocol. Todos os direitos reservados.</p>
        <div className="flex gap-4 mt-4 md:mt-0">
          <a href="#" className="hover:text-white transition-colors">Contract Address</a>
          <a href="#" className="hover:text-white transition-colors">GitHub</a>
          <a href="#" className="hover:text-white transition-colors">Equipe</a>
        </div>
      </footer>
    </main>
  );
}