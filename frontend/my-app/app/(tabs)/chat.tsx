import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { File as FSFile, Paths } from "expo-file-system";

import {
  checkTutorServer,
  requestEpisodeTopics,
  requestSavedEpisodeTopics,
  sendChatMessage,
  transcribeAudio,
} from "@/services/tutor-api";

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
      time: string;
      tutor?: TutorResponse;
    }
  | { id: string; type: "tutor"; tutor: TutorResponse; time: string }
  | { id: string; type: "loading" };

type SetupStep = "options" | "selectEpisodes" | "chat";

const EPISODE_COUNT = 90;

const getTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const buildIntroMessage = (topicNames: string[]): Message => ({
  id: "0",
  type: "tutor",
  time: getTime(),
  tutor: {
    input_spanish: "",
    input_english: "",
    input_language: "english",
    response_spanish:
      topicNames.length > 0
        ? `Temas sugeridos: ${topicNames.join(", ")}`
        : "Hola, estoy listo para practicar contigo.",
    response_english:
      topicNames.length > 0
        ? `Suggested topics based on your vocabulary: ${topicNames.join(", ")}`
        : "Hi, I am ready to practice with you.",
    correction: null,
  },
});

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
              onPress={() => setShowTranslation((value) => !value)}
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

        {showTranslation && translationText && <View style={styles.inlineSeparator} />}
        {showTranslation && translationText && (
          <Text style={styles.inlineTranslationUser}>{translationText}</Text>
        )}

        {hasCorrection && (
          <TouchableOpacity
            onPress={() => setShowCorrection((value) => !value)}
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
          {tutor.correction.error_candidates.map((errorCandidate, index) => (
            <View key={index} style={styles.errorItem}>
              <View style={styles.errorItemHeader}>
                <Text style={styles.errorWord}>
                  &quot;{errorCandidate.word}&quot;
                </Text>
                <Text style={styles.errorType}>{errorCandidate.error_type}</Text>
              </View>
              <Text style={styles.errorSuggestion}>
                {errorCandidate.suggested_correction}
              </Text>
              <Text style={styles.errorExplanation}>
                {errorCandidate.explanation}
              </Text>
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
            onPress={() => setShowTranslation((value) => !value)}
            activeOpacity={0.6}
            style={[
              styles.langIconBtn,
              showTranslation && styles.langIconBtnActiveTutor,
            ]}
          >
            <LangIcon color={showTranslation ? "#007AFF" : "#8E8E93"} />
          </TouchableOpacity>
        </View>

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
      <View style={[styles.bubbleTutor, styles.loadingBubble]}>
        <ActivityIndicator size="small" color="#8E8E93" />
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
            <ActivityIndicator size="small" color="#0071E3" />
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
  const episodes = Array.from({ length: EPISODE_COUNT }, (_, index) => index + 1);

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
          <ActivityIndicator size="small" color="#0071E3" />
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
  const [setupLoading, setSetupLoading] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(0);
  const [activeEpisode, setActiveEpisode] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const scrollToBottom = () =>
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

  const playResponseAudio = async (base64Audio: string) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const binaryStr = atob(base64Audio);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const audioFile = new FSFile(Paths.cache, "tutor_response.mp3");
      audioFile.write(bytes);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri: audioFile.uri });
      soundRef.current = sound;
      await sound.playAsync();
    } catch {
      // Non-critical — silently ignore playback errors
    }
  };

  const startRecording = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") return;
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    recordingRef.current = recording;
    setIsRecording(true);
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    setIsTranscribing(true);
    await recordingRef.current.stopAndUnloadAsync();
    const uri = recordingRef.current.getURI();
    recordingRef.current = null;
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
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

        if (!active) {
          return;
        }

        setServerReady(isHealthy);
        setSetupError(isHealthy ? null : "Could not connect to the tutor server.");
      } catch {
        if (!active) {
          return;
        }

        setServerReady(false);
        setSetupError("Could not connect to the tutor server.");
      }
    };

    void connect();

    return () => {
      active = false;
    };
  }, []);

  const applyEpisodeTopics = (payload: { episode: number; topics?: { topics?: Topic[] } }) => {
    const topics: Topic[] = payload.topics?.topics ?? [];
    const topicNames = topics.map((topic) => topic.display_name);

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
        error instanceof Error
          ? error.message
          : "Could not connect to the tutor server.",
      );
    }
  };

  const initializeChatFromSelection = async () => {
    if (selectedEpisode === 0) {
      return;
    }

    setSetupError(null);
    setSetupLoading(true);

    try {
      const payload = await requestEpisodeTopics(selectedEpisode);
      applyEpisodeTopics(payload);
    } catch (error) {
      setSetupLoading(false);
      setSetupError(
        error instanceof Error
          ? error.message
          : "Could not connect to the tutor server.",
      );
    }
  };

  const sendMessageWithText = async (text: string) => {
    if (!text || sendingMessage || setupStep !== "chat") return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      text,
      time: getTime(),
    };
    const loadingMessage: Message = { id: "loading", type: "loading" };

    setMessages((previous) => [...previous, userMessage, loadingMessage]);
    setSendingMessage(true);
    scrollToBottom();

    try {
      const payload = await sendChatMessage(text);

      const tutorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "tutor",
        tutor: payload.tutor_response,
        time: getTime(),
      };

      setMessages((previous) => {
        const updated = previous
          .filter((message) => message.id !== "loading")
          .map((message) =>
            message.id === userMessage.id
              ? { ...message, tutor: payload.tutor_response }
              : message,
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
      setMessages((previous) => [
        ...previous.filter((message) => message.id !== "loading"),
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
    if (item.type === "loading") {
      return <LoadingBubble />;
    }

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
        <View style={styles.tutorColumn}>
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
          <Text style={styles.headerStatus}>
            {setupStep === "chat" && activeEpisode
              ? `Episode ${activeEpisode} ready`
              : "Always here to help"}
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
            <TouchableOpacity
              style={[
                styles.sendBtn,
                input.trim() && !sendingMessage && serverReady
                  ? styles.sendBtnActive
                  : styles.sendBtnInactive,
              ]}
              onPress={sendMessage}
              disabled={!input.trim() || sendingMessage || !serverReady}
            >
              <Text style={styles.sendIcon}>↑</Text>
            </TouchableOpacity>
            
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Write or speak in Spanish or English..."
                placeholderTextColor="#C7C7CC"
                multiline
                maxLength={500}
                editable={!sendingMessage && !isRecording && serverReady}
              />
             </View>
      
            <TouchableOpacity
              style={[
                styles.micBtn,
                isRecording ? styles.micBtnActive : styles.micBtnInactive,
              ]}
              onPress={toggleRecording}
              disabled={sendingMessage || isTranscribing || !serverReady}
            >
              {isTranscribing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name={isRecording ? "stop" : "mic"}
                  size={20}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>
            
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0071E3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerAvatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 18,
  },
  headerName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  headerStatus: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E5EA",
  },
  setupBody: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  setupCard: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: "#F7F9FC",
  },
  setupEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#0071E3",
    marginBottom: 10,
  },
  setupTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    color: "#1D1D1F",
    marginBottom: 10,
  },
  setupText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4B5563",
    marginBottom: 24,
  },
  primaryAction: {
    backgroundColor: "#0071E3",
    borderRadius: 16,
    paddingVertical: 16,
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
    borderColor: "#D1D5DB",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryActionText: {
    color: "#1D1D1F",
    fontSize: 16,
    fontWeight: "600",
  },
  actionDisabled: {
    opacity: 0.5,
  },
  setupHint: {
    marginTop: 16,
    color: "#6B7280",
    fontSize: 14,
  },
  setupError: {
    marginTop: 14,
    color: "#B42318",
    fontSize: 14,
    lineHeight: 20,
  },
  setupLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
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
    color: "#0071E3",
    fontSize: 16,
    fontWeight: "600",
  },
  selectorTitle: {
    color: "#1D1D1F",
    fontSize: 18,
    fontWeight: "700",
  },
  confirmButton: {
    color: "#0071E3",
    fontSize: 16,
    fontWeight: "700",
  },
  confirmButtonDisabled: {
    color: "#A1A1AA",
  },
  selectorSubtitle: {
    color: "#6B7280",
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
    borderBottomWidth: 1,
    borderColor: "#EEEFF2",
  },
  rowText: {
    fontSize: 16,
    color: "#1D1D1F",
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  circleUnselected: {
    borderColor: "#9CA3AF",
    backgroundColor: "transparent",
  },
  circleSelected: {
    borderColor: "#0071E3",
    backgroundColor: "#0071E3",
  },
  chatBody: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5F1FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 18,
  },
  avatarText: {
    color: "#0071E3",
    fontWeight: "700",
    fontSize: 14,
  },
  tutorBubbleWrapper: {
    maxWidth: "88%",
  },
  userBubbleWrapper: {
    maxWidth: "88%",
  },
  bubbleTutor: {
    backgroundColor: "#F2F2F7",
    borderRadius: 22,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: "#0071E3",
    borderRadius: 22,
    borderBottomRightRadius: 8,
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
    color: "#1C1C1E",
    fontSize: 16,
    lineHeight: 22,
  },
  bubbleTextUser: {
    flex: 1,
    color: "#FFFFFF",
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
  langIconBtnActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  langIconBtnActiveTutor: {
    backgroundColor: "#E5EFFF",
  },
  inlineSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginVertical: 8,
  },
  inlineTranslationTutor: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 20,
  },
  inlineTranslationUser: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    lineHeight: 20,
  },
  correctionToggleBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
  },
  correctionToggleText: {
    color: "#DCEBFF",
    fontSize: 13,
    fontWeight: "600",
  },
  userCorrectionBox: {
    marginTop: 8,
    backgroundColor: "#F7F9FC",
    borderRadius: 18,
    padding: 14,
  },
  correctionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#6B7280",
    marginBottom: 6,
  },
  correctionFixed: {
    fontSize: 16,
    color: "#1D1D1F",
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
    color: "#111827",
    fontWeight: "600",
  },
  errorType: {
    color: "#6B7280",
    textTransform: "capitalize",
  },
  errorSuggestion: {
    color: "#0071E3",
    fontWeight: "600",
    marginBottom: 2,
  },
  errorExplanation: {
    color: "#4B5563",
    lineHeight: 20,
  },
  timeTextTutor: {
    color: "#8E8E93",
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
  timeTextUser: {
    color: "#8E8E93",
    fontSize: 11,
    marginTop: 4,
    marginRight: 4,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 24 : 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5EA",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  micBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  micBtnInactive: {
    backgroundColor: "#8E8E93",
  },
  micBtnActive: {
    backgroundColor: "#FF3B30",
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
  },
  input: {
    fontSize: 16,
    color: "#1C1C1E",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnActive: {
    backgroundColor: "#0071E3",
  },
  sendBtnInactive: {
    backgroundColor: "#D1D5DB",
  },
  sendIcon: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginTop: -2,
  },
});
