import { NativeModules, Platform } from "react-native";
import Constants from "expo-constants";

const getDevServerHost = () => {
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) return null;

  const match = scriptURL.match(/https?:\/\/([^/:]+):\d+/);
  return match?.[1] || null;
};

const getHostFromUri = (uri) => {
  if (!uri || typeof uri !== "string") return null;
  const cleanUri = uri.replace(/^https?:\/\//, "");
  return cleanUri.split(":")[0] || null;
};

const getExpoHost = () => {
  const hostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.extra?.expoClient?.hostUri ||
    Constants?.manifest?.debuggerHost;

  return getHostFromUri(hostUri);
};

const fallbackHosts =
  Platform.OS === "android"
    ? ["10.0.2.2", "localhost", "127.0.0.1"]
    : ["localhost", "127.0.0.1"];

const hostCandidates = [
  process.env.EXPO_PUBLIC_API_HOST,
  getExpoHost(),
  getDevServerHost(),
  ...fallbackHosts,
].filter(Boolean);

const uniqueHosts = [...new Set(hostCandidates)];

const apiPort = process.env.EXPO_PUBLIC_API_PORT || "3000";
const explicitBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

export const BASE_URLS =
  explicitBaseUrl || uniqueHosts.length === 0
    ? [explicitBaseUrl || `http://localhost:${apiPort}/graphql`]
    : uniqueHosts.map((host) => `http://${host}:${apiPort}/graphql`);

export const BASE_URL = BASE_URLS[0];

export const postGraphQL = async (body, customHeaders = {}) => {
  let lastError = null;

  for (const url of BASE_URLS) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...customHeaders,
        },
        body: JSON.stringify(body),
      });

      return response;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Tidak bisa terhubung ke server");
};
