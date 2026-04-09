import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/constants/colors";
import { LangIcon } from "./LangIcon";
import type { TutorResponse } from "./types";

type Props = {
  tutor: TutorResponse;
  onTranslate?: () => void;
  onReplay?: () => void;
};

export function TutorBubble({ tutor, onTranslate, onReplay }: Props) {
  const [showTranslation, setShowTranslation] = useState(false);

  return (
    <View style={styles.wrapper}>
      <View style={styles.bubble}>
        <View style={styles.innerRow}>
          <Text style={styles.text}>{tutor.response_spanish}</Text>
          <TouchableOpacity
            onPress={() => {
              const next = !showTranslation;
              setShowTranslation(next);
              if (next) onTranslate?.();
            }}
            activeOpacity={0.6}
            style={[styles.langBtn, showTranslation && styles.langBtnActive]}
          >
            <LangIcon color={showTranslation ? C.accent : C.text.secondary} />
          </TouchableOpacity>
        </View>

        {showTranslation && <View style={styles.separator} />}
        {showTranslation && (
          <Text style={styles.translation}>{tutor.response_english}</Text>
        )}

        {onReplay && (
          <View style={styles.footer}>
            <TouchableOpacity onPress={onReplay} activeOpacity={0.6} style={styles.replayBtn}>
              <Ionicons name="volume-medium" size={15} color={C.text.secondary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    maxWidth: "88%",
  },
  bubble: {
    backgroundColor: C.bubble.in,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  innerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  text: {
    flex: 1,
    color: C.bubble.inText,
    fontSize: 16,
    lineHeight: 22,
  },
  langBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    marginTop: -1,
  },
  langBtnActive: {
    backgroundColor: C.accentSoft,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginVertical: 8,
  },
  translation: {
    color: C.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    alignItems: "flex-end",
    marginTop: 6,
  },
  replayBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
