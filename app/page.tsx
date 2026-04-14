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
  
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [yieldAmount, setYieldAmount] = useState(12.4582);

  // Estados do App Real
  const [isSigned, setIsSigned] = useState(true); 
  const [installmentPaid, setInstallmentPaid] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isProcessingTx, setIsProcessingTx] = useState(false); 
  
  const [bidAmount, setBidAmount] = useState("");
  const [isBidding, setIsBidding] = useState(false);
  const [daysUntilDue, setDaysUntilDue] = useState(7);

  const [realTotalPool, setRealTotalPool] = useState<number>(0);
  const [realHighestBid, setRealHighestBid] = useState<number>(0);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [marketFilter, setMarketFilter] = useState("all");

  // Estados do SIMULADOR (Landing Page)
  const [simAmount, setSimAmount] = useState(10000);
  const [simMonths, setSimMonths] = useState(24);
  const apy = 0.065; // 6.5%

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

      const groupData = await program.account.groupState.fetch(groupStatePDA) as any;
      
      const pool = groupData.potAmount ? groupData.potAmount.toNumber() : 0;
      const highest = groupData.highestBidAmount ? groupData.highestBidAmount.toNumber() : 0;

      setRealTotalPool(pool);
      setRealHighestBid(highest); 

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
      fetchBlockchainData(); 
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

  const isUrgent = daysUntilDue <= 3;

  // CORREÇÃO IPHONE: Carrega a cor de fundo imediatamente em vez de ficar nulo e piscar a tela
  if (!mounted) return <div className="min-h-screen bg-[#0B132B]" />;

  // ==========================================
  // TELA DO USUÁRIO CONECTADO (APP DASHBOARD)
  // ==========================================
  if (connected) {
    return (
      <main className="flex min-h-screen flex-col bg-[#0B132B] p-4 md:p-6 text-white font-sans relative overflow-x-hidden">
        
        {/* MODAL DE SCORE DE REPUTAÇÃO */}
        {showScoreModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#1C2541] border border-[#8A2BE2] p-8 rounded-2xl max-w-md w-full shadow-[0_0_40px_rgba(138,43,226,0.2)]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">Score de Reputação</h3>
                <button onClick={() => setShowScoreModal(false)} className="text-gray-400 hover:text-white text-xl">✕</button>
              </div>
              <div className="space-y-4 text-gray-300">
                <p>O <strong>RoundFi Score</strong> mede o seu comprometimento on-chain. Esqueça o Serasa, aqui sua reputação é construída pelas suas atitudes.</p>
                <ul className="space-y-3 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                  <li className="flex justify-between"><span className="text-[#8A2BE2] font-bold">Nível 1 (Iniciante)</span> <span>Taxa Padrão</span></li>
                  <li className="flex justify-between"><span className="text-[#00FFA3] font-bold">Nível 2 (Confiável)</span> <span>Yield turbinado +1.5%</span></li>
                  <li className="flex justify-between"><span className="text-yellow-400 font-bold">Nível 3 (Mestre)</span> <span>Acesso a Grupos VIP</span></li>
                </ul>
                <p className="text-sm text-gray-400 pt-2 border-t border-gray-800">💡 <em>Pague suas mensalidades em dia e mantenha seu colateral travado para subir de nível automaticamente.</em></p>
              </div>
            </div>
          </div>
        )}

        {/* CABEÇALHO DO DASHBOARD */}
        <header className="flex justify-between items-center mb-10 border-b border-gray-800 pb-4 max-w-5xl w-full mx-auto gap-2">
          <div className="cursor-pointer transition-transform hover:scale-105 shrink-0" onClick={() => setActiveTab("dashboard")}>
            {/* AQUI ESTÁ SEU H-40 RESTAURADO NO DESKTOP, mantendo h-20 no mobile */}
            <img src="/logo.png" alt="RoundFi Logo" className="h-20 md:h-40 w-auto object-contain" />
          </div>
          
          <nav className="hidden md:flex gap-6 bg-[#1C2541] px-6 py-2 rounded-full border border-gray-800">
            <button onClick={() => setActiveTab("dashboard")} className={`font-medium transition-colors ${activeTab === "dashboard" ? "text-[#00FFA3]" : "text-gray-400 hover:text-white"}`}>
              Meu Painel
            </button>
            <button onClick={() => setActiveTab("explorer")} className={`font-medium transition-colors ${activeTab === "explorer" ? "text-[#00FFA3]" : "text-gray-400 hover:text-white"}`}>
              Explorar Grupos
            </button>
          </nav>
          
          <div className="scale-75 md:scale-100 origin-right">
            <WalletMultiButton style={{ backgroundColor: "#1C2541", color: "#00FFA3", border: "1px solid #00FFA3", height: "40px", borderRadius: "12px" }} />
          </div>
        </header>

        {/* MENU MOBILE EXTRA (Aparece só em telas pequenas abaixo do header) */}
        <nav className="flex md:hidden gap-4 mb-6 bg-[#1C2541] px-4 py-2 rounded-full border border-gray-800 justify-center">
            <button onClick={() => setActiveTab("dashboard")} className={`font-medium text-sm transition-colors ${activeTab === "dashboard" ? "text-[#00FFA3]" : "text-gray-400 hover:text-white"}`}>Meu Painel</button>
            <button onClick={() => setActiveTab("explorer")} className={`font-medium text-sm transition-colors ${activeTab === "explorer" ? "text-[#00FFA3]" : "text-gray-400 hover:text-white"}`}>Explorar Grupos</button>
        </nav>

        {/* ABA: MEU PAINEL */}
        {activeTab === "dashboard" && (
          <div className="max-w-5xl w-full mx-auto space-y-8 animate-in fade-in duration-500">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-2">Meu Painel</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-[#1C2541] p-6 rounded-2xl border border-gray-800 transition-all">
                <p className="text-gray-400 text-sm mb-1">Total Travado no Cofre</p>
                <p className="text-2xl md:text-3xl font-bold">{isLoadingData ? "..." : realTotalPool} <span className="text-sm font-normal text-gray-500">USDC</span></p>
              </div>
              <div className="bg-[#1C2541] p-6 rounded-2xl border border-[#00FFA3]/30 shadow-[0_0_20px_rgba(0,255,163,0.15)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#00FFA3] blur-3xl opacity-20"></div>
                <p className="text-gray-400 text-sm mb-1">Yield Gerado (Kamino)</p>
                <p className="text-2xl md:text-3xl font-bold text-[#00FFA3]">+{yieldAmount.toFixed(4)} <span className="text-sm font-normal text-[#00FFA3]/70">USDC</span></p>
              </div>
              <div 
                className="bg-[#1C2541] p-6 rounded-2xl border border-[#8A2BE2]/50 hover:border-[#8A2BE2] cursor-pointer transition-all group"
                onClick={() => setShowScoreModal(true)}
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="text-gray-400 text-sm">Meu Score (Reputação)</p>
                  <span className="text-[#8A2BE2] text-xs opacity-0 group-hover:opacity-100 transition-opacity">Ver Detalhes ↗</span>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-[#8A2BE2]">Nível 1 <span className="text-sm font-normal text-gray-500">Iniciante</span></p>
              </div>
            </div>

            <div className="mt-8 md:mt-12">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-xl font-bold">Meus Grupos Ativos</h3>
                {!installmentPaid && (
                  <button onClick={() => setDaysUntilDue(prev => prev > 1 ? prev - 1 : 7)} className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded hover:bg-gray-700">
                    ⚙️ Simular Tempo (-1 dia)
                  </button>
                )}
              </div>
              
              {isSigned && (
                <div className={`bg-[#1C2541] p-4 md:p-6 rounded-2xl border transition-all animate-in fade-in ${
                  installmentPaid ? 'border-[#00FFA3]/50 hover:border-[#00FFA3]' : 
                  (isUrgent ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-gray-800 hover:border-gray-700')
                }`}>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex justify-between items-start">
                        <h4 className="text-base md:text-lg font-bold text-white mb-2">Expansão Comercial</h4>
                        {installmentPaid ? (
                          <span className="bg-[#00FFA3]/20 text-[#00FFA3] text-[10px] md:text-xs px-2 md:px-3 py-1 rounded-full font-bold border border-[#00FFA3]/30">✓ Em Dia</span>
                        ) : (
                          <span className={`${isUrgent ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-gray-800 text-gray-400 border-gray-700'} text-[10px] md:text-xs px-2 md:px-3 py-1 rounded-full font-bold border`}>
                            Pendente
                          </span>
                        )}
                      </div>
                      
                      <div className="w-full bg-gray-800 rounded-full h-2 mb-2 mt-1">
                        <div className={`h-2 rounded-full transition-all duration-1000 ${installmentPaid ? 'bg-[#00FFA3] w-[5%]' : (isUrgent ? 'bg-red-500 w-[0%]' : 'bg-gray-500 w-[0%]')}`}></div>
                      </div>
                      <p className="text-gray-400 text-xs mb-4">{installmentPaid ? '1/20 Parcelas Pagas' : '0/20 Parcelas Pagas'}</p>

                      {!installmentPaid && isUrgent && (
                        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-3 animate-pulse max-w-sm">
                          <span className="text-xl">🚨</span>
                          <div>
                            <p className="text-red-400 font-bold text-sm">Vencimento Iminente</p>
                            <p className="text-red-400/80 text-xs">Sua parcela vence em {daysUntilDue} {daysUntilDue === 1 ? 'dia' : 'dias'}.</p>
                          </div>
                        </div>
                      )}

                      {!installmentPaid ? (
                        <button 
                          onClick={handlePayInstallment} disabled={isPaying}
                          className={`${isUrgent ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_10px_rgba(239,68,68,0.3)] text-white' : 'bg-transparent border border-[#00FFA3] text-[#00FFA3] hover:bg-[#00FFA3] hover:text-[#0B132B]'} font-bold py-2 md:py-3 px-6 w-full md:w-auto rounded-lg text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
                        >
                          {isPaying ? "Processando..." : "Pagar Mensalidade (1,000 USDC)"}
                        </button>
                      ) : (
                        <p className="text-sm text-[#00FFA3] border border-[#00FFA3]/30 inline-block px-4 py-2 rounded-lg bg-[#00FFA3]/10 text-center w-full md:w-auto">Mensalidade paga.</p>
                      )}
                    </div>

                    <div className="text-left md:text-right w-full md:w-auto bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                      <p className="text-sm text-gray-400 mb-1">Último Lance Vencedor</p>
                      <p className="text-white font-bold text-xl">{isLoadingData ? "..." : realHighestBid} USDC</p>
                      <p className="text-xs text-gray-500 mt-1">Sorteio em 30 dias</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-800">
                    <p className="text-sm text-gray-400 mb-2">Urna de Lances (Seu lance é secreto)</p>
                    <div className="flex flex-col md:flex-row gap-3">
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
                        className="bg-transparent border border-[#8A2BE2] text-[#8A2BE2] hover:bg-[#8A2BE2] hover:text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
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
          <div className="p-4 md:p-6 max-w-5xl w-full mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold mb-2">Grupos Abertos</h2>
                <p className="text-gray-400 text-sm md:text-lg">Escolha um consórcio (Pool) para participar de acordo com seu perfil.</p>
              </div>
              <button onClick={handleInitGroup} disabled={isProcessingTx} className="text-xs text-gray-600 hover:text-[#00FFA3] transition-colors bg-transparent border border-gray-800 px-3 py-1 rounded">
                ⚙️ Setup Admin
              </button>
            </div>

            <div className="flex flex-wrap gap-2 md:gap-3 mb-6">
              {['all', 'small', 'medium', 'large'].map((filter) => (
                <button 
                  key={filter}
                  onClick={() => setMarketFilter(filter)}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-colors border ${
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-[#1C2541] p-6 rounded-2xl border border-gray-800 hover:border-[#00FFA3] transition-all group shadow-lg shadow-[#00FFA3]/5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg md:text-xl font-bold">Expansão Comercial</h3>
                  <span className="bg-[#00FFA3]/20 text-[#00FFA3] text-[10px] md:text-xs px-2 py-1 rounded font-bold">Vagas: 18/20</span>
                </div>
                <div className="space-y-3 mb-8">
                  <p className="flex justify-between text-gray-400 border-b border-gray-800 pb-2"><span className="text-xs md:text-sm">Carta:</span> <span className="text-white font-bold">20,000 USDC</span></p>
                  <p className="flex justify-between text-gray-400 border-b border-gray-800 pb-2"><span className="text-xs md:text-sm">Parcela:</span> <span className="text-[#00FFA3] font-bold">1,000 USDC</span></p>
                  <p className="flex justify-between text-gray-400"><span className="text-xs md:text-sm">Prazo:</span> <span className="text-white">20 meses</span></p>
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
  // TELA LANDING PAGE (VITRINE DEFI) - AGORA COM OVERFLOW HIDDEN E RESPONSIVO
  // ==========================================
  return (
    <main className="flex min-h-screen flex-col bg-[#0B132B] text-white font-sans relative overflow-x-hidden">
      {/* Background Glows limitados para não criar scroll no celular */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-20%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-[#8A2BE2] opacity-10 blur-[80px] md:blur-[120px]"></div>
        <div className="absolute bottom-[20%] right-[-20%] w-[250px] md:w-[500px] h-[250px] md:h-[500px] bg-[#00FFA3] opacity-10 blur-[80px] md:blur-[120px]"></div>
      </div>

      {/* HEADER LANDING PAGE */}
      <header className="flex justify-between items-center p-4 md:p-8 max-w-7xl w-full mx-auto z-50 gap-2">
        <div className="cursor-pointer transition-transform hover:scale-105 shrink-0" onClick={() => setActiveTab("dashboard")}>
          {/* AQUI ESTÁ SEU H-40 RESTAURADO NO DESKTOP, mantendo h-20 no mobile */}
          <img src="/logo.png" alt="RoundFi Logo" className="h-20 md:h-40 w-auto object-contain" />
        </div>
        <nav className="hidden lg:flex gap-10 text-sm font-semibold text-gray-400 uppercase tracking-widest">
          <a href="#simulator" className="hover:text-white transition-colors">Simulador</a>
          <a href="#compare" className="hover:text-white transition-colors">Vantagens</a>
          <a href="#" className="hover:text-white transition-colors">Docs</a>
          <a href="#" className="hover:text-[#00FFA3] transition-colors text-gray-500">Auditoria</a>
        </nav>
        <div className="scale-75 md:scale-100 origin-right">
          <WalletMultiButton style={{ backgroundColor: "#00FFA3", color: "#0B132B", borderRadius: "12px", fontWeight: "bold" }} />
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="flex flex-col items-center justify-center pt-10 md:pt-20 pb-20 md:pb-32 px-4 md:px-6 text-center z-10 w-full">
        <div className="inline-flex items-center gap-2 bg-[#00FFA3]/10 border border-[#00FFA3]/20 text-[#00FFA3] px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[10px] md:text-xs font-bold mb-6 md:mb-8 animate-bounce">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FFA3] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FFA3]"></span>
          </span>
          Protocolo CoFi Live na Solana Devnet
        </div>
        <h1 className="text-4xl md:text-7xl font-black leading-tight md:leading-none mb-6 md:mb-8 max-w-4xl tracking-tight">
          Colateral que rende. <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FFA3] via-[#8A2BE2] to-[#00FFA3] bg-[length:200%_auto] animate-gradient">Crédito que expande.</span>
        </h1>
        <p className="text-sm md:text-xl text-gray-400 max-w-3xl mb-8 md:mb-12 font-light leading-relaxed px-2">
          O primeiro protocolo de <span className="text-white font-bold">Collaborative Finance (CoFi)</span> da Solana. Elimine as taxas de administração e veja seu dinheiro crescer enquanto aguarda sua contemplação.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full sm:w-auto">
           <div className="w-full sm:w-auto flex justify-center">
             <WalletMultiButton style={{ height: "50px", padding: "0 30px", fontSize: "1rem", borderRadius: "16px" }} />
           </div>
           <a 
             href="https://x.com/RoundFinanceSol" 
             target="_blank" 
             rel="noopener noreferrer" 
             className="h-[50px] md:h-[60px] px-8 md:px-10 rounded-2xl border border-gray-700 font-bold flex items-center justify-center hover:bg-[#8A2BE2] hover:border-[#8A2BE2] hover:text-white transition-all gap-2 text-sm md:text-base w-full sm:w-auto"
           >
             <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
             Siga nosso X
           </a>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 w-full max-w-5xl border-t border-gray-800 pt-10 md:pt-12 mt-16 md:mt-20">
          <div>
            <p className="text-gray-500 text-[10px] md:text-sm font-bold uppercase tracking-wider mb-1 md:mb-2">Total Value Locked</p>
            <p className="text-xl md:text-4xl font-bold">$1,245,800</p>
          </div>
          <div>
            <p className="text-gray-500 text-[10px] md:text-sm font-bold uppercase tracking-wider mb-1 md:mb-2">Pooled Capital Groups</p>
            <p className="text-xl md:text-4xl font-bold">14</p>
          </div>
          <div>
            <p className="text-gray-500 text-[10px] md:text-sm font-bold uppercase tracking-wider mb-1 md:mb-2">Base APY Estimado</p>
            <p className="text-xl md:text-4xl font-bold text-[#00FFA3]">~ 6.5%</p>
          </div>
          <div>
            <p className="text-gray-500 text-[10px] md:text-sm font-bold uppercase tracking-wider mb-1 md:mb-2">Taxa do Protocolo</p>
            <p className="text-xl md:text-4xl font-bold text-[#8A2BE2]">1.5%</p>
          </div>
        </div>
      </section>

      {/* SECTION: SIMULADOR INTERATIVO */}
      <section id="simulator" className="w-full mx-auto px-4 md:px-6 py-16 md:py-24 border-t border-gray-900 z-10 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-20 items-center">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6">Simule seu <br/><span className="text-[#00FFA3]">Saldo Futuro</span></h2>
            <p className="text-gray-400 text-sm md:text-lg mb-8 md:mb-10">Diferente de um consórcio comum onde seu dinheiro é corroído pela inflação, no modelo <span className="text-white font-bold">CoFi</span> seu colateral cresce enquanto você espera.</p>
            
            <div className="space-y-6 md:space-y-8 bg-[#1C2541]/40 p-6 md:p-10 rounded-[24px] md:rounded-3xl border border-gray-800 backdrop-blur-xl">
              <div>
                <label className="text-[10px] md:text-sm text-gray-500 uppercase font-bold mb-3 md:mb-4 block text-left">Valor da Carta de Crédito (USDC)</label>
                <input 
                  type="range" min="1000" max="100000" step="1000" 
                  value={simAmount} onChange={(e) => setSimAmount(Number(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#00FFA3]"
                />
                <div className="flex justify-between mt-2 md:mt-4">
                  <span className="text-xl md:text-2xl font-bold">${simAmount.toLocaleString()}</span>
                  <span className="text-xs md:text-sm text-gray-500 flex items-end">Máx: $100k</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] md:text-sm text-gray-500 uppercase font-bold mb-3 md:mb-4 block text-left">Prazo do Grupo (Meses)</label>
                <input 
                  type="range" min="6" max="60" step="6" 
                  value={simMonths} onChange={(e) => setSimMonths(Number(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#8A2BE2]"
                />
                <div className="flex justify-between mt-2 md:mt-4">
                  <span className="text-xl md:text-2xl font-bold">{simMonths} Meses</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1C2541] to-[#0B132B] p-0.5 md:p-1 rounded-[32px] md:rounded-[40px] shadow-2xl shadow-[#00FFA3]/5">
            <div className="bg-[#0B132B] rounded-[30px] md:rounded-[38px] p-8 md:p-12 text-center">
               <p className="text-gray-500 uppercase tracking-widest text-[10px] md:text-xs font-bold mb-2 md:mb-4">Saldo Final Estimado</p>
               <h3 className="text-4xl md:text-6xl font-black text-white mb-2 truncate">
                 ${(simAmount + (simAmount * apy * (simMonths/12))).toLocaleString(undefined, {maximumFractionDigits: 0})}
               </h3>
               <p className="text-[#00FFA3] font-bold text-base md:text-xl mb-8 md:mb-10">
                 + ${(simAmount * apy * (simMonths/12)).toLocaleString(undefined, {maximumFractionDigits: 0})} em Yield
               </p>

               <div className="flex items-end justify-center gap-2 md:gap-3 h-24 md:h-32 mb-8 md:mb-10">
                  <div className="w-8 md:w-12 bg-gray-800 rounded-t-lg h-[40%]"></div>
                  <div className="w-8 md:w-12 bg-gray-700 rounded-t-lg h-[50%]"></div>
                  <div className="w-8 md:w-12 bg-gray-600 rounded-t-lg h-[65%]"></div>
                  <div className="w-8 md:w-12 bg-[#00FFA3] rounded-t-lg h-[100%] shadow-[0_0_20px_rgba(0,255,163,0.5)]"></div>
               </div>
               <button className="w-full bg-[#00FFA3] text-[#0B132B] py-4 md:py-5 rounded-2xl font-black text-sm md:text-lg hover:scale-105 transition-all uppercase">Começar Agora</button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: COMPARISON TABLE (MOBILE RESPONSIVE COM FLEX-COL) */}
      <section id="compare" className="w-full mx-auto px-4 md:px-6 py-16 md:py-24 max-w-6xl z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">A Evolução do <span className="text-[#8A2BE2]">Crédito Comunitário</span></h2>
        <p className="text-gray-400 text-center max-w-2xl mx-auto mb-10 md:mb-16 text-sm md:text-base">Substituímos administradoras burocráticas por Smart Contracts e algoritmos de reputação comportamental.</p>
        
        <div className="flex flex-col md:flex-row gap-0 border border-gray-800 rounded-[24px] md:rounded-[32px] overflow-hidden bg-[#1C2541]/20 backdrop-blur-md w-full">
           <div className="p-6 md:p-10 border-b md:border-b-0 md:border-r border-gray-800 flex-1">
              <p className="text-gray-500 font-bold mb-6 uppercase text-[10px] md:text-xs tracking-widest text-center md:text-left">Comparativo</p>
              <ul className="space-y-4 md:space-y-8 text-gray-400 font-medium text-xs md:text-sm">
                <li className="h-auto md:h-8 flex flex-col md:flex-row items-center md:items-center justify-between md:justify-start gap-1"><span className="md:hidden font-bold">Taxa ADM:</span><span className="md:block hidden">Taxa de Administração</span></li>
                <li className="h-auto md:h-8 flex flex-col md:flex-row items-center md:items-center justify-between md:justify-start gap-1"><span className="md:hidden font-bold">Rendimento:</span><span className="md:block hidden">Rendimento do Fundo</span></li>
                <li className="h-auto md:h-8 flex flex-col md:flex-row items-center md:items-center justify-between md:justify-start gap-1"><span className="md:hidden font-bold">Análise:</span><span className="md:block hidden">Análise de Crédito</span></li>
                <li className="h-auto md:h-8 flex flex-col md:flex-row items-center md:items-center justify-between md:justify-start gap-1"><span className="md:hidden font-bold">Liquidez:</span><span className="md:block hidden">Velocidade de Liquidez</span></li>
                <li className="h-auto md:h-8 flex flex-col md:flex-row items-center md:items-center justify-between md:justify-start gap-1"><span className="md:hidden font-bold">Custódia:</span><span className="md:block hidden">Estrutura e Custódia</span></li>
              </ul>
           </div>
           
           <div className="p-6 md:p-10 border-b md:border-b-0 md:border-r border-gray-800 bg-gray-900/40 flex-1">
              <p className="text-gray-400 font-bold mb-6 uppercase text-[10px] md:text-xs tracking-widest text-center md:text-left">Consórcio Tradicional</p>
              <ul className="space-y-4 md:space-y-8 text-gray-300 font-medium text-xs md:text-sm text-center md:text-left">
                <li className="h-auto md:h-8 flex items-center justify-center md:justify-start text-red-400">15% a 25% (Embutida)</li>
                <li className="h-auto md:h-8 flex items-center justify-center md:justify-start text-red-400">0% (Corroído)</li>
                <li className="h-auto md:h-8 flex items-center justify-center md:justify-start">Serasa / Burocracia</li>
                <li className="h-auto md:h-8 flex items-center justify-center md:justify-start">30 a 60 dias</li>
                <li className="h-auto md:h-8 flex items-center justify-center md:justify-start">Centralizada (Banco)</li>
              </ul>
           </div>
           
           <div className="p-6 md:p-10 bg-gradient-to-b from-[#00FFA3]/10 to-transparent relative border-t-4 md:border-t-0 md:border-l-4 border-[#00FFA3] flex-1">
              <div className="absolute top-2 right-2 md:top-4 md:right-6 bg-[#00FFA3] text-[#0B132B] text-[8px] md:text-[10px] font-black px-2 py-1 rounded tracking-widest">COFI</div>
              <p className="text-[#00FFA3] font-bold mb-6 uppercase text-[10px] md:text-xs tracking-widest text-center md:text-left">RoundFi Protocol</p>
              <ul className="space-y-4 md:space-y-8 text-white font-bold text-xs md:text-sm text-center md:text-left">
                <li className="h-auto md:h-8 flex items-center justify-center md:justify-start">1.5% (Taxa Justa)</li>
                <li className="h-auto md:h-8 flex items-center justify-center md:justify-start text-[#00FFA3]">~6.5% APY Base</li>
                <li className="h-auto md:h-8 flex items-center justify-center md:justify-start">RoundFi Score</li>
                <li className="h-auto md:h-8 flex items-center justify-center md:justify-start">Instantânea (On-chain)</li>
                <li className="h-auto md:h-8 flex items-center justify-center md:justify-start">Decentralized Pool</li>
              </ul>
           </div>
        </div>
      </section>

      {/* FOOTER PREMIUM */}
      <footer className="mt-auto border-t border-gray-900 pt-16 md:pt-20 pb-8 md:pb-10 bg-black/20">
        <div className="max-w-7xl w-full mx-auto px-6 md:px-10 grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 mb-10 md:mb-20 text-center md:text-left">
          <div className="col-span-1 md:col-span-2 flex flex-col items-center md:items-start">
            <div className="mb-4 md:mb-6">
              {/* Logo no Footer também está com h-24 no desktop para ficar maior */}
              <img src="/logo.png" alt="RoundFi Logo" className="h-16 md:h-24 w-auto object-contain grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all" />
            </div>
            <p className="text-gray-500 max-w-sm leading-relaxed text-xs md:text-sm">
              O RoundFi é um protocolo de <span className="text-gray-400">Collaborative Finance (CoFi)</span> construído na Solana para redefinir a formação de capital.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 md:mb-6 text-sm md:text-base">Protocolo</h4>
            <ul className="text-gray-500 space-y-3 md:space-y-4 text-xs md:text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Group Savings</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Reputation Score</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Segurança & Auditoria</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 md:mb-6 text-sm md:text-base">Comunidade</h4>
            <ul className="text-gray-500 space-y-3 md:space-y-4 text-xs md:text-sm">
              <li><a href="https://x.com/RoundFinanceSol" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Twitter / X</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Discord</a></li>
              <li><a href="#" className="hover:text-white transition-colors">GitHub</a></li>
            </ul>
          </div>
        </div>
        <div className="text-center text-gray-600 text-[8px] md:text-xs tracking-widest border-t border-gray-900 pt-6 md:pt-10 uppercase px-4">
          © 2026 ROUNDFI PROTOCOL. DECENTRALIZED POOLED CAPITAL. SOLANA DEVNET.
        </div>
      </footer>
    </main>
  );
}
