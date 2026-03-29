import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  RecordingPresets,
} from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import { File as FSFile, Paths } from "expo-file-system";

import {
  checkTutorServer,
  requestEpisodeTopics,
  requestSavedEpisodeTopics,
  sendChatMessage,
  transcribeAudio,
} from "@/services/tutor-api";

const C = {
  bg: "#0F0F13",
  surface: "#1A1A24",
  surfaceAlt: "#22222F",
  border: "rgba(255,255,255,0.07)",
  accent: "#6C63FF",
  accentSoft: "rgba(108,99,255,0.15)",
  bubble: { out: "#6C63FF", outText: "#FFFFFF", in: "#22222F", inText: "#E8E8F0" },
  text: { primary: "#E8E8F0", secondary: "#888899", hint: "#555566" },
  record: "#FF4B6E",
  recordBg: "rgba(255,75,110,0.12)",
  green: "#22C55E",
};

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

type Topic = {
  display_name: string;
};

type Message =
  | {
      id: string;
      type: "user";
      text: string;
      tutor?: TutorResponse;
    }
  | { id: string; type: "tutor"; tutor: TutorResponse;}
  | { id: string; type: "loading" };

type SetupStep = "options" | "selectEpisodes" | "chat";

const EPISODE_COUNT = 90;

const getTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const buildIntroMessage = (topicNames: string[]): Message => ({
  id: "0",
  type: "tutor",
  tutor: {
    input_spanish: "",
    input_english: "",
    input_language: "english",
    response_spanish:
      topicNames.length > 0
        ? `Temas sugeridos: ${topicNames.join(", ")}`
        : "Hola, ¿qué tal? ¿De qué quieres hablar hoy?",
    response_english:
      topicNames.length > 0
        ? `Suggested topics based on your vocabulary: ${topicNames.join(", ")}`
        : "Hey, what's up? What do you want to talk about today?",
    correction: null,
  },
});

function formatDuration(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function LangIcon({ color }: { color: string }) {
  return <Ionicons name="language" size={16} color={color} />;
}

function RecordingIndicator({
  seconds,
  onStop,
  onCancel,
}: {
  seconds: number;
  onStop: () => void;
  onCancel: () => void;
}) {
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
      <TouchableOpacity onPress={onCancel} style={styles.recordCancelBtn}>
        <Ionicons name="close" size={20} color={C.text.secondary} />
      </TouchableOpacity>

      <View style={styles.recordingWaveRow}>
        <View style={styles.recordDot} />
        {bars.map((h, i) => (
          <View key={i} style={[styles.waveBar, { height: Math.max(6, h * 32) }]} />
        ))}
      </View>

      <Text style={styles.recordTimer}>{formatDuration(seconds)}</Text>

      <TouchableOpacity onPress={onStop} style={styles.recordStopBtn}>
        <View style={styles.recordStopSquare} />
      </TouchableOpacity>
    </View>
  );
}

