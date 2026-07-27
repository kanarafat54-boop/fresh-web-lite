/**
 * Fresh Web Lite
 * Global Application Configuration
 */

export const AppConfig = {
  app: {
    name: "Fresh Web Lite",
    slogan: "One Account. Everything Connected.",
    version: "0.1.0",
    environment: import.meta.env.MODE,
  },

  philosophy: "Excellence First",

  company: {
    name: "Fresh",
    supportEmail: "support@fresh.app",
  },

  api: {
    baseUrl:
      import.meta.env.VITE_API_URL || "http://localhost:3000/api",
    timeout: 10000,
  },

  auth: {
    tokenStorageKey: "fresh_id_token",
    sessionPersistence: "local",
  },

  features: {
    freshId: true,
    intelligence: false,
    communication: false,
    creator: false,
    learning: false,
    studio: false,
    marketplace: false,
    wallet: false,
    crypto: false,
    software: false,
    ara6: false,
    admin: true,
    shorts: true,
    saved: true,
  },

  security: {
    encryption: true,
    auditLogs: true,
    rateLimiting: true,
  },

  debug: import.meta.env.DEV,
};

export default AppConfig;
