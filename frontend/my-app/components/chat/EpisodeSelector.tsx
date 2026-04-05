import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { C } from "@/constants/colors";
import { EPISODE_COUNT } from "./types";

type Props = {
  selectedEpisode: number;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: () => void;
  onSelect: (episode: number) => void;
};

export function EpisodeSelector({ selectedEpisode, loading, error, onBack, onConfirm, onSelect }: Props) {
  const episodes = Array.from({ length: EPISODE_COUNT }, (_, i) => i + 1);

  return (
    <View style={styles.body}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Select completed episodes</Text>
        <TouchableOpacity
          onPress={onConfirm}
          activeOpacity={0.7}
          disabled={loading || selectedEpisode === 0}
        >
          <Text
            style={[
              styles.confirmButton,
              (loading || selectedEpisode === 0) && styles.confirmButtonDisabled,
            ]}
          >
            Continue
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        Every episode up to your last completed one will be counted as done.
      </Text>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={C.accent} />
          <Text style={styles.hint}>Building vocabulary...</Text>
        </View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={episodes}
        keyExtractor={(item) => item.toString()}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isSelected = item <= selectedEpisode;
          return (
            <Pressable style={styles.row} onPress={() => onSelect(item)}>
              <Text style={styles.rowText}>Episode {item}</Text>
              <View
                style={[
                  styles.circle,
                  isSelected ? styles.circleSelected : styles.circleUnselected,
                ]}
              />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    color: C.accent,
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    color: C.text.primary,
    fontSize: 17,
    fontWeight: "700",
  },
  confirmButton: {
    color: C.accent,
    fontSize: 16,
    fontWeight: "700",
  },
  confirmButtonDisabled: {
    color: C.text.hint,
  },
  subtitle: {
    color: C.text.secondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  hint: {
    color: C.text.secondary,
    fontSize: 14,
  },
  error: {
    marginTop: 14,
    color: "#FF6B6B",
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
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
