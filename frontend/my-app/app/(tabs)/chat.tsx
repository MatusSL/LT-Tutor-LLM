import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
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
import type { AudioPlayer, AudioStatus } from "expo-audio";
import { File as FSFile, Paths } from "expo-file-system";

import {
  checkTutorServer,
  requestEpisodeTopics,
  requestSavedEpisodeTopics,
  sendChatMessage,
  transcribeAudio,
  requestCurrentEpisode,
} from "@/services/tutor-api";
import { C } from "@/constants/colors";
import { buildIntroMessage, type Message, type SetupStep, type Topic } from "@/components/chat/types";
import { RecordingIndicator } from "@/components/chat/RecordingIndicator";
import { UserBubble } from "@/components/chat/UserBubble";
import { TutorBubble } from "@/components/chat/TutorBubble";
import { LoadingBubble } from "@/components/chat/LoadingBubble";
import { SetupCard } from "@/components/chat/SetupCard";
import { EpisodeSelector } from "@/components/chat/EpisodeSelector";


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
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [language, setLanguage] = useState<"es"|"en">("es")

  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    const fetchCurrentEpisode = async () => {
      setSetupLoading(true);
      try {
        const payload = await requestCurrentEpisode();
        setSelectedEpisode(payload.episode);
      } catch {
        setSetupError("Could not load current episode");
      } finally {
        setSetupLoading(false);
      }
    };
    void fetchCurrentEpisode();
  }, []);

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
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardWillHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const scrollToBottom = () =>
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

  const stopAudio = () => {
    if (webAudioRef.current) {
      webAudioRef.current.pause();
      webAudioRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.remove();
      playerRef.current = null;
    }
    setPlayingMessageId(null);
  };

  const playResponseAudio = async (base64Audio: string, messageId: string) => {
    try {
      const binaryStr = atob(base64Audio);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      if (Platform.OS === "web") {
        if (webAudioRef.current) {
          webAudioRef.current.pause();
          webAudioRef.current = null;
        }
        const blob = new Blob([bytes], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        const audio = new window.Audio(url);
        webAudioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          webAudioRef.current = null;
          setPlayingMessageId(null);
        };
        setPlayingMessageId(messageId);
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
      player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        if (status.didJustFinish) setPlayingMessageId(null);
      });
      player.play();
      setPlayingMessageId(messageId);
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
      const text = await transcribeAudio(uri, language);
      setIsTranscribing(false);
      if (text.trim()) await sendMessageWithText(text);
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
    if (isRecording) void stopRecording();
    else void startRecording();
  };

  const applyEpisodeTopics = (payload: { episode: number; topics?: { topics?: Topic[] } }) => {
    const topicNames = (payload.topics?.topics ?? []).map((t) => t.display_name);
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
      setSetupError(error instanceof Error ? error.message : "Could not connect to the tutor server.");
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
      setSetupError(error instanceof Error ? error.message : "Could not connect to the tutor server.");
    }
  };

  const sendMessageWithText = async (text: string) => {
    if (!text || sendingMessage || setupStep !== "chat") return;

    const userMessage: Message = { id: Date.now().toString(), type: "user", text };
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
        audio: payload.response_audio,
      };

      setMessages((prev) => {
        const updated = prev
          .filter((m) => m.id !== "loading")
          .map((m) => m.id === userMessage.id ? { ...m, tutor: payload.tutor_response } : m);
        return [...updated, tutorMessage];
      });

      setSendingMessage(false);
      scrollToBottom();

      if (payload.response_audio)
        void playResponseAudio(payload.response_audio, tutorMessage.id);
      
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
            response_english: error instanceof Error ? error.message : "Sorry, there was an error. Please try again.",
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
          <TutorBubble
          tutor={item.tutor}
          onTranslate={scrollToBottom}
          onPlay={item.audio ? () => void playResponseAudio(item.audio!, item.id) : undefined}
          onStop={item.audio ? stopAudio : undefined}
          isPlaying={playingMessageId === item.id}
        />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" />

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
          onSkip={() => void initializeChatFromSavedEpisode()}
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
          onBack={() => { setSetupError(null); setSetupStep("options"); }}
          onConfirm={() => void initializeChatFromSelection()}
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
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
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
                <TouchableOpacity
                  style={styles.keyboardToggleBtn}
                  onPress={() => setShowKeyboard(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mic" size={20} color={C.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.tapToTypeBtn}
                  onPress={() => { setInputActive(true); setTimeout(() => inputRef.current?.focus(), 50); }}
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
                    style={[styles.actionBtn, !sendingMessage && serverReady ? styles.sendBtnActive : styles.actionBtnInactive]}
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
                <TouchableOpacity
                  style={styles.keyboardToggleBtn}
                  onPress={() => setShowKeyboard(true)}
                  activeOpacity={0.7}
                  disabled={sendingMessage || !serverReady}
                >
                  <Ionicons name="keypad-outline" size={22} color={C.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.centerMicBtn, (!serverReady || isTranscribing) && styles.actionBtnInactive]}
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
                <TouchableOpacity
                  style={styles.langToggleBtn}
                  onPress={() => setLanguage((l) => (l === "es" ? "en" : "es"))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.langToggleText}>{language == "es" ? "ES" : "EN"}</Text>
                </TouchableOpacity>
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
    alignItems: "center",
    marginBottom: 4,
    marginTop: 4,
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
    marginTop: 2,
  },
  avatarText: {
    color: C.accent,
    fontWeight: "700",
    fontSize: 13,
  },
  inputArea: {
    minHeight: 90,
    backgroundColor: C.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 38
  },
  voiceBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
    flex: 1,
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
  langToggleBtn: {
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
  langToggleText: {
    color: C.text.secondary,
    fontSize: 17,
  }
});
