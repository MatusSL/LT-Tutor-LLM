import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ErrorCorrection } from "@/services/tutor-api";

const C = {
  bg: "#0F0F13",
  surface: "#1A1A24",
  surfaceAlt: "#22222F",
  border: "rgba(255,255,255,0.07)",
  accent: "#6C63FF",
  accentSoft: "rgba(108,99,255,0.15)",
  text: { primary: "#E8E8F0", secondary: "#888899", hint: "#555566" },
  green: "#22C55E",
  greenSoft: "rgba(34,197,94,0.12)",
  red: "#FF4B6E",
  redSoft: "rgba(255,75,110,0.12)",
};

type ErrorQuestion = {
  sentence: string,
  errorIndex: number,
  correctedWord: string,
  errorType: string,
  explanation: string

}

export default function ErrorCorrectionScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams<{ data: string }>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tappedIndex, setTappedIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const questions: ErrorQuestion[] = data ? 
    (JSON.parse(data) as ErrorCorrection[]).map((c) => {
      return {
        sentence: c.sentence,
        errorIndex: c.error_index,
        correctedWord: c.corrected_word,
        errorType: c.error_type,
        explanation: c.explanation
      }
    }) : [];

  const total = questions.length;
  const question = questions[currentIndex];

  const handleTapWord = (wordIndex: number) => {
    if (tappedIndex !== null) return;
    setTappedIndex(wordIndex);
    if (wordIndex === question.errorIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= total) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setTappedIndex(null);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setTappedIndex(null);
    setScore(0);
    setFinished(false);
  };

  const getWordChipStyle = (index: number) => {
    if (tappedIndex === null) return styles.wordChip;
    if (index === question.errorIndex)
      return [styles.wordChip, styles.wordChipCorrect];
    if (index === tappedIndex)
      return [styles.wordChip, styles.wordChipWrongPick];
    return [styles.wordChip, styles.wordChipDimmed];
  };

  const getWordChipTextStyle = (index: number) => {
    if (tappedIndex === null) return styles.wordChipText;
    if (index === question.errorIndex)
      return [styles.wordChipText, { color: C.green }];
    if (index === tappedIndex)
      return [styles.wordChipText, { color: C.red }];
    return [styles.wordChipText, { color: C.text.hint }];
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={C.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Error Correction</Text>
        <Text style={styles.scoreText}>
          {score}/{finished ? total : currentIndex + (tappedIndex !== null ? 1 : 0)}
        </Text>
      </View>
      <View style={styles.divider} />

      <View style={styles.body}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${((finished ? total : currentIndex) / total) * 100}%`,
              },
            ]}
          />
        </View>

        {finished ? (
          <View style={styles.finishedContainer}>
            <View style={styles.finishedIcon}>
              <Ionicons
                name={score >= total * 0.7 ? "trophy" : "refresh-circle"}
                size={48}
                color={score >= total * 0.7 ? C.green : C.accent}
              />
            </View>
            <Text style={styles.finishedTitle}>
              {score}/{total} correct
            </Text>
            <Text style={styles.finishedDesc}>
              {score >= total * 0.7
                ? "Sharp eye! You spotted the errors."
                : "Keep at it — grammar takes practice!"}
            </Text>
            <TouchableOpacity
              style={styles.restartBtn}
              onPress={handleRestart}
              activeOpacity={0.7}
            >
              <Text style={styles.restartBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Instruction */}
            <View style={styles.instructionCard}>
              <Text style={styles.instructionLabel}>Find the error</Text>
              <Text style={styles.instructionText}>
                Tap the word that has a mistake
              </Text>
            </View>

            {/* Words */}
            <View style={styles.wordsRow}>
              {question.sentence.split(" ").map((word, index) => (
                <TouchableOpacity
                  key={index}
                  style={getWordChipStyle(index)}
                  onPress={() => handleTapWord(index)}
                  activeOpacity={0.7}
                  disabled={tappedIndex !== null}
                >
                  <Text style={getWordChipTextStyle(index)}>
                    {tappedIndex !== null && index === question.errorIndex
                      ? question.correctedWord
                      : word}
                  </Text>
                  {tappedIndex !== null && index === question.errorIndex && (
                    <Text style={styles.strikethrough}>{word}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Explanation */}
            {tappedIndex !== null && (
              <View style={styles.explanationCard}>
                <View style={styles.explanationHeader}>
                  <View
                    style={[
                      styles.typeBadge,
                      tappedIndex === question.errorIndex
                        ? styles.typeBadgeCorrect
                        : styles.typeBadgeWrong,
                    ]}
                  >
                    <Text style={styles.typeBadgeText}>
                      {tappedIndex === question.errorIndex
                        ? question.errorType
                        : "Wrong word"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.explanationText}>
                  {tappedIndex === question.errorIndex
                    ? question.explanation
                    : `The error is in "${question.sentence.split(" ")[question.errorIndex]}". ${question.explanation}`}
                </Text>
              </View>
            )}

            {tappedIndex !== null && (
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={handleNext}
                activeOpacity={0.7}
              >
                <Text style={styles.nextBtnText}>
                  {currentIndex + 1 >= total ? "See results" : "Next"}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  scoreText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.accent,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: C.surface,
    marginBottom: 24,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: C.accent,
  },
  instructionCard: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    marginBottom: 28,
  },
  instructionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.accent,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 15,
    color: C.text.secondary,
  },
  wordsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginBottom: 24,
  },
  wordChip: {
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  wordChipCorrect: {
    borderColor: C.green,
    backgroundColor: C.greenSoft,
  },
  wordChipWrongPick: {
    borderColor: C.red,
    backgroundColor: C.redSoft,
  },
  wordChipDimmed: {
    opacity: 0.5,
  },
  wordChipText: {
    fontSize: 18,
    fontWeight: "600",
    color: C.text.primary,
  },
  strikethrough: {
    fontSize: 13,
    color: C.text.hint,
    textDecorationLine: "line-through",
    marginTop: 4,
  },
  explanationCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    gap: 10,
  },
  explanationHeader: {
    flexDirection: "row",
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeCorrect: {
    backgroundColor: C.greenSoft,
  },
  typeBadgeWrong: {
    backgroundColor: C.redSoft,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.text.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
    color: C.text.secondary,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  finishedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingBottom: 60,
  },
  finishedIcon: {
    marginBottom: 6,
  },
  finishedTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: C.text.primary,
  },
  finishedDesc: {
    fontSize: 15,
    color: C.text.secondary,
  },
  restartBtn: {
    marginTop: 16,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 32,
  },
  restartBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
