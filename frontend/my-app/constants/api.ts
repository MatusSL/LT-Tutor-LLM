const DEFAULT_API_URL = "http://127.0.0.1:8000";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const getApiBaseUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!configuredUrl) {
    return DEFAULT_API_URL;
  }

  return trimTrailingSlash(configuredUrl);
};

export const getWebSocketUrl = () => {
  const apiBaseUrl = getApiBaseUrl();

  if (apiBaseUrl.startsWith("https://")) {
    return `${apiBaseUrl.replace("https://", "wss://")}/ws`;
  }

  if (apiBaseUrl.startsWith("http://")) {
    return `${apiBaseUrl.replace("http://", "ws://")}/ws`;
  }

  if (apiBaseUrl.startsWith("wss://") || apiBaseUrl.startsWith("ws://")) {
    return `${apiBaseUrl}/ws`;
  }

  return `ws://${apiBaseUrl}/ws`;
};
