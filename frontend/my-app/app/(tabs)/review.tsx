import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from "react-native";
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

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Review</Text>
      </View>
      <View style={styles.divider} />

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Choose a practice mode</Text>

        <View style={styles.grid}>
          {MODES.map((mode) => (
            <ModeCard key={mode.route} mode={mode} onPress={() => router.push(mode.route as never)} />
          ))}
        </View>
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
