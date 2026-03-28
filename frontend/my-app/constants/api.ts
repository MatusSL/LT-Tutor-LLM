// const DEFAULT_API_URL = "http://158.195.204.108:8000";
const DEFAULT_API_URL = "http://172.20.10.8:8000";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const getApiBaseUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!configuredUrl) {
    return DEFAULT_API_URL;
  }

  return trimTrailingSlash(configuredUrl);
};

export const getApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
};
