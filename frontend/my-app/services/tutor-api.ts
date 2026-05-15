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

export type OpenerPayload = {
  response_spanish: string;
  response_english: string;
  response_audio: string | null;
};

export type EpisodeTopicsResponse = {
  status: string;
  episode: number;
  topics: Topics;
  opener: OpenerPayload | null;
};

export type SavedEpisodeTopicsResponse = {
  status: string;
  episode: number;
  topics: Topics;
  opener: OpenerPayload | null;
};

type ErrorPayload = {
  detail?: string;
  message?: string;
};

export type CurrentEpisode = {
  episode: number
}

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
        correction: string;
        explanation: string;
      }[];
    } | null;
  };
  response_audio: string | null;
};

export type BlankWord = {
    sentence: string
    blank_index: number
    correct_word: string
    options: string[]
    translation: string
}

export type Flashcard = {
    origin: string
    translation: string
}

export type PhraseQuiz = {
    phrase: string,
    correct_answer: string
    options: string[]
}

export type ErrorCorrection = {
    sentence: string
    error_index: number
    corrected_word: string
    error_type: string
    explanation: string
}

export type ReviewFlashcardsResponse = {
    flashcards: Flashcard[]
}

export type ReviewPhraseResponse = {
    phrase_quiz: PhraseQuiz[]
}

export type ReviewBlankResponse = {
    blank_words: BlankWord[]
}

export type ReviewCorrectionResponse = {
    error_corrections: ErrorCorrection[]
}

export type ReviewData = {
    flashcards: Flashcard[] | null;
    phrase_quiz: PhraseQuiz[] | null;
    blank_words: BlankWord[] | null;
    error_corrections: ErrorCorrection[] | null;
}

export type Review = {
  review_data: ReviewData
}

const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? "";

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(getApiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
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

export const requestCurrentEpisode = () => 
  requestJson<CurrentEpisode>("/episode/current", {
    method: "GET"
  })

export const sendChatMessage = (userSentence: string) =>
  requestJson<TutorApiChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify({ user_sentence: userSentence }),
  });

export const transcribeAudio = async (audioUri: string, language: string): Promise<string> => {
  const filename = audioUri.split("/").pop() ?? "recording.m4a";
  const formData = new FormData();

  if (audioUri.startsWith("blob:")) {
    // Web (Expo web / simulator): fetch the blob URI to get a real Blob
    const blobResponse = await fetch(audioUri);
    const blob = await blobResponse.blob();
    formData.append("audio", blob, filename);
  } else {
    // Native iOS/Android: React Native file URI pattern
    formData.append("audio", {
      uri: audioUri,
      name: filename,
      type: "audio/m4a",
    } as unknown as Blob);
  }
  formData.append("language", language);

  const response = await fetch(getApiUrl("/chat/transcribe"), {
    method: "POST",
    headers: { "X-API-Key": API_KEY },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.status}`);
  }

  const data = (await response.json()) as { text: string };
  return data.text;
};

export const requestReviewData = () =>
  requestJson<Review>("/review", {
    method: "GET"
  })
