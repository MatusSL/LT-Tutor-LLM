import { Fragment, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { C } from "@/constants/colors";
import { LangIcon } from "./LangIcon";
import type { ErrorCandidate, TutorResponse } from "./types";

type Segment =
  | { type: "normal"; text: string }
  | { type: "error"; wrong: string; corrected: string };

function isWordChar(char: string) {
  return /[\p{L}\p{N}_]/u.test(char);
}

function expandToWordBoundaries(text: string, start: number, end: number) {
  let expandedStart = start;
  let expandedEnd = end;

  while (expandedStart > 0 && isWordChar(text[expandedStart - 1])) {
    expandedStart -= 1;
  }

  while (expandedEnd < text.length && isWordChar(text[expandedEnd])) {
    expandedEnd += 1;
  }

  return [expandedStart, expandedEnd] as const;
}

function findClosest(text: string, needle: string, target: number) {
  if (!needle) return null;

  let best: readonly [number, number] | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let fromIndex = 0;

  while (fromIndex <= text.length) {
    const index = text.indexOf(needle, fromIndex);
    if (index === -1) break;

    const distance = Math.abs(index - target);
    if (distance < bestDistance) {
      best = [index, index + needle.length] as const;
      bestDistance = distance;
    }

    fromIndex = index + 1;
  }

  return best;
}

function normalizeErrorSpan(text: string, err: ErrorCandidate) {
  if (err.span.length < 2) return null;

  let start = Math.max(0, Math.min(err.span[0], text.length));
  let end = Math.max(start, Math.min(err.span[1], text.length));
  let wrong = text.slice(start, end);

  if (wrong !== err.word) {
    const closest = findClosest(text, err.word, start);
    if (closest) {
      [start, end] = closest;
      wrong = text.slice(start, end);
    } else {
      const [expandedStart, expandedEnd] = expandToWordBoundaries(text, start, end);
      const expandedWrong = text.slice(expandedStart, expandedEnd);
      const expected = err.word.trim();
      const current = wrong.trim();
      const recoverable =
        expandedWrong.includes(expected) ||
        (current ? expected.includes(current) || current.includes(expected) : false);

      if (!recoverable) return null;

      start = expandedStart;
      end = expandedEnd;
      wrong = expandedWrong;
    }
  }

  const cutsThroughWord =
    (start > 0 && isWordChar(text[start - 1])) ||
    (end < text.length && isWordChar(text[end]));

  if (cutsThroughWord) {
    [start, end] = expandToWordBoundaries(text, start, end);
    wrong = text.slice(start, end);
  }

  if (start === end || !wrong.trim()) return null;

  return { start, end, wrong, corrected: err.correction };
}

function buildSegments(text: string, errors: ErrorCandidate[]): Segment[] {
  const sorted = errors
    .map((err) => normalizeErrorSpan(text, err))
    .filter((err): err is NonNullable<typeof err> => err !== null)
    .sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let cursor = 0;

  for (const err of sorted) {
    if (err.start < cursor) {
      continue;
    }

    if (err.start > cursor) {
      segments.push({ type: "normal", text: text.slice(cursor, err.start) });
    }

    segments.push({
      type: "error",
      wrong: err.wrong,
      corrected: err.corrected,
    });
    cursor = err.end;
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
        <View style={styles.textRow}>
          <Text style={[styles.text, styles.messageText]}>
            {segments
              ? segments.map((seg, i) =>
                  seg.type === "normal" ? (
                    <Text key={i}>{seg.text}</Text>
                  ) : (
                    <Fragment key={i}>
                      <Text style={styles.wrongWord}>{seg.wrong}</Text>
                      <Text style={styles.correctedWord}> {seg.corrected}</Text>
                    </Fragment>
                  )
                )
              : text
            }
          </Text>
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
  textRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  text: {
    color: C.bubble.outText,
    fontSize: 16,
    lineHeight: 22,
  },
  messageText: {
    flexGrow: 1,
    flexShrink: 1,
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
    marginTop: -2,
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
