import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { C } from "@/constants/colors";
import { LangIcon } from "./LangIcon";
import type { ErrorCandidate, TutorResponse } from "./types";

type Segment =
  | { type: "normal"; text: string }
  | { type: "error"; wrong: string; corrected: string };

function buildSegments(text: string, errors: ErrorCandidate[]): Segment[] {
  const sorted = [...errors].sort((a, b) => a.span[0] - b.span[0]);
  const segments: Segment[] = [];
  let cursor = 0;

  for (const err of sorted) {
    const [start, end] = err.span;
    if (start > cursor) {
      segments.push({ type: "normal", text: text.slice(cursor, start) });
    }
    segments.push({
      type: "error",
      wrong: text.slice(start, end),
      corrected: err.correction,
    });
    cursor = end;
  }

  if (cursor < text.length) {
    segments.push({ type: "normal", text: text.slice(cursor) });
  }

  return segments;
}

type Props = {
  text: string;
  tutor?: TutorResponse;
  onTranslate?: () => void;
  onCorrection?: () => void;
};

export function UserBubble({ text, tutor, onTranslate, onCorrection }: Props) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);

  const hasCorrection = !!tutor?.correction;
  const translationText = tutor
    ? tutor.input_language === "spanish"
      ? tutor.input_english
      : tutor.input_spanish
    : null;

  const segments = hasCorrection
    ? buildSegments(text, tutor!.correction!.error_candidates)
    : null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.bubble}>
        {/* Text row — use View+flexWrap so textDecorationLine renders correctly
            on each standalone Text (nested Text breaks strikethrough on RN) */}
        <View style={styles.textRow}>
          {segments
            ? segments.map((seg, i) =>
                seg.type === "normal" ? (
                  <Text key={i} style={styles.text}>{seg.text}</Text>
                ) : (
                  <View key={i} style={styles.errorPair}>
                    <Text style={[styles.text, styles.wrongWord]}>{seg.wrong}</Text>
                    <Text style={[styles.text, styles.correctedWord]}> {seg.corrected}</Text>
                  </View>
                )
              )
            : <Text style={styles.text}>{text}</Text>
          }
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
          {tutor.correction.error_candidates.map((ec, index) => (
            <View key={index} style={index > 0 ? styles.errorItemSpaced : undefined}>
              <View style={styles.errorItemHeader}>
                <Text style={styles.errorArrow}>
                  <Text style={styles.errorWrongInline}>{ec.word}</Text>
                  <Text style={styles.errorArrowText}>{" → "}</Text>
                  <Text style={styles.errorCorrectInline}>{ec.correction}</Text>
                </Text>
                <Text style={styles.errorType}>{ec.error_type}</Text>
              </View>
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
  // Wrap in a View so each Text is a direct child → textDecorationLine works
  textRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  text: {
    color: C.bubble.outText,
    fontSize: 16,
    lineHeight: 22,
  },
  errorPair: {
    flexDirection: "row",
    alignItems: "center",
  },
  wrongWord: {
    textDecorationLine: "line-through",
    textDecorationColor: "#DC2626",
    color: "rgba(255,255,255,0.45)",
  },
  correctedWord: {
    color: "#4ADE80",
    fontWeight: "700",
  },
  langBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
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
  errorItemSpaced: {
    marginTop: 12,
  },
  errorItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  errorArrow: {
    fontSize: 15,
  },
  errorWrongInline: {
    color: C.text.primary,
    fontWeight: "600",
    fontSize: 15,
  },
  errorArrowText: {
    color: C.text.secondary,
    fontSize: 15,
  },
  errorCorrectInline: {
    color: C.accent,
    fontWeight: "700",
    fontSize: 15,
  },
  errorType: {
    color: C.text.secondary,
    textTransform: "capitalize",
    fontSize: 12,
  },
  errorExplanation: {
    color: C.text.secondary,
    lineHeight: 20,
    fontSize: 13,
  },
});
