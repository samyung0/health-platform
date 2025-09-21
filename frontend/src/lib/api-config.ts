// Frontend API Configuration
// This file handles different API endpoints based on environment variables

interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

const getApiConfig = (): ApiConfig => {
  // Get API URL from environment variable, fallback to localhost for development
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";

  // Get timeout from environment variable, fallback to 10 seconds
  const timeout = parseInt(import.meta.env.VITE_API_TIMEOUT || "10000");

  // Get retries from environment variable, fallback to 3
  const retries = parseInt(import.meta.env.VITE_API_RETRIES || "3");

  return {
    baseUrl: apiUrl,
    timeout,
    retries,
  };
};

export const apiConfig = getApiConfig();

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = apiConfig.baseUrl;
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

// Environment info for debugging
export const envInfo = {
  mode: import.meta.env.MODE,
  baseUrl: apiConfig.baseUrl,
  apiUrl: import.meta.env.VITE_API_URL,
  timeout: apiConfig.timeout,
  retries: apiConfig.retries,
  isDevelopment: import.meta.env.MODE === "development",
  isProduction: import.meta.env.MODE === "production",
};