function UserBubble({ text, tutor, onTranslate }: { text: string; tutor?: TutorResponse; onTranslate?: () => void }) {
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
              onPress={() => {
                const next = !showTranslation;
                setShowTranslation(next);
                if (next) onTranslate?.();
              }}
              activeOpacity={0.6}
              style={[styles.langIconBtn, showTranslation && styles.langIconBtnActiveUser]}
            >
              <LangIcon
                color={showTranslation ? "#FFFFFF" : "rgba(255,255,255,0.55)"}
              />
            </TouchableOpacity>
          )}
        </View>

        {showTranslation && translationText && (
          <View style={styles.inlineSeparatorUser} />
        )}
        {showTranslation && translationText && (
          <Text style={styles.inlineTranslationUser}>{translationText}</Text>
        )}

        {hasCorrection && (
          <TouchableOpacity
            onPress={() => setShowCorrection((v) => !v)}
            activeOpacity={0.7}
            style={styles.correctionToggleBtn}
          >
            <Text style={styles.correctionToggleText}>
              {showCorrection ? "Hide correction" : "Show correction"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showCorrection && tutor?.correction && (
        <View style={styles.userCorrectionBox}>
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

function TutorBubble({ tutor, onTranslate }: { tutor: TutorResponse; onTranslate?: () => void }) {
  const [showTranslation, setShowTranslation] = useState(false);

  return (
    <View style={styles.tutorBubbleWrapper}>
      <View style={styles.bubbleTutor}>
        <View style={styles.bubbleInnerRow}>
          <Text style={styles.bubbleTextTutor}>{tutor.response_spanish}</Text>
          <TouchableOpacity
            onPress={() => {
              const next = !showTranslation;
              setShowTranslation(next);
              if (next) onTranslate?.();
            }}
            activeOpacity={0.6}
            style={[styles.langIconBtn, showTranslation && styles.langIconBtnActiveTutor]}
          >
            <LangIcon color={showTranslation ? C.accent : C.text.secondary} />
          </TouchableOpacity>
        </View>

        {showTranslation && <View style={styles.inlineSeparatorTutor} />}
        {showTranslation && (
          <Text style={styles.inlineTranslationTutor}>{tutor.response_english}</Text>
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
      <View style={[styles.bubbleTutor, styles.loadingBubble]}>
        <ActivityIndicator size="small" color={C.text.secondary} />
      </View>
    </View>
  );
}

function SetupCard({
  socketReady,
  loading,
  error,
  onSkip,
  onSelectEpisodes,
}: {
  socketReady: boolean;
  loading: boolean;
  error: string | null;
  onSkip: () => void;
  onSelectEpisodes: () => void;
}) {
  return (
    <View style={styles.setupBody}>
      <View style={styles.setupCard}>
        <Text style={styles.setupEyebrow}>Chat Setup</Text>
        <Text style={styles.setupTitle}>Start your practice session</Text>
        <Text style={styles.setupText}>
          Choose how we should build your vocabulary before the chat begins.
        </Text>

        <TouchableOpacity
          style={[styles.primaryAction, (!socketReady || loading) && styles.actionDisabled]}
          onPress={onSelectEpisodes}
          disabled={!socketReady || loading}
        >
          <Text style={styles.primaryActionText}>Select completed episodes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryAction, (!socketReady || loading) && styles.actionDisabled]}
          onPress={onSkip}
          disabled={!socketReady || loading}
        >
          <Text style={styles.secondaryActionText}>Skip</Text>
        </TouchableOpacity>

        {!socketReady && (
          <Text style={styles.setupHint}>Connecting to tutor server...</Text>
        )}
        {loading && (
          <View style={styles.setupLoadingRow}>
            <ActivityIndicator size="small" color={C.accent} />
            <Text style={styles.setupHint}>Preparing your chat...</Text>
          </View>
        )}
        {error && <Text style={styles.setupError}>{error}</Text>}
      </View>
    </View>
  );
}

function EpisodeSelector({
  selectedEpisode,
  loading,
  error,
  onBack,
  onConfirm,
  onSelect,
}: {
  selectedEpisode: number;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: () => void;
  onSelect: (episode: number) => void;
}) {
  const episodes = Array.from({ length: EPISODE_COUNT }, (_, i) => i + 1);

  return (
    <View style={styles.selectorBody}>
      <View style={styles.selectorHeader}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.selectorTitle}>Select completed episodes</Text>
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

      <Text style={styles.selectorSubtitle}>
        Every episode up to your last completed one will be counted as done.
      </Text>

      {loading && (
        <View style={styles.setupLoadingRow}>
          <ActivityIndicator size="small" color={C.accent} />
          <Text style={styles.setupHint}>Building vocabulary...</Text>
        </View>
      )}
      {error && <Text style={styles.setupError}>{error}</Text>}

      <FlatList
        data={episodes}
        keyExtractor={(item) => item.toString()}
        contentContainerStyle={styles.selectorList}
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

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const [setupStep, setSetupStep] = useState<SetupStep>("options");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [inputActive, setInputActive] = useState(false);
  const inputRef = useRef<import("react-native").TextInput>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(0);
  const [activeEpisode, setActiveEpisode] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const flatListRef = useRef<FlatList>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const scrollToBottom = () =>
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

  const playResponseAudio = async (base64Audio: string) => {
    try {
      const binaryStr = atob(base64Audio);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      if (Platform.OS === "web") {
        const blob = new Blob([bytes], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        const audio = new window.Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
        return;
      }

      if (playerRef.current) {
        playerRef.current.remove();
        playerRef.current = null;
      }
      const audioFile = new FSFile(Paths.cache, "tutor_response.mp3");
      audioFile.write(bytes);
      await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "doNotMix", allowsRecording: false, shouldPlayInBackground: false, shouldRouteThroughEarpiece: false });
      const player = createAudioPlayer({ uri: audioFile.uri });
      playerRef.current = player;
      player.play();
    } catch {
      // Non-critical — silently ignore playback errors
    }
  };

  const startRecording = async () => {
    const { status } = await requestRecordingPermissionsAsync();
    if (status !== "granted") return;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, interruptionMode: "doNotMix", shouldPlayInBackground: false, shouldRouteThroughEarpiece: false });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setIsRecording(true);
    setRecordSecs(0);
    recordTimerRef.current = setInterval(() => setRecordSecs((s) => s + 1), 1000);
  };

  const stopRecording = async () => {
    if (!recorder.isRecording) return;
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordSecs(0);
    setIsTranscribing(true);
    await recorder.stop();
    const uri = recorder.uri;
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, interruptionMode: "doNotMix", shouldPlayInBackground: false, shouldRouteThroughEarpiece: false });
    if (!uri) {
      setIsTranscribing(false);
      return;
    }
    try {
      const text = await transcribeAudio(uri);
      setIsTranscribing(false);
      if (text.trim()) {
        await sendMessageWithText(text);
      }
    } catch {
      setIsTranscribing(false);
    }
  };

  const cancelRecording = async () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (recorder.isRecording) {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, interruptionMode: "doNotMix", shouldPlayInBackground: false, shouldRouteThroughEarpiece: false });
    }
    setIsRecording(false);
    setRecordSecs(0);
  };

  const toggleRecording = () => {
    if (isRecording) {
      void stopRecording();
    } else {
      void startRecording();
    }
  };

  useEffect(() => {
    let active = true;

    const connect = async () => {
      try {
        const isHealthy = await checkTutorServer();
        if (!active) return;
        setServerReady(isHealthy);
        setSetupError(isHealthy ? null : "Could not connect to the tutor server.");
      } catch {
        if (!active) return;
        setServerReady(false);
        setSetupError("Could not connect to the tutor server.");
      }
    };

    void connect();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardWillHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const applyEpisodeTopics = (payload: {
    episode: number;
    topics?: { topics?: Topic[] };
  }) => {
    const topics: Topic[] = payload.topics?.topics ?? [];
    const topicNames = topics.map((t) => t.display_name);
    setActiveEpisode(payload.episode);
    setSelectedEpisode(payload.episode);
    setMessages([buildIntroMessage(topicNames)]);
    setSetupLoading(false);
    setSetupError(null);
    setSetupStep("chat");
  };

  const initializeChatFromSavedEpisode = async () => {
    setSetupError(null);
    setSetupLoading(true);
    try {
      const payload = await requestSavedEpisodeTopics();
      applyEpisodeTopics(payload);
    } catch (error) {
      setSetupLoading(false);
      setSetupError(
        error instanceof Error ? error.message : "Could not connect to the tutor server.",
      );
    }
  };

  const initializeChatFromSelection = async () => {
    if (selectedEpisode === 0) return;
    setSetupError(null);
    setSetupLoading(true);
    try {
      const payload = await requestEpisodeTopics(selectedEpisode);
      applyEpisodeTopics(payload);
    } catch (error) {
      setSetupLoading(false);
      setSetupError(
        error instanceof Error ? error.message : "Could not connect to the tutor server.",
      );
    }
  };

  const sendMessageWithText = async (text: string) => {
    if (!text || sendingMessage || setupStep !== "chat") return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      text,
    };
    const loadingMessage: Message = { id: "loading", type: "loading" };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setSendingMessage(true);
    scrollToBottom();

    try {
      const payload = await sendChatMessage(text);
      const tutorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "tutor",
        tutor: payload.tutor_response,
      };

      setMessages((prev) => {
        const updated = prev
          .filter((m) => m.id !== "loading")
          .map((m) =>
            m.id === userMessage.id ? { ...m, tutor: payload.tutor_response } : m,
          );
        return [...updated, tutorMessage];
      });

      setSendingMessage(false);
      scrollToBottom();

      if (payload.response_audio) {
        void playResponseAudio(payload.response_audio);
      }
    } catch (error) {
      setSendingMessage(false);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "loading"),
        {
          id: (Date.now() + 1).toString(),
          type: "tutor",
          tutor: {
            input_spanish: "",
            input_english: "",
            input_language: "unknown",
            response_spanish: "Lo siento, hubo un error. Por favor intenta de nuevo.",
            response_english:
              error instanceof Error
                ? error.message
                : "Sorry, there was an error. Please try again.",
            correction: null,
          },
        },
      ]);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendMessageWithText(text);
  };

  const renderItem = ({ item }: { item: Message }) => {
    if (item.type === "loading") return <LoadingBubble />;

    if (item.type === "user") {
      return (
        <View style={styles.messageRowUser}>
          <UserBubble text={item.text} tutor={item.tutor} onTranslate={scrollToBottom} />
        </View>
      );
    }

    return (
      <View style={styles.messageRowTutor}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>T</Text>
        </View>
        <View style={styles.tutorColumn}>
          <TutorBubble tutor={item.tutor} onTranslate={scrollToBottom} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarWrapper}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>LT</Text>
          </View>
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>LT Tutor</Text>
          <Text style={styles.headerStatus}>
            {setupStep === "chat" && activeEpisode
              ? `Episode ${activeEpisode} · active`
              : "Active now"}
          </Text>
        </View>
      </View>
      <View style={styles.divider} />

      {setupStep === "options" && (
        <SetupCard
          socketReady={serverReady}
          loading={setupLoading}
          error={setupError}
          onSkip={initializeChatFromSavedEpisode}
          onSelectEpisodes={() => {
            setSetupError(null);
            setSetupStep("selectEpisodes");
          }}
        />
      )}

      {setupStep === "selectEpisodes" && (
        <EpisodeSelector
          selectedEpisode={selectedEpisode}
          loading={setupLoading}
          error={setupError}
          onBack={() => {
            setSetupError(null);
            setSetupStep("options");
          }}
          onConfirm={initializeChatFromSelection}
          onSelect={setSelectedEpisode}
        />
      )}

      {setupStep === "chat" && (
        <KeyboardAvoidingView
          style={styles.chatBody}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={keyboardVisible ? 0 : 90}
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

          <View style={styles.inputArea}>
            {isRecording && (
              <RecordingIndicator
                seconds={recordSecs}
                onStop={() => void stopRecording()}
                onCancel={() => void cancelRecording()}
              />
            )}

            {!isRecording && showKeyboard && !inputActive && (
              <View style={[styles.voiceBar, { paddingBottom: keyboardVisible ? 8 : insets.bottom + 10 }]}>
                {/* Mic toggle — returns to voice */}
                <TouchableOpacity
                  style={styles.keyboardToggleBtn}
                  onPress={() => setShowKeyboard(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mic" size={20} color={C.text.secondary} />
                </TouchableOpacity>

                {/* Tap-to-type pill */}
                <TouchableOpacity
                  style={styles.tapToTypeBtn}
                  onPress={() => {
                    setInputActive(true);
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  activeOpacity={0.7}
                  disabled={sendingMessage || !serverReady}
                >
                  <Ionicons name="keypad-outline" size={16} color={C.text.hint} style={{ marginRight: 8 }} />
                  <Text style={styles.tapToTypeText}>Tap to type…</Text>
                </TouchableOpacity>
              </View>
            )}

            {!isRecording && showKeyboard && inputActive && (
              <View style={[styles.inputBar, { paddingBottom: keyboardVisible ? 8 : insets.bottom + 8 }]}>
                {/* Mic toggle — left of text input */}
                <TouchableOpacity
                  style={styles.micToggleBtn}
                  onPress={() => { setShowKeyboard(false); setInputActive(false); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mic" size={15} color={C.text.secondary} />
                </TouchableOpacity>

                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={inputRef}
                    style={styles.input}
                    value={input}
                    onChangeText={setInput}
                    placeholder="Write in Spanish or English..."
                    placeholderTextColor={C.text.hint}
                    multiline
                    maxLength={500}
                    editable={!sendingMessage && serverReady}
                    onBlur={() => { if (!input.trim()) setInputActive(false); }}
                  />
                </View>

                {input.trim() && (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      !sendingMessage && serverReady
                        ? styles.sendBtnActive
                        : styles.actionBtnInactive,
                    ]}
                    onPress={() => void sendMessage()}
                    disabled={sendingMessage || !serverReady}
                  >
                    <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!isRecording && !showKeyboard && (
              <View style={[styles.voiceBar, { paddingBottom: keyboardVisible ? 8 : insets.bottom + 10 }]}>
                {/* Keyboard toggle — left of mic */}
                <TouchableOpacity
                  style={styles.keyboardToggleBtn}
                  onPress={() => setShowKeyboard(true)}
                  activeOpacity={0.7}
                  disabled={sendingMessage || !serverReady}
                >
                  <Ionicons name="keypad-outline" size={22} color={C.text.secondary} />
                </TouchableOpacity>

                {/* Centered mic button */}
                <View style={{ flex: 1, alignItems: "center" }}>
                  <TouchableOpacity
                    style={[
                      styles.centerMicBtn,
                      (!serverReady || isTranscribing) && styles.actionBtnInactive,
                    ]}
                    onPress={toggleRecording}
                    disabled={sendingMessage || isTranscribing || !serverReady}
                    activeOpacity={0.8}
                  >
                    {isTranscribing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="mic" size={28} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Right spacer — mirrors left button for true centering */}
                <View style={{ width: 40 }} />
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: C.surface,
    gap: 12,
  },
  avatarWrapper: {
    position: "relative",
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
  },
  onlineDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.green,
    borderWidth: 2,
    borderColor: C.surface,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text.primary,
  },
  headerStatus: {
    fontSize: 12,
    color: C.green,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
  },

  // ── Setup ────────────────────────────────────────────────────────────────────
  setupBody: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  setupCard: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  setupEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.accent,
    marginBottom: 10,
  },
  setupTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    color: C.text.primary,
    marginBottom: 10,
  },
  setupText: {
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
  actionDisabled: {
    opacity: 0.4,
  },
  setupHint: {
    marginTop: 16,
    color: C.text.secondary,
    fontSize: 14,
  },
  setupError: {
    marginTop: 14,
    color: "#FF6B6B",
    fontSize: 14,
    lineHeight: 20,
  },
  setupLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },

  // ── Episode selector ─────────────────────────────────────────────────────────
  selectorBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  selectorHeader: {
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
  selectorTitle: {
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
  selectorSubtitle: {
    color: C.text.secondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  selectorList: {
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

  // ── Chat ──────────────────────────────────────────────────────────────────────
  chatBody: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 12,
  },
  messageRowUser: {
    alignItems: "flex-end",
  },
  messageRowTutor: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  tutorColumn: {
    flex: 1,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 18,
  },
  avatarText: {
    color: C.accent,
    fontWeight: "700",
    fontSize: 13,
  },

  // ── Bubbles ──────────────────────────────────────────────────────────────────
  tutorBubbleWrapper: {
    maxWidth: "88%",
  },
  userBubbleWrapper: {
    maxWidth: "88%",
  },
  bubbleTutor: {
    backgroundColor: C.bubble.in,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: C.bubble.out,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  loadingBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleInnerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bubbleTextTutor: {
    flex: 1,
    color: C.bubble.inText,
    fontSize: 16,
    lineHeight: 22,
  },
  bubbleTextUser: {
    flexShrink: 1,
    color: C.bubble.outText,
    fontSize: 16,
    lineHeight: 22,
  },
  langIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    marginTop: -1,
  },
  langIconBtnActiveUser: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  langIconBtnActiveTutor: {
    backgroundColor: C.accentSoft,
  },
  inlineSeparatorUser: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 8,
  },
  inlineSeparatorTutor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginVertical: 8,
  },
  inlineTranslationTutor: {
    color: C.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  inlineTranslationUser: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    lineHeight: 20,
  },
  correctionToggleBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
  },
  correctionToggleText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  userCorrectionBox: {
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
  timeTextTutor: {
    color: C.text.hint,
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
  timeTextUser: {
    color: C.text.hint,
    fontSize: 11,
    marginTop: 4,
    marginRight: 4,
  },

  // ── Input area ───────────────────────────────────────────────────────────────
  inputArea: {
    minHeight: 100,
    backgroundColor: C.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    justifyContent: "center",
  },
  // Voice-first bar (default)
  voiceBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    flex: 1,
    justifyContent: "flex-start",
  },
  keyboardToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  centerMicBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  tapToTypeBtn: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginLeft: 10,
    backgroundColor: C.surfaceAlt,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    outline: "none",
  },
  tapToTypeText: {
    fontSize: 15,
    color: C.text.hint,
  },

  // Keyboard bar
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
    flex: 1,
    justifyContent: "flex-start",
  },
  micToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: C.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    
  },
  input: {
    fontSize: 15,
    color: C.text.primary,
    outlineWidth: 0,

  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionBtnInactive: {
    opacity: 0.4,
  },
  sendBtnActive: {
    backgroundColor: C.accent,
  },
  micBtnInactive: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: "rgba(255,75,110,0.35)",
  },

  // ── Recording indicator ──────────────────────────────────────────────────────
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 14,
    gap: 10,
  },
  recordCancelBtn: {
    padding: 4,
  },
  recordingWaveRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 36,
  },
  recordDot: {
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
  recordTimer: {
    fontSize: 13,
    color: C.text.secondary,
    minWidth: 34,
  },
  recordStopBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.record,
    alignItems: "center",
    justifyContent: "center",
  },
  recordStopSquare: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
});
