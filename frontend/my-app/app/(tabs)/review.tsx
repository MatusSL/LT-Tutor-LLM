import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { BlankWord, ErrorCorrection, Flashcard, PhraseQuiz, requestReviewData } from "@/services/tutor-api";
import { useEffect, useState } from "react";
import { C } from "@/constants/colors";

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
  flashcards: Flashcard[] | null;
  phraseQuiz: PhraseQuiz[] | null;
  blankWords: BlankWord[] | null;
  errorCorrections: ErrorCorrection[] | null;
};

function ModeCard({ mode, count, onPress }: { mode: ReviewMode; count: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardIcon}>
        <Ionicons name={mode.icon} size={26} color={C.accent} />
      </View>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardTitle}>{mode.title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      </View>
      <Text style={styles.cardDesc}>{mode.description}</Text>
    </TouchableOpacity>
  );
}

export default function ReviewScreen() {
  const router = useRouter();
  const [review, setReview] = useState<ReviewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setError(null);
    const fetchReviewData = async () => {
      try {
        const reviewData = await requestReviewData();
        const data = reviewData.review_data;
        setReview({
          flashcards: data.flashcards,
          phraseQuiz: data.phrase_quiz,
          blankWords: data.blank_words,
          errorCorrections: data.error_corrections,
        });
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    void fetchReviewData();
  }, []);

  const dataByRoute: Record<string, unknown> = {
    "/review/flashcards": review?.flashcards,
    "/review/phrase-quiz": review?.phraseQuiz,
    "/review/fill-blank": review?.blankWords,
    "/review/error-correction": review?.errorCorrections,
  };

  const countByRoute: Record<string, number> = {
    "/review/flashcards": review?.flashcards?.length ?? 0,
    "/review/phrase-quiz": review?.phraseQuiz?.length ?? 0,
    "/review/fill-blank": review?.blankWords?.length ?? 0,
    "/review/error-correction": review?.errorCorrections?.length ?? 0,
  };

  const totalItems = review
    ? (review.flashcards?.length ?? 0) +
      (review.phraseQuiz?.length ?? 0) +
      (review.blankWords?.length ?? 0) +
      (review.errorCorrections?.length ?? 0)
    : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Review</Text>
      </View>
      <View style={styles.divider} />

      <View style={styles.body}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={C.accent} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="cloud-offline-outline" size={36} color={C.text.hint} />
            <Text style={styles.errorText}>Could not load review data</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              {totalItems > 0 ? `${totalItems} items due for review` : "Choose a practice mode"}
            </Text>
            <View style={styles.grid}>
              {MODES.map((mode) => (
                <ModeCard
                  key={mode.route}
                  mode={mode}
                  count={countByRoute[mode.route]}
                  onPress={() =>
                    router.push({
                      pathname: mode.route as never,
                      params: { data: JSON.stringify(dataByRoute[mode.route] ?? []) },
                    })
                  }
                />
              ))}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  errorText: {
    color: C.text.secondary,
    fontSize: 15,
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
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text.primary,
    flexShrink: 1,
  },
  countBadge: {
    backgroundColor: C.accentSoft,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.accent,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: C.text.secondary,
  },
});
