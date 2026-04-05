import { StyleSheet, Text, View } from "react-native";
import { C } from "@/constants/colors";
import { TypingAnimation } from "./TypingAnimation";

export function LoadingBubble() {
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>T</Text>
      </View>
      <View style={[styles.bubble, styles.loadingBubble]}>
        <TypingAnimation />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    marginTop: 4,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginTop: 2,
  },
  avatarText: {
    color: C.accent,
    fontWeight: "700",
    fontSize: 13,
  },
  bubble: {
    backgroundColor: C.bubble.in,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  loadingBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
