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

export const buildIntroMessage = (topicNames: string[]): Message => ({
  id: "0",
  type: "tutor",
  tutor: {
    input_spanish: "",
    input_english: "",
    input_language: "english",
    response_spanish:
      topicNames.length > 0
        ? `Temas sugeridos: ${topicNames.join(", ")}`
        : "Hola, ¿qué tal? ¿De qué quieres hablar hoy?",
    response_english:
      topicNames.length > 0
        ? `Suggested topics based on your vocabulary: ${topicNames.join(", ")}`
        : "Hey, what's up? What do you want to talk about today?",
    correction: null,
  },
});
