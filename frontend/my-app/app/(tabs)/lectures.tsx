import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { requestEpisodeTopics } from "@/services/tutor-api";

const C = {
  bg: "#0F0F13",
  surface: "#1A1A24",
  border: "rgba(255,255,255,0.07)",
  accent: "#6C63FF",
  text: { primary: "#E8E8F0", secondary: "#888899", hint: "#555566" },
};

const EPISODE_COUNT = 90;

export default function LecturesScreen() {
  const [selectedLecture, setSelectedLecture] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lectures = Array.from({ length: EPISODE_COUNT }, (_, i) => i + 1);

  const handlePress = (lecture: number) => {
    setSelectedLecture(lecture === selectedLecture ? 0 : lecture);
  };

  const handleConfirm = async () => {
    if (selectedLecture === 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      await requestEpisodeTopics(selectedLecture);
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load episode topics.");
    } finally {
      setLoading(false);
    }
  };

  const renderItem: ListRenderItem<number> = ({ item }) => {
    const isSelected = item <= selectedLecture;
    return (
      <Pressable style={styles.row} onPress={() => handlePress(item)}>
        <Text style={styles.rowText}>Episode {item}</Text>
        <View style={[styles.circle, isSelected ? styles.circleSelected : styles.circleUnselected]} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lectures</Text>
        <TouchableOpacity
          onPress={() => void handleConfirm()}
          activeOpacity={0.7}
          disabled={selectedLecture === 0 || loading}
        >
          <Ionicons
            name="checkmark"
            size={22}
            color={selectedLecture === 0 || loading ? C.text.hint : C.accent}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />

      <Text style={styles.subtitle}>
        Mark the last episode you completed — all prior episodes count as done.
      </Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={lectures}
        keyExtractor={(item) => item.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: C.text.secondary,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 14,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  rowText: {
    fontSize: 16,
    color: C.text.primary,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  circleUnselected: {
    borderColor: C.text.hint,
    backgroundColor: "transparent",
  },
  circleSelected: {
    borderColor: C.accent,
    backgroundColor: C.accent,
  },
});
