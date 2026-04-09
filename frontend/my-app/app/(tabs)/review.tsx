import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { BlankWord, ErrorCorrection, Flashcard, PhraseQuiz, requestReviewData, ReviewData } from "@/services/tutor-api";
import { useEffect, useState } from "react";

const C = {
  bg: "#0F0F13",
  surface: "#1A1A24",
  surfaceAlt: "#22222F",
  border: "rgba(255,255,255,0.07)",
  accent: "#6C63FF",
  accentSoft: "rgba(108,99,255,0.15)",
  text: { primary: "#E8E8F0", secondary: "#888899", hint: "#555566", error: "#E16C75" },
};

type ReviewMode = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: "/review/flashcards" | "/review/phrase-quiz" | "/review/fill-blank" | "/review/error-correction";
};

const MODES: ReviewMode[] = [
  {
    title: "Flashcards",
    description: "Practice word recall with tap-to-flip cards",
    icon: "layers-outline",
    route: "/review/flashcards",
  },
  {
    title: "Phrase Quiz",
    description: "Translate phrases with multiple choice",
    icon: "chatbubble-ellipses-outline",
    route: "/review/phrase-quiz",
  },
  {
    title: "Fill in the Blank",
    description: "Complete sentences with the right word",
    icon: "pencil-outline",
    route: "/review/fill-blank",
  },
  {
    title: "Error Correction",
    description: "Spot and fix mistakes in sentences",
    icon: "search-outline",
    route: "/review/error-correction",
  },
];

type ReviewModel = {
  flashcards: Flashcard[] | null,
  phraseQuiz: PhraseQuiz[] | null,
  blankWords: BlankWord[] | null,
  errorCorrections: ErrorCorrection[] | null
}

function ModeCard({ mode, onPress }: { mode: ReviewMode; onPress: () => void }) {

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardIcon}>
        <Ionicons name={mode.icon} size={26} color={C.accent} />
      </View>
      <Text style={styles.cardTitle}>{mode.title}</Text>
      <Text style={styles.cardDesc}>{mode.description}</Text>
    </TouchableOpacity>
  );
}

export default function ReviewScreen() {
  const router = useRouter();
  const [review, setReview] = useState<ReviewModel | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const reviewDataByRoute: Record<string, unknown> = {
    "/review/flashcards": review?.flashcards,
    "/review/phrase-quiz": review?.phraseQuiz,
    "/review/fill-blank": review?.blankWords,
    "/review/error-correction": review?.errorCorrections,
  };

  useEffect(() => {
    setError(null)

    const fetchReviewData = async () => {
      try {
        const reviewData = await requestReviewData()
        // console.log(reviewData.review_data)
        const data = reviewData.review_data
        setReview({
          flashcards: data.flashcards,
          phraseQuiz: data.phrase_quiz,
          blankWords: data.blank_words,
          errorCorrections: data.error_corrections
        })

      } catch(error) {
        console.log(error)
        setError(error as Error)
      }
    }

    fetchReviewData()
  }, [])


  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Review</Text>
      </View>
      <View style={styles.divider} />
      {error && 
        <View>
          <Text style={styles.error}>Fetching review from Supabase failed</Text>
        </View>
      }

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Choose a practice mode</Text>

        <View style={styles.grid}>
          {MODES.map((mode) => (
            <ModeCard
              key={mode.route}
              mode={mode}
              onPress={() =>
                router.push({
                  pathname: mode.route as never,
                  params: { data: JSON.stringify(reviewDataByRoute[mode.route] ?? []) },
                })
              }
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  error: {
    color: C.text.error
  },
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: C.surface,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: C.text.primary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: C.text.secondary,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    gap: 8,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text.primary,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: C.text.secondary,
  },
});
