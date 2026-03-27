import { getWebSocketUrl } from "@/constants/api";

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
  type: "episode_topics";
  status: string;
  episode: number;
  topics: Topics;
};

export type SavedEpisodeTopicsResponse = {
  type: "saved_episode_topics";
  status: string;
  episode: number;
  topics: Topics;
};

type ErrorResponse = {
  type: "error";
  message: string;
};

type SocketResponse =
  | EpisodeTopicsResponse
  | SavedEpisodeTopicsResponse
  | ErrorResponse;

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown websocket error";

const requestSocketResponse = <T extends SocketResponse>(
  message: Record<string, unknown>,
  expectedType: T["type"],
) =>
  new Promise<T>((resolve, reject) => {
    const socket = new WebSocket(getWebSocketUrl());

    socket.onopen = () => {
      socket.send(JSON.stringify(message));
    };

    socket.onmessage = (event) => {
      try {
        const payload: SocketResponse = JSON.parse(event.data);

        if (payload.type === "error") {
          reject(new Error(payload.message));
          socket.close();
          return;
        }

        if (payload.type !== expectedType) {
          reject(new Error(`Unexpected websocket response: ${payload.type}`));
          socket.close();
          return;
        }

        resolve(payload as T);
        socket.close();
      } catch (error) {
        reject(new Error(toErrorMessage(error)));
        socket.close();
      }
    };

    socket.onerror = () => {
      reject(new Error("Could not connect to the tutor websocket."));
    };
  });

export const requestEpisodeTopics = (episode: number) =>
  requestSocketResponse<EpisodeTopicsResponse>(
    { type: "set_episode", episode },
    "episode_topics",
  );

export const requestSavedEpisodeTopics = () =>
  requestSocketResponse<SavedEpisodeTopicsResponse>(
    { type: "load_saved_episode" },
    "saved_episode_topics",
  );
