const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const getApiBaseUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!configuredUrl) {
    // return DEFAULT_API_URL;
    throw new Error("API URL is not configured. Please set EXPO_PUBLIC_API_URL.");
  }

  return trimTrailingSlash(configuredUrl);
};

export const getApiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
};
