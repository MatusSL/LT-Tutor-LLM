import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { checkTutorServer } from "@/services/tutor-api";

const SH = {
  bg: '#FAFAF7',
  panel: '#FFFFFF',
  ink: '#0E0E10',
  inkSoft: '#55555C',
  muted: '#A0A0A8',
  line: '#EDEDEA',
  accent: '#2563EB',
  accentBg: '#EFF6FF',
  warn: '#B8590F',
  warnBg: '#F5EADB',
};

const MISTAKES = [
  { word: 'ser vs. estar', freq: '4×', cat: 'grammar' },
  { word: 'la mano', freq: '2×', cat: 'gender' },
  { word: 'preterite -ar', freq: '2×', cat: 'conjugation' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  useEffect(() => {
    checkTutorServer()
      .then(setServerOnline)
      .catch(() => setServerOnline(false));
  }, []);

  const serverColor =
    serverOnline === null ? SH.muted : serverOnline ? SH.accent : '#E16C75';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>LT</Text>
            </View>
            <Text style={styles.workspaceLabel}>Workspace</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.serverDot, { backgroundColor: serverColor }]} />
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
              <Ionicons name="settings-outline" size={15} color={SH.inkSoft} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.panel}>
          <TouchableOpacity
            style={[styles.actionRow, styles.rowDivider]}
            onPress={() => router.push('/chat')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: SH.accentBg }]}>
              <Ionicons name="play" size={14} color={SH.accent} />
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Continue session</Text>
              <Text style={styles.actionSub}>Start or resume your tutor session</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={SH.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, styles.rowDivider]}
            onPress={() => router.push('/review')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: SH.line }]}>
              <Ionicons name="layers-outline" size={15} color={SH.ink} />
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Review queue</Text>
              <Text style={styles.actionSub}>Flashcards, quizzes &amp; exercises</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={SH.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push('/lectures')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: SH.line }]}>
              <Ionicons name="book-outline" size={15} color={SH.ink} />
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Episodes</Text>
              <Text style={styles.actionSub}>Select completed lectures</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={SH.muted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.panel, styles.mistakesPanel]}>
          <View style={styles.mistakesHeader}>
            <Text style={styles.mistakesLabel}>RECENT MISTAKES · {MISTAKES.length}</Text>
            <TouchableOpacity onPress={() => router.push('/review')} activeOpacity={0.7}>
              <Text style={styles.drillLink}>Review →</Text>
            </TouchableOpacity>
          </View>
          {MISTAKES.map((item, i) => (
            <View key={i} style={styles.mistakeRow}>
              <View style={styles.mistakeDot} />
              <Text style={styles.mistakeWord}>{item.word}</Text>
              <Text style={styles.mistakeCat}>{item.cat}</Text>
              <View style={styles.mistakeFreqBadge}>
                <Text style={styles.mistakeFreqText}>{item.freq}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: SH.bg,
  },
  scroll: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: SH.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  workspaceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: SH.ink,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serverDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: SH.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SH.line,
    alignItems: 'center',
    justifyContent: 'center',
  },

  panel: {
    marginHorizontal: 14,
    backgroundColor: SH.panel,
    borderWidth: 1,
    borderColor: SH.line,
    borderRadius: 14,
    overflow: 'hidden',
  },
  mistakesPanel: {
    marginTop: 10,
    paddingTop: 12,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: SH.line,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: SH.ink,
  },
  actionSub: {
    fontSize: 12,
    color: SH.inkSoft,
    marginTop: 1,
  },

  mistakesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  mistakesLabel: {
    fontSize: 10,
    color: SH.muted,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  drillLink: {
    fontSize: 11,
    fontWeight: '600',
    color: SH.ink,
  },
  mistakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: SH.line,
    gap: 10,
  },
  mistakeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: SH.warn,
  },
  mistakeWord: {
    flex: 1,
    fontSize: 13,
    color: SH.ink,
  },
  mistakeCat: {
    fontSize: 11,
    color: SH.inkSoft,
  },
  mistakeFreqBadge: {
    backgroundColor: SH.warnBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mistakeFreqText: {
    fontSize: 12,
    fontWeight: '600',
    color: SH.warn,
  },
});
