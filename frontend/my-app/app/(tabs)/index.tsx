import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { checkTutorServer } from "@/services/tutor-api";

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

export default function HomeScreen() {
  const router = useRouter();
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  useEffect(() => {
    checkTutorServer()
      .then(setServerOnline)
      .catch(() => setServerOnline(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>LT</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>LT Tutor</Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: serverOnline === null ? C.text.hint : serverOnline ? C.green : C.red },
              ]}
            />
            <Text style={styles.headerStatus}>
              {serverOnline === null ? "Connecting…" : serverOnline ? "Server online" : "Server offline"}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.divider} />

      <View style={styles.body}>
        {/* Brand block */}
        <View style={styles.brand}>
          <Text style={styles.brandTitle}>Spanish Tutor</Text>
          <Text style={styles.brandSubtitle}>
            Practice conversation, track vocabulary, and learn from corrections.
          </Text>
        </View>

        {/* Action cards */}
        <TouchableOpacity
          style={styles.primaryCard}
          onPress={() => router.push("/chat")}
          activeOpacity={0.8}
        >
          <View style={styles.cardIconBg}>
            <Ionicons name="chatbubble" size={22} color={C.accent} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Start practicing</Text>
            <Text style={styles.cardDesc}>Have a bilingual conversation with your tutor</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.text.hint} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryCard}
          onPress={() => router.push("/review")}
          activeOpacity={0.8}
        >
          <View style={styles.cardIconBg}>
            <Ionicons name="checkmark-circle" size={22} color={C.accent} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Review vocabulary</Text>
            <Text style={styles.cardDesc}>Browse words and phrases from past sessions</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.text.hint} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryCard}
          onPress={() => router.push("/lectures")}
          activeOpacity={0.8}
        >
          <View style={styles.cardIconBg}>
            <Ionicons name="book" size={22} color={C.accent} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Select lectures</Text>
            <Text style={styles.cardDesc}>Mark completed episodes to unlock vocabulary</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.text.hint} />
        </TouchableOpacity>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: C.surface,
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text.primary,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  headerStatus: {
    fontSize: 12,
    color: C.text.secondary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    gap: 12,
  },
  brand: {
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: C.text.primary,
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: C.text.secondary,
  },
  primaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.accent,
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  secondaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 16,
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  cardIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 18,
  },
});
