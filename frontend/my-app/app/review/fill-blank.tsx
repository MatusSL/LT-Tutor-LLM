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
import { BlankWord } from "@/services/tutor-api";

const C = {
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F3EF',
  border: '#EDEDEA',
  accent: '#2563EB',
  accentSoft: '#EFF6FF',
  text: { primary: '#0E0E10', secondary: '#55555C', hint: '#A0A0A8' },
  green: '#2563EB',
  greenSoft: '#EFF6FF',
  red: '#DC2626',
  redSoft: '#FEF2F2',
};

type FillBlankQuestion = {
  sentence: string;
  blankIndex: number;
  correctWord: string;
  options: string[];
  translation: string;
};

const MOCK_QUESTIONS: FillBlankQuestion[] = [
  {
    sentence: "Me alegra ____ otra vez.",
    blankIndex: 2,
    correctWord: "verte",
    options: ["verte", "comer", "salir", "tener"],
    translation: "I'm glad to see you again.",
  },
  {
    sentence: "Quieres ir a la ____?",
    blankIndex: 5,
    correctWord: "cocina",
    options: ["mesa", "cocina", "puerta", "calle"],
    translation: "Do you want to go to the kitchen?",
  },
  {
    sentence: "El libro esta en la ____.",
    blankIndex: 5,
    correctWord: "mesa",
    options: ["casa", "silla", "mesa", "cama"],
    translation: "The book is on the table.",
  },
  {
    sentence: "Necesito un ____ de agua.",
    blankIndex: 2,
    correctWord: "vaso",
    options: ["vaso", "plato", "trozo", "poco"],
    translation: "I need a glass of water.",
  },
  {
    sentence: "Mi familia es muy ____.",
    blankIndex: 4,
    correctWord: "grande",
    options: ["buena", "grande", "nueva", "vieja"],
    translation: "My family is very big.",
  },
  {
    sentence: "Tengo que ____ al trabajo.",
    blankIndex: 2,
    correctWord: "ir",
    options: ["ir", "ver", "ser", "dar"],
    translation: "I have to go to work.",
  },
  {
    sentence: "Hace mucho ____ hoy.",
    blankIndex: 2,
    correctWord: "frio",
    options: ["calor", "frio", "tiempo", "ruido"],
    translation: "It's very cold today.",
  },
  {
    sentence: "Vamos a ____ juntos.",
    blankIndex: 2,
    correctWord: "comer",
    options: ["comer", "dormir", "correr", "leer"],
    translation: "Let's eat together.",
  },
  {
    sentence: "Buenos ____, como estas?",
    blankIndex: 1,
    correctWord: "dias",
    options: ["dias", "noches", "amigos", "tiempos"],
    translation: "Good morning, how are you?",
  },
  {
    sentence: "Me ____ mucho la musica.",
    blankIndex: 1,
    correctWord: "gusta",
    options: ["gusta", "tiene", "quiere", "puede"],
    translation: "I like music a lot.",
  },
];

export default function FillBlankScreen() {
  const router = useRouter();
  const { data } = useLocalSearchParams<{ data: string }>();
  const questions: FillBlankQuestion[] = data
    ? (JSON.parse(data) as BlankWord[]).map((q) => ({
        sentence: q.sentence,
        blankIndex: q.blank_index,
        correctWord: q.correct_word,
        options: q.options,
        translation: q.translation,
      }))
    : MOCK_QUESTIONS;
    
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = questions.length;
  const question = questions[currentIndex];

  const handleSelect = (word: string) => {
    if (selected !== null) return;
    setSelected(word);
    if (word === question.correctWord) {
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

  const displaySentence = selected
    ? question.sentence.replace("____", question.correctWord)
    : question.sentence;

  const getWordStyle = (word: string) => {
    if (selected === null) return styles.wordBtn;
    if (word === question.correctWord)
      return [styles.wordBtn, styles.wordCorrect];
    if (word === selected) return [styles.wordBtn, styles.wordWrong];
    return [styles.wordBtn, styles.wordDimmed];
  };

  const getWordTextStyle = (word: string) => {
    if (selected === null) return styles.wordText;
    if (word === question.correctWord)
      return [styles.wordText, { color: C.green }];
    if (word === selected) return [styles.wordText, { color: C.red }];
    return [styles.wordText, { color: C.text.hint }];
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={C.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fill in the Blank</Text>
        <Text style={styles.scoreText}>
          {score}/{finished ? total : currentIndex + (selected !== null ? 1 : 0)}
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
                ? "Well done! Your vocabulary is solid."
                : "Keep practicing to improve!"}
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
            {/* Sentence card */}
            <View style={styles.sentenceCard}>
              <Text style={styles.sentenceLabel}>Complete the sentence</Text>
              <Text style={styles.sentenceText}>{displaySentence}</Text>
              {selected && (
                <Text style={styles.translationText}>{question.translation}</Text>
              )}
            </View>

            {/* Word options */}
            <View style={styles.wordsGrid}>
              {question.options.map((word) => (
                <TouchableOpacity
                  key={word}
                  style={getWordStyle(word)}
                  onPress={() => handleSelect(word)}
                  activeOpacity={0.7}
                  disabled={selected !== null}
                >
                  <Text style={getWordTextStyle(word)}>{word}</Text>
                </TouchableOpacity>
              ))}
            </View>

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
  sentenceCard: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    marginBottom: 28,
  },
  sentenceLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.accent,
    marginBottom: 14,
  },
  sentenceText: {
    fontSize: 22,
    fontWeight: "600",
    color: C.text.primary,
    textAlign: "center",
    lineHeight: 30,
  },
  translationText: {
    marginTop: 14,
    fontSize: 14,
    color: C.text.secondary,
    textAlign: "center",
    fontStyle: "italic",
  },
  wordsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  wordBtn: {
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: C.border,
    minWidth: "45%",
    alignItems: "center",
  },
  wordCorrect: {
    borderColor: C.green,
    backgroundColor: C.greenSoft,
  },
  wordWrong: {
    borderColor: C.red,
    backgroundColor: C.redSoft,
  },
  wordDimmed: {
    opacity: 0.4,
  },
  wordText: {
    fontSize: 16,
    fontWeight: "600",
    color: C.text.primary,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 24,
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
