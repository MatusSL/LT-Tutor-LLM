import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import { getWebSocketUrl } from "@/constants/api";

type ErrorCandidate = {
  word: string;
  span: number[];
  error_type: string;
  suggested_correction: string;
  explanation: string;
};

type Correction = {
  original: string;
  corrected: string;
  error_candidates: ErrorCandidate[];
};

type TutorResponse = {
  input_spanish: string;
  input_english: string;
  input_language: "english" | "spanish" | "unknown";
  response_spanish: string;
  response_english: string;
  correction: Correction | null;
};

type Message =
  | {
      id: string;
      type: "user";
      text: string;
      time: string;
      tutor?: TutorResponse;
    }
  | { id: string; type: "tutor"; tutor: TutorResponse; time: string }
  | { id: string; type: "loading" };

const getTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const LangIcon = ({ color }: { color: string }) => (
  <Ionicons name="language" size={16} color={color} />
);

function UserBubble({ text, tutor }: { text: string; tutor?: TutorResponse }) {
  const [showCorrection, setShowCorrection] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const hasCorrection = !!tutor?.correction;
  const translationText = tutor
    ? tutor.input_language === "spanish"
      ? tutor.input_english
      : tutor.input_spanish
    : null;

  return (
    <View style={styles.userBubbleWrapper}>
      <View style={styles.bubbleUser}>
        <View style={styles.bubbleInnerRow}>
          <Text style={styles.bubbleTextUser}>{text}</Text>
          {translationText && (
            <TouchableOpacity
              onPress={() => setShowTranslation((v) => !v)}
              activeOpacity={0.6}
              style={[
                styles.langIconBtn,
                showTranslation && styles.langIconBtnActive,
              ]}
            >
              <LangIcon
                color={showTranslation ? "#007AFF" : "rgba(255,255,255,0.7)"}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Translation text inside bubble */}
        {showTranslation && translationText && (
          <View style={styles.inlineSeparator} />
        )}
        {showTranslation && translationText && (
          <Text style={styles.inlineTranslationUser}>{translationText}</Text>
        )}

        {/* Correction toggle inside bubble */}
        {hasCorrection && (
          <TouchableOpacity
            onPress={() => setShowCorrection((v) => !v)}
            activeOpacity={0.7}
            style={styles.correctionToggleBtn}
          >
            <Text style={styles.correctionToggleText}>
              {showCorrection ? "Hide correction" : "✎ Show correction"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Correction box — outside bubble, below */}
      {showCorrection && tutor?.correction && (
        <View style={styles.userCorrectionBox}>
          <Text style={styles.correctionLabel}>Corrected</Text>
          <Text style={styles.correctionFixed}>
            {tutor.correction.corrected}
          </Text>
          {tutor.correction.error_candidates.map((e, i) => (
            <View key={i} style={styles.errorItem}>
              <View style={styles.errorItemHeader}>
                <Text style={styles.errorWord}>&quot;{e.word}&quot;</Text>
                <Text style={styles.errorType}>{e.error_type}</Text>
              </View>
              <Text style={styles.errorSuggestion}>
                → {e.suggested_correction}
              </Text>
              <Text style={styles.errorExplanation}>{e.explanation}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function TutorBubble({ tutor }: { tutor: TutorResponse }) {
  const [showTranslation, setShowTranslation] = useState(false);

  return (
    <View style={styles.tutorBubbleWrapper}>
      <View style={styles.bubbleTutor}>
        <View style={styles.bubbleInnerRow}>
          <Text style={styles.bubbleTextTutor}>{tutor.response_spanish}</Text>
          <TouchableOpacity
            onPress={() => setShowTranslation((v) => !v)}
            activeOpacity={0.6}
            style={[
              styles.langIconBtn,
              showTranslation && styles.langIconBtnActiveTutor,
            ]}
          >
            <LangIcon color={showTranslation ? "#007AFF" : "#8E8E93"} />
          </TouchableOpacity>
        </View>

        {/* Translation text inside bubble */}
        {showTranslation && <View style={styles.inlineSeparator} />}
        {showTranslation && (
          <Text style={styles.inlineTranslationTutor}>
            {tutor.response_english}
          </Text>
        )}
      </View>
    </View>
  );
}

function LoadingBubble() {
  return (
    <View style={styles.messageRowTutor}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>T</Text>
      </View>
      <View
        style={[
          styles.bubbleTutor,
          { paddingHorizontal: 16, paddingVertical: 12 },
        ]}
      >
        <ActivityIndicator size="small" color="#8E8E93" />
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { topics, episode } = useLocalSearchParams<{
    topics?: string;
    episode?: string;
  }>();
  const topicList = topics ? JSON.parse(topics as string) : [];
  const topicNames = topicList.map((t: any) => t.display_name);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      type: "tutor",
      time: getTime(),
      tutor: {
        input_spanish: "",
        input_english: "",
        input_language: "english",
        response_spanish: `Suggested topics based on vocabulary: ${topicNames.join(", ")}`,
        response_english:
          "Hi! I'm your Spanish tutor. What do you want to talk about today?",
        correction: null,
      },
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const pendingUserMessageIdRef = useRef<string | null>(null);
  const initializedEpisodeRef = useRef(false);

  const scrollToBottom = () =>
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

  useEffect(() => {
    const socket = new WebSocket(getWebSocketUrl());
    socketRef.current = socket;

    socket.onopen = () => {
      setSocketReady(true);

      if (episode && !initializedEpisodeRef.current) {
        socket.send(
          JSON.stringify({
            type: "set_episode",
            episode: Number(episode),
          }),
        );
        initializedEpisodeRef.current = true;
      }
    };

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);

      if (payload.type === "chat_response") {
        const userMessageId = pendingUserMessageIdRef.current;

        const tutorMsg: Message = {
          id: (Date.now() + 1).toString(),
          type: "tutor",
          tutor: payload.data.tutor_response,
          time: getTime(),
        };

        setMessages((prev) => {
          const updated = prev
            .filter((m) => m.id !== "loading")
            .map((m) =>
              m.id === userMessageId
                ? { ...m, tutor: payload.data.tutor_response }
                : m,
            );

          return [...updated, tutorMsg];
        });

        pendingUserMessageIdRef.current = null;
        setLoading(false);
        scrollToBottom();
        return;
      }

      if (payload.type === "error") {
        pendingUserMessageIdRef.current = null;
        setLoading(false);
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== "loading"),
          {
            id: (Date.now() + 1).toString(),
            type: "tutor",
            time: getTime(),
            tutor: {
              input_spanish: "",
              input_english: "",
              input_language: "unknown",
              response_spanish:
                "Lo siento, hubo un error. Por favor intenta de nuevo.",
              response_english:
                payload.message ?? "Sorry, there was an error. Please try again.",
              correction: null,
            },
          },
        ]);
        scrollToBottom();
      }
    };

    socket.onerror = () => {
      setSocketReady(false);
    };

    socket.onclose = () => {
      setSocketReady(false);
      socketRef.current = null;
    };

    return () => {
      socket.close();
    };
  }, [episode]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: Message = {
      id: Date.now().toString(),
      type: "user",
      text,
      time: getTime(),
    };
    const loadingMsg: Message = { id: "loading", type: "loading" };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setLoading(true);
    pendingUserMessageIdRef.current = userMsg.id;
    scrollToBottom();

    try {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        throw new Error("Socket is not connected.");
      }

      socketRef.current.send(
        JSON.stringify({
          type: "chat",
          user_sentence: text,
        }),
      );
    } catch {
      pendingUserMessageIdRef.current = null;
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: "tutor",
        time: getTime(),
        tutor: {
          input_spanish: "",
          input_english: "",
          input_language: "unknown",
          response_spanish:
            "Lo siento, hubo un error. Por favor intenta de nuevo.",
          response_english: "Sorry, there was an error. Please try again.",
          correction: null,
        },
      };
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "loading"),
        errMsg,
      ]);
      setLoading(false);
      scrollToBottom();
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    if (item.type === "loading") return <LoadingBubble />;

    if (item.type === "user") {
      return (
        <View style={styles.messageRowUser}>
          <UserBubble text={item.text} tutor={item.tutor} />
          <Text style={styles.timeTextUser}>{item.time}</Text>
        </View>
      );
    }

    return (
      <View style={styles.messageRowTutor}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>T</Text>
        </View>
        <View style={{ flex: 1 }}>
          <TutorBubble tutor={item.tutor} />
          <Text style={styles.timeTextTutor}>{item.time}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>T</Text>
        </View>
        <View>
          <Text style={styles.headerName}>LT Tutor</Text>
          <Text style={styles.headerStatus}>Always here to help</Text>
        </View>
      </View>
      <View style={styles.divider} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

        <View style={styles.inputBar}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Write in Spanish or English…"
              placeholderTextColor="#C7C7CC"
              multiline
              maxLength={500}
              editable={!loading}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendBtn,
              input.trim() && !loading && socketReady
                ? styles.sendBtnActive
                : styles.sendBtnInactive,
            ]}
            onPress={sendMessage}
            disabled={!input.trim() || loading || !socketReady}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatarText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  headerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    letterSpacing: -0.3,
  },
  headerStatus: { fontSize: 12, color: "#8E8E93" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#C6C6C8" },

  messagesList: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },

  messageRowUser: { alignItems: "flex-end", marginBottom: 2 },
  userBubbleWrapper: { alignItems: "flex-end", gap: 5, maxWidth: "80%" },
  bubbleUser: {
    backgroundColor: "#007AFF",
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleTextUser: {
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 21,
    letterSpacing: -0.2,
    flex: 1,
  },
  timeTextUser: {
    fontSize: 11,
    color: "#8E8E93",
    marginTop: 3,
    marginRight: 4,
  },

  messageRowTutor: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  avatarText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  tutorBubbleWrapper: { flex: 1, gap: 6 },
  bubbleTutor: {
    backgroundColor: "#F2F2F7",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignSelf: "flex-start",
  },
  bubbleTextTutor: {
    fontSize: 16,
    color: "#000000",
    lineHeight: 21,
    letterSpacing: -0.2,
    flex: 1,
  },
  timeTextTutor: {
    fontSize: 11,
    color: "#8E8E93",
    marginTop: 3,
    marginLeft: 4,
  },

  bubbleInnerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  langIconBtn: {
    padding: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  langIconBtnActive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  langIconBtnActiveTutor: {
    backgroundColor: "rgba(0,122,255,0.1)",
  },
  inlineSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginVertical: 7,
  },
  inlineTranslationUser: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    fontStyle: "italic",
    lineHeight: 19,
  },
  inlineTranslationTutor: {
    fontSize: 14,
    color: "#636366",
    fontStyle: "italic",
    lineHeight: 19,
  },
  correctionToggleBtn: {
    marginTop: 6,
    alignSelf: "flex-start",
  },
  correctionToggleText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
  },

  userCorrectionBox: {
    backgroundColor: "#FFF9EC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFD60A",
    padding: 10,
    gap: 4,
    alignSelf: "stretch",
  },
  correctionLabel: {
    fontSize: 11,
    color: "#8E8E93",
    fontWeight: "500",
    marginTop: 4,
  },
  correctionFixed: { fontSize: 14, color: "#34C759", fontWeight: "500" },
  errorItem: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#FFD60A",
    paddingTop: 6,
    gap: 2,
  },
  errorItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorWord: { fontSize: 13, fontWeight: "600", color: "#3C3C43" },
  errorType: {
    fontSize: 11,
    color: "#FF9500",
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  errorSuggestion: { fontSize: 13, color: "#34C759", fontWeight: "500" },
  errorExplanation: { fontSize: 12, color: "#636366", lineHeight: 17 },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === "ios" ? 8 : 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#C6C6C8",
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#C6C6C8",
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 38,
    justifyContent: "center",
  },
  input: {
    fontSize: 16,
    color: "#000000",
    letterSpacing: -0.2,
    maxHeight: 100,
    padding: 0,
    margin: 0,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 3,
  },
  sendBtnActive: { backgroundColor: "#007AFF" },
  sendBtnInactive: { backgroundColor: "#E5E5EA" },
  sendIcon: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
  },
});
