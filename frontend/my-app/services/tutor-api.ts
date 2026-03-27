import { getApiUrl } from "@/constants/api";

export type Topic = {
  display_name: string;
  description: string;
  suggested_goals: string[];
  difficulty: "easy" | "medium" | "hard";
};

type Topics = {
  topics: Topic[];
};

export type EpisodeTopicsResponse = {
  status: string;
  episode: number;
  topics: Topics;
};

export type SavedEpisodeTopicsResponse = {
  status: string;
  episode: number;
  topics: Topics;
};

type ErrorPayload = {
  detail?: string;
  message?: string;
};

export type TutorApiChatResponse = {
  response: string;
  tutor_response: {
    input_spanish: string;
    input_english: string;
    input_language: "english" | "spanish" | "unknown";
    response_spanish: string;
    response_english: string;
    correction: {
      original: string;
      corrected: string;
      error_candidates: {
        word: string;
        span: number[];
        error_type: string;
        suggested_correction: string;
        explanation: string;
      }[];
    } | null;
  };
};

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(getApiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let message = `Tutor server returned ${response.status}.`;

    try {
      const payload = (await response.json()) as ErrorPayload;
      message = payload.message ?? payload.detail ?? message;
    } catch {
      // Fall back to the HTTP status when the body is not JSON.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
};

export const checkTutorServer = async () => {
  const payload = await requestJson<{ status: string }>("/health", {
    method: "GET",
  });

  return payload.status === "ok";
};

export const requestEpisodeTopics = (episode: number) =>
  requestJson<EpisodeTopicsResponse>("/episode", {
    method: "POST",
    body: JSON.stringify({ episode }),
  });

export const requestSavedEpisodeTopics = () =>
  requestJson<SavedEpisodeTopicsResponse>("/episode/saved", {
    method: "GET",
  });

export const sendChatMessage = (userSentence: string) =>
  requestJson<TutorApiChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify({ user_sentence: userSentence }),
  });
