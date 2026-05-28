export type ErrorCandidate = {
  word: string;
  span: number[];
  error_type: string;
  correction: string;
  explanation: string;
};

export type Correction = {
  original: string;
  corrected: string;
  error_candidates: ErrorCandidate[];
};

export type TutorResponse = {
  input_spanish: string;
  input_english: string;
  input_language: "english" | "spanish" | "unknown";
  response_spanish: string;
  response_english: string;
  correction: Correction | null;
  native_feedback?: string | null;
};

export type Topic = {
  display_name: string;
};

export type Message =
  | { id: string; type: "user"; text: string; tutor?: TutorResponse }
  | { id: string; type: "tutor"; tutor: TutorResponse; audio?: string | null}
  | { id: string; type: "loading" };

export type SetupStep = "options" | "selectEpisodes" | "chat";

export const EPISODE_COUNT = 90;

const FALLBACK_OPENER_SPANISH = "Hola, ¿qué tal? ¿De qué quieres hablar hoy?";
const FALLBACK_OPENER_ENGLISH = "Hey, what's up? What do you want to talk about today?";

type OpenerInput = {
  response_spanish: string;
  response_english: string;
  response_audio: string | null;
} | null;

export const buildOpenerMessage = (opener: OpenerInput): Message => ({
  id: "0",
  type: "tutor",
  audio: opener?.response_audio ?? null,
  tutor: {
    input_spanish: "",
    input_english: "",
    input_language: "english",
    response_spanish: opener?.response_spanish || FALLBACK_OPENER_SPANISH,
    response_english: opener?.response_english || FALLBACK_OPENER_ENGLISH,
    correction: null,
  },
});
