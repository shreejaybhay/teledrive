import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

const apiId = Number(process.env.NEXT_PUBLIC_TELEGRAM_API_ID);
const apiHash = process.env.NEXT_PUBLIC_TELEGRAM_API_HASH as string;

// We need a singleton instance on the client-side
let client: TelegramClient | null = null;

export const getTelegramClient = (sessionString: string = "") => {
  if (typeof window === 'undefined') return null; // Ensure this only runs on client
  
  if (!client) {
    const stringSession = new StringSession(sessionString);
    client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });
  }
  return client;
};

export const saveSession = (sessionString: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem("telegram_session", sessionString);
  }
};

export const getSession = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem("telegram_session") || "";
  }
  return "";
};

let connectionPromise: Promise<void> | null = null;

export const connectClient = async (client: TelegramClient) => {
  if (client.connected) return;
  if (connectionPromise) {
    return connectionPromise;
  }
  connectionPromise = client.connect().then(() => {
    // Keep the promise cached so subsequent calls resolve immediately
  }).catch((e) => {
    connectionPromise = null;
    throw e;
  });
  return connectionPromise;
};
