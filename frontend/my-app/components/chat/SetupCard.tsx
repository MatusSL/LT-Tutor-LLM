import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { C } from "@/constants/colors";

type Props = {
  socketReady: boolean;
  loading: boolean;
  error: string | null;
  onSkip: () => void;
  onSelectEpisodes: () => void;
};

export function SetupCard({ socketReady, loading, error, onSkip, onSelectEpisodes }: Props) {
  return (
    <View style={styles.body}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Chat Setup</Text>
        <Text style={styles.title}>Start your practice session</Text>
        <Text style={styles.text}>
          Choose how we should build your vocabulary before the chat begins.
        </Text>

        <TouchableOpacity
          style={[styles.primaryAction, (!socketReady || loading) && styles.disabled]}
          onPress={onSelectEpisodes}
          disabled={!socketReady || loading}
        >
          <Text style={styles.primaryActionText}>Select completed episodes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryAction, (!socketReady || loading) && styles.disabled]}
          onPress={onSkip}
          disabled={!socketReady || loading}
        >
          <Text style={styles.secondaryActionText}>Skip</Text>
        </TouchableOpacity>

        {!socketReady && (
          <Text style={styles.hint}>Connecting to tutor server...</Text>
        )}
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={C.accent} />
            <Text style={styles.hint}>Preparing your chat...</Text>
          </View>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.accent,
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    color: C.text.primary,
    marginBottom: 10,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: C.text.secondary,
    marginBottom: 24,
  },
  primaryAction: {
    backgroundColor: C.accent,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryAction: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  secondaryActionText: {
    color: C.text.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.4,
  },
  hint: {
    marginTop: 16,
    color: C.text.secondary,
    fontSize: 14,
  },
  error: {
    marginTop: 14,
    color: "#FF6B6B",
    fontSize: 14,
    lineHeight: 20,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
});
