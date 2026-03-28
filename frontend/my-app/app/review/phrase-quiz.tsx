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
import { useRouter } from "expo-router";

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

type QuizQuestion = {
  phrase: string;
  correctAnswer: string;
  options: string[];
};

const MOCK_QUESTIONS: QuizQuestion[] = [
  {
    phrase: "Me alegra verte otra vez.",
    correctAnswer: "I'm glad to see you again.",
    options: [
      "I'm glad to see you again.",
      "I need to see you later.",
      "I'm happy to help you.",
      "It makes me sad to leave.",
    ],
  },
  {
    phrase: "Quieres ir a la cocina?",
    correctAnswer: "Do you want to go to the kitchen?",
    options: [
      "Do you want to go to the kitchen?",
      "Do you want to go outside?",
      "Can you clean the kitchen?",
      "Where is the kitchen?",
    ],
  },
  {
    phrase: "Estoy bien, gracias.",
    correctAnswer: "I'm fine, thank you.",
    options: [
      "I'm fine, thank you.",
      "I'm tired, thanks.",
      "I'm leaving, goodbye.",
      "I'm hungry, thanks.",
    ],
  },
  {
    phrase: "Tengo que ir al trabajo.",
    correctAnswer: "I have to go to work.",
    options: [
      "I have to go to work.",
      "I want to go home.",
      "I have to buy food.",
      "I need to call work.",
    ],
  },
  {
    phrase: "El libro esta en la mesa.",
    correctAnswer: "The book is on the table.",
    options: [
      "The book is on the table.",
      "The book is very good.",
      "The table is very big.",
      "The book is in my bag.",
    ],
  },
  {
    phrase: "Necesito un vaso de agua.",
    correctAnswer: "I need a glass of water.",
    options: [
      "I need a glass of water.",
      "I want a cup of coffee.",
      "I need a bottle of wine.",
      "I have a glass of juice.",
    ],
  },
  {
    phrase: "Mi familia es muy grande.",
    correctAnswer: "My family is very big.",
    options: [
      "My family is very big.",
      "My house is very big.",
      "My family is very nice.",
      "My friend is very tall.",
    ],
  },
  {
    phrase: "Hace mucho frio hoy.",
    correctAnswer: "It's very cold today.",
    options: [
      "It's very cold today.",
      "It's very hot today.",
      "It's raining a lot today.",
      "It's very late today.",
    ],
  },
  {
    phrase: "Donde esta el bano?",
    correctAnswer: "Where is the bathroom?",
    options: [
      "Where is the bathroom?",
      "Where is the store?",
      "Where is the park?",
      "Where are you going?",
    ],
  },
  {
    phrase: "Vamos a comer juntos.",
    correctAnswer: "Let's eat together.",
    options: [
      "Let's eat together.",
      "Let's go home now.",
      "Let's cook something.",
      "Let's play together.",
    ],
  },
];

export default function PhraseQuizScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = MOCK_QUESTIONS.length;
  const question = MOCK_QUESTIONS[currentIndex];

  const handleSelect = (optionIndex: number) => {
    if (selected !== null) return;
    setSelected(optionIndex);
    if (question.options[optionIndex] === question.correctAnswer) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= total) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  };

  const getOptionStyle = (index: number) => {
    if (selected === null) return styles.option;
    const isCorrect = question.options[index] === question.correctAnswer;
    const isSelected = index === selected;
    if (isCorrect) return [styles.option, styles.optionCorrect];
    if (isSelected && !isCorrect) return [styles.option, styles.optionWrong];
    return [styles.option, styles.optionDimmed];
  };

  const getOptionTextStyle = (index: number) => {
    if (selected === null) return styles.optionText;
    const isCorrect = question.options[index] === question.correctAnswer;
    const isSelected = index === selected;
    if (isCorrect) return [styles.optionText, { color: C.green }];
    if (isSelected && !isCorrect) return [styles.optionText, { color: C.red }];
    return [styles.optionText, { color: C.text.hint }];
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={C.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Phrase Quiz</Text>
        <Text style={styles.scoreText}>
          {score}/{finished ? total : currentIndex + (selected !== null ? 1 : 0)}
        </Text>
      </View>
      <View style={styles.divider} />

      <View style={styles.body}>
        {/* Progress */}
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
                ? "Great job! Keep it up."
                : "Keep practicing, you'll get there!"}
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
            {/* Question */}
            <View style={styles.questionCard}>
              <Text style={styles.questionLabel}>Translate this phrase</Text>
              <Text style={styles.questionPhrase}>{question.phrase}</Text>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {question.options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={getOptionStyle(index)}
                  onPress={() => handleSelect(index)}
                  activeOpacity={0.7}
                  disabled={selected !== null}
                >
                  <Text style={getOptionTextStyle(index)}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Next button */}
            {selected !== null && (
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
  questionCard: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    marginBottom: 24,
  },
  questionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.accent,
    marginBottom: 12,
  },
  questionPhrase: {
    fontSize: 20,
    fontWeight: "600",
    color: C.text.primary,
    textAlign: "center",
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 10,
  },
  option: {
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  optionCorrect: {
    borderColor: C.green,
    backgroundColor: C.greenSoft,
  },
  optionWrong: {
    borderColor: C.red,
    backgroundColor: C.redSoft,
  },
  optionDimmed: {
    opacity: 0.4,
  },
  optionText: {
    fontSize: 15,
    color: C.text.primary,
    lineHeight: 21,
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
