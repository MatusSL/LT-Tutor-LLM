import { getWebSocketUrl } from "@/constants/api";

type Topic = {
  display_name: string;
  description: string;
  suggested_goals: string[];
  difficulty: "easy" | "medium" | "hard";
};

type Topics = {
  topics: Topic[];
};

type EpisodeTopicsResponse = {
  type: "episode_topics";
  status: string;
  episode: number;
  topics: Topics;
};

type ErrorResponse = {
  type: "error";
  message: string;
};

type SocketResponse = EpisodeTopicsResponse | ErrorResponse;

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown websocket error";

export const requestEpisodeTopics = (episode: number) =>
  new Promise<EpisodeTopicsResponse>((resolve, reject) => {
    const socket = new WebSocket(getWebSocketUrl());

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "set_episode", episode }));
    };

    socket.onmessage = (event) => {
      try {
        const payload: SocketResponse = JSON.parse(event.data);

        if (payload.type === "error") {
          reject(new Error(payload.message));
          socket.close();
          return;
        }

        resolve(payload);
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
