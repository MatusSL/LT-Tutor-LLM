import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";

function formatDuration(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

type Props = {
  seconds: number;
  onStop: () => void;
  onCancel: () => void;
};

export function RecordingIndicator({ seconds, onStop, onCancel }: Props) {
  const [bars, setBars] = useState(
    Array.from({ length: 22 }, () => 0.3 + Math.random() * 0.7),
  );

  useEffect(() => {
    const t = setInterval(() => {
      setBars(Array.from({ length: 22 }, () => 0.3 + Math.random() * 0.7));
    }, 180);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={styles.recordingBar}>
      <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
        <Ionicons name="close" size={20} color={C.text.secondary} />
      </TouchableOpacity>

      <View style={styles.waveRow}>
        <View style={styles.dot} />
        {bars.map((h, i) => (
          <View key={i} style={[styles.waveBar, { height: Math.max(6, h * 32) }]} />
        ))}
      </View>

      <Text style={styles.timer}>{formatDuration(seconds)}</Text>

      <TouchableOpacity onPress={onStop} style={styles.stopBtn}>
        <View style={styles.stopSquare} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 14,
    gap: 10,
  },
  cancelBtn: {
    padding: 4,
  },
  waveRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 36,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.record,
    marginRight: 6,
  },
  waveBar: {
    width: 3,
    borderRadius: 99,
    backgroundColor: C.accent,
    opacity: 0.8,
  },
  timer: {
    fontSize: 13,
    color: C.text.secondary,
    minWidth: 34,
  },
  stopBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.record,
    alignItems: "center",
    justifyContent: "center",
  },
  stopSquare: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
});
