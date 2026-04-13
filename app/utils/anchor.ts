import { Program, AnchorProvider, Idl, setProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import roundfiIdl from "../idl/idl.json";

// O ID único do seu contrato que gravamos na blockchain
export const PROGRAM_ID = new PublicKey("2bGtLuYbpfrdBAfhS6PzYj8CEuhaZgHxkYzzg25sZojZ");

// Criando a rota direta para a rede de testes (Devnet)
export const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

export const getProvider = (wallet: any) => {
    const provider = new AnchorProvider(connection, wallet, {
        preflightCommitment: "confirmed",
    });
    setProvider(provider);
    return provider;
};

// Função para ativar o nosso contrato
export const getProgram = (provider: AnchorProvider) => {
    // Bem-vindo de volta ao Anchor 0.29! Onde passamos os 3 parâmetros originais lindamente.
    return new Program(roundfiIdl as Idl, PROGRAM_ID, provider);
};