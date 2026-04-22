import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { C } from "@/constants/colors";
import { LangIcon } from "./LangIcon";
import type { TutorResponse } from "./types";

type Props = {
  text: string;
  tutor?: TutorResponse;
  onTranslate?: () => void;
  onCorrection?: () => void;
};

export function UserBubble({ text, tutor, onTranslate, onCorrection }: Props) {
  const [showCorrection, setShowCorrection] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const hasCorrection = !!tutor?.correction;
  const translationText = tutor
    ? tutor.input_language === "spanish"
      ? tutor.input_english
      : tutor.input_spanish
    : null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.bubble}>
        <View style={styles.innerRow}>
          <Text style={styles.text}>{text}</Text>
          {translationText && (
            <TouchableOpacity
              onPress={() => {
                const next = !showTranslation;
                setShowTranslation(next);
                if (next) onTranslate?.();
              }}
              activeOpacity={0.6}
              style={[styles.langBtn, showTranslation && styles.langBtnActive]}
            >
              <LangIcon color={showTranslation ? "#FFFFFF" : "rgba(255,255,255,0.55)"} />
            </TouchableOpacity>
          )}
        </View>

        {showTranslation && translationText && (
          <View style={styles.separator} />
        )}
        {showTranslation && translationText && (
          <Text style={styles.translation}>{translationText}</Text>
        )}

        {hasCorrection && (
          <TouchableOpacity
            onPress={() => {
              const next = !showCorrection;
              setShowCorrection(next);
              if (next) onCorrection?.();
            }}
            activeOpacity={0.7}
            style={styles.correctionToggle}
          >
            <Text style={styles.correctionToggleText}>
              {showCorrection ? "Hide correction" : "Show correction"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showCorrection && tutor?.correction && (
        <View style={styles.correctionBox}>
          <Text style={styles.correctionLabel}>Corrected</Text>
          <Text style={styles.correctionFixed}>{tutor.correction.corrected}</Text>
          {tutor.correction.error_candidates.map((ec, index) => (
            <View key={index} style={styles.errorItem}>
              <View style={styles.errorItemHeader}>
                <Text style={styles.errorWord}>&quot;{ec.word}&quot;</Text>
                <Text style={styles.errorType}>{ec.error_type}</Text>
              </View>
              <Text style={styles.errorSuggestion}>{ec.suggested_correction}</Text>
              <Text style={styles.errorExplanation}>{ec.explanation}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    maxWidth: "88%",
  },
  bubble: {
    backgroundColor: C.bubble.out,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  innerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  text: {
    flexShrink: 1,
    color: C.bubble.outText,
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
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 8,
  },
  translation: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    lineHeight: 20,
  },
  correctionToggle: {
    marginTop: 10,
    alignSelf: "flex-start",
  },
  correctionToggleText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  correctionBox: {
    marginTop: 8,
    backgroundColor: C.surfaceAlt,
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  correctionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: C.text.secondary,
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  correctionFixed: {
    fontSize: 15,
    color: C.text.primary,
    fontWeight: "600",
    marginBottom: 10,
  },
  errorItem: {
    marginTop: 8,
  },
  errorItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  errorWord: {
    color: C.text.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  errorType: {
    color: C.text.secondary,
    textTransform: "capitalize",
    fontSize: 13,
  },
  errorSuggestion: {
    color: C.accent,
    fontWeight: "600",
    marginBottom: 2,
    fontSize: 14,
  },
  errorExplanation: {
    color: C.text.secondary,
    lineHeight: 20,
    fontSize: 13,
  },
});
