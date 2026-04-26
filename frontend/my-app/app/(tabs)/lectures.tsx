import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { requestEpisodeTopics, requestCurrentEpisode } from "@/services/tutor-api";
import { C } from "@/constants/colors";

const EPISODE_COUNT = 90;

export default function LecturesScreen() {
  const [selectedEpisode, setSelectedEpisode] = useState(0);
  const [currentEpisode, setCurrentEpisode] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const episodes = Array.from({ length: EPISODE_COUNT }, (_, i) => i + 1);

  const handlePress = (episode: number) => {
    setSelectedEpisode(episode === selectedEpisode ? 0 : episode);
  };

  useEffect(() => {
    const fetchCurrentEpisode = async () => {
      setError(null);
      try {
        const payload = await requestCurrentEpisode();
        setCurrentEpisode(payload.episode);
        setSelectedEpisode(payload.episode);
      } catch {
        setError("Could not load current episode.");
      } finally {
        setInitialLoading(false);
      }
    };
    void fetchCurrentEpisode();
  }, []);

  const handleConfirm = async () => {
    if (selectedEpisode === 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      await requestEpisodeTopics(selectedEpisode);
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load episode topics.");
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = Math.min((selectedEpisode / EPISODE_COUNT) * 100, 100);

  const renderItem: ListRenderItem<number> = ({ item }) => {
    const isCompleted = item < selectedEpisode;
    const isActive = item === selectedEpisode;

    return (
      <Pressable
        style={[styles.row, isActive && styles.rowActive]}
        onPress={() => handlePress(item)}
      >
        <View style={styles.rowLeft}>
          <Text style={[styles.rowText, isActive && styles.rowTextActive]}>
            Episode {item}
          </Text>
          {isActive && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          )}
        </View>
        {isCompleted ? (
          <View style={[styles.circle, styles.circleCompleted]}>
            <Ionicons name="checkmark" size={13} color="#fff" />
          </View>
        ) : isActive ? (
          <View style={[styles.circle, styles.circleActive]} />
        ) : (
          <View style={[styles.circle, styles.circleUnselected]} />
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Episodes</Text>
      </View>
      <View style={styles.divider} />

      {initialLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : (
        <>
          {/* Progress card */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressCount}>
                {selectedEpisode} of {EPISODE_COUNT} complete
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <FlatList
            data={episodes}
            keyExtractor={(item) => item.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          {/* Start Session button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.startBtn,
                (selectedEpisode === 0 || loading) && styles.startBtnDisabled,
              ]}
              onPress={() => void handleConfirm()}
              disabled={selectedEpisode === 0 || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.startBtnText}>
                  {selectedEpisode > 0
                    ? `Start Session — Episode ${selectedEpisode}`
                    : "Select an episode"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  progressCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    gap: 10,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: C.text.secondary,
  },
  progressCount: {
    fontSize: 13,
    fontWeight: "600",
    color: C.text.primary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: C.surfaceAlt,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: C.accent,
    borderRadius: 3,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 14,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  rowActive: {
    // no background change, just badge and text color
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowText: {
    fontSize: 16,
    color: C.text.primary,
  },
  rowTextActive: {
    fontWeight: "700",
    color: C.accent,
  },
  activeBadge: {
    backgroundColor: C.accentSoft,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.accent,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  circleUnselected: {
    borderColor: C.text.hint,
    backgroundColor: "transparent",
  },
  circleActive: {
    borderColor: C.accent,
    backgroundColor: "transparent",
  },
  circleCompleted: {
    borderColor: C.accent,
    backgroundColor: C.accent,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: C.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  startBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  startBtnDisabled: {
    opacity: 0.4,
  },
  startBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
