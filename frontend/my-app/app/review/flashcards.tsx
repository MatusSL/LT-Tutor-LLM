import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Pressable,
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
  red: "#FF4B6E",
};

type WordPair = { spanish: string; english: string };

const MOCK_WORDS: WordPair[] = [
  { spanish: "hola", english: "hello" },
  { spanish: "gracias", english: "thank you" },
  { spanish: "amigo", english: "friend" },
  { spanish: "casa", english: "house" },
  { spanish: "cocina", english: "kitchen" },
  { spanish: "comer", english: "to eat" },
  { spanish: "beber", english: "to drink" },
  { spanish: "grande", english: "big" },
  { spanish: "pequeno", english: "small" },
  { spanish: "bueno", english: "good" },
  { spanish: "libro", english: "book" },
  { spanish: "agua", english: "water" },
  { spanish: "tiempo", english: "time" },
  { spanish: "trabajo", english: "work" },
  { spanish: "familia", english: "family" },
];

export default function FlashcardsScreen() {
  const router = useRouter();
  const [startSpanish, setStartSpanish] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [deck, setDeck] = useState<WordPair[]>([...MOCK_WORDS]);
  const [gotCount, setGotCount] = useState(0);

  const total = MOCK_WORDS.length;
  const current = deck[currentIndex];
  const finished = !current;

  const frontText = current
    ? startSpanish
      ? current.spanish
      : current.english
    : "";
  const backText = current
    ? startSpanish
      ? current.english
      : current.spanish
    : "";
  const frontLabel = startSpanish ? "Spanish" : "English";
  const backLabel = startSpanish ? "English" : "Spanish";

  const handleFlip = () => setFlipped(true);

  const handleGotIt = () => {
    setGotCount((c) => c + 1);
    advance();
  };

  const handleAgain = () => {
    // Move current card to the end of the deck
    setDeck((prev) => {
      const copy = [...prev];
      const card = copy.splice(currentIndex, 1)[0];
      copy.push(card);
      return copy;
    });
    setFlipped(false);
  };

  const advance = () => {
    setFlipped(false);
    const nextDeck = deck.filter((_, i) => i !== currentIndex);
    setDeck(nextDeck);
    if (currentIndex >= nextDeck.length) {
      setCurrentIndex(0);
    }
  };

  const handleRestart = () => {
    setDeck([...MOCK_WORDS]);
    setCurrentIndex(0);
    setFlipped(false);
    setGotCount(0);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={C.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Flashcards</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={styles.divider} />

      <View style={styles.body}>
        {/* Direction toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, startSpanish && styles.toggleBtnActive]}
            onPress={() => {
              setStartSpanish(true);
              setFlipped(false);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.toggleText, startSpanish && styles.toggleTextActive]}
            >
              ES → EN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, !startSpanish && styles.toggleBtnActive]}
            onPress={() => {
              setStartSpanish(false);
              setFlipped(false);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.toggleText, !startSpanish && styles.toggleTextActive]}
            >
              EN → ES
            </Text>
          </TouchableOpacity>
        </View>

        {/* Progress */}
        <Text style={styles.progress}>
          {finished ? `${total} / ${total}` : `${gotCount} / ${total}`}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${(gotCount / total) * 100}%` }]}
          />
        </View>

        {finished ? (
          /* Finished state */
          <View style={styles.finishedContainer}>
            <View style={styles.finishedIcon}>
              <Ionicons name="checkmark-circle" size={48} color={C.green} />
            </View>
            <Text style={styles.finishedTitle}>All done!</Text>
            <Text style={styles.finishedDesc}>
              You reviewed all {total} cards.
            </Text>
            <TouchableOpacity
              style={styles.restartBtn}
              onPress={handleRestart}
              activeOpacity={0.7}
            >
              <Text style={styles.restartBtnText}>Start over</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Flashcard */}
            <Pressable
              style={styles.card}
              onPress={!flipped ? handleFlip : undefined}
            >
              <Text style={styles.cardLabel}>
                {flipped ? backLabel : frontLabel}
              </Text>
              <Text style={styles.cardWord}>
                {flipped ? backText : frontText}
              </Text>
              {!flipped && (
                <Text style={styles.tapHint}>Tap to reveal</Text>
              )}
            </Pressable>

            {/* Action buttons */}
            {flipped && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.againBtn}
                  onPress={handleAgain}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={18} color={C.red} />
                  <Text style={styles.againBtnText}>Again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.gotItBtn}
                  onPress={handleGotIt}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark" size={18} color={C.green} />
                  <Text style={styles.gotItBtnText}>Got it</Text>
                </TouchableOpacity>
              </View>
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
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 3,
    gap: 3,
    alignSelf: "center",
    marginBottom: 20,
  },
  toggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: C.accent,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text.secondary,
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },
  progress: {
    textAlign: "center",
    fontSize: 14,
    color: C.text.secondary,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: C.surface,
    marginBottom: 28,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: C.accent,
  },
  card: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 22,
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    minHeight: 220,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.accent,
    marginBottom: 14,
  },
  cardWord: {
    fontSize: 32,
    fontWeight: "700",
    color: C.text.primary,
    textAlign: "center",
  },
  tapHint: {
    marginTop: 20,
    fontSize: 13,
    color: C.text.hint,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  againBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.red,
    backgroundColor: "rgba(255,75,110,0.08)",
  },
  againBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.red,
  },
  gotItBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.green,
    backgroundColor: "rgba(34,197,94,0.08)",
  },
  gotItBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.green,
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
