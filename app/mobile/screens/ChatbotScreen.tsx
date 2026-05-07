import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, ActivityIndicator,
  KeyboardAvoidingView, Platform
} from "react-native";
import axios from "axios";
import { API_BASE_URL } from "../constants/api";
import { useTranslation } from "../context/LanguageContext";
import { useRoute } from "@react-navigation/native";
import { DEFAULT_USER_ID, fetchUserProfile } from "../constants/featuresApi";

const COLORS = {
  primary: "#C8522A", background: "#FDF8F3", card: "#FFFFFF",
  text: "#1A1A1A", muted: "#8C8C8C", border: "#E8E0D5", accent: "#F5EDE3",
};

type Message = { role: "user" | "assistant"; content: string };

function getQuickReplies(messages: Message[]): string[] {
  if (messages.length <= 1) {
    return ["What's good for breakfast?", "I'm vegan", "Recommend something", "Book a table"];
  }
  const last = messages[messages.length - 1]?.content?.toLowerCase() || "";
  if (last.includes("order") || last.includes("sandwich") || last.includes("plate")) {
    return ["Add to cart", "Modify order", "What are the ingredients?", "Is it gluten free?"];
  }
  if (last.includes("reserv") || last.includes("table")) {
    return ["Today at 7pm", "Tomorrow at 8pm", "6 guests", "Special requests"];
  }
  if (last.includes("vegan") || last.includes("allerg") || last.includes("halal")) {
    return ["Gluten free options", "Is the meat halal?", "No nuts please", "Breakfast options"];
  }
  return ["Show the menu", "Book a table", "Opening hours", "Place an order"];
}

export default function ChatbotScreen() {
  const { t } = useTranslation();
  const route = useRoute<any>();
  const prefill = route.params?.prefill;
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: t("chatbot.greeting") }
  ]);
  const [input, setInput] = useState(prefill || "");
  const [loading, setLoading] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  useEffect(() => {
    fetchUserProfile(DEFAULT_USER_ID)
      .then((profile) => setVoiceEnabled(Boolean(profile?.voiceEnabled)))
      .catch(() => setVoiceEnabled(false));
  }, []);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setNetworkError(false);
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const history = newMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
      const res = await axios.post(
        `${API_BASE_URL}/chat`,
        { message: text, history, user_id: DEFAULT_USER_ID },
        { timeout: 30000 }
      );
      setMessages(prev => [...prev, { role: "assistant", content: res.data.response }]);
    } catch {
      setNetworkError(true);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I couldn't connect. Please check your connection and try again.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickReplies = [
    ...getQuickReplies(messages).slice(0, 3),
    "Order my usual", "Reorder my last order", "Track my order",
  ];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={s.headerAvatar}><Text style={{ fontSize: 18 }}>🍽️</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{t("chatbot.title")}</Text>
          <Text style={[s.headerSub, networkError && s.headerSubError]}>
            {networkError ? "Connection error" : loading ? "Typing..." : "Always here to help"}
          </Text>
        </View>
        <View style={[s.dot, loading && s.dotTyping, networkError && s.dotError]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          style={s.messages}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 16 }}
        >
          {messages.map((msg, i) => (
            <View key={i} style={[s.bubbleRow, msg.role === "user" && s.bubbleRowUser]}>
              {msg.role === "assistant" && (
                <View style={s.avatar}><Text style={{ fontSize: 14 }}>🍽️</Text></View>
              )}
              <View style={[s.bubble, msg.role === "user" ? s.bubbleUser : s.bubbleBot]}>
                <Text style={[s.bubbleText, msg.role === "user" && s.bubbleTextUser]}>
                  {msg.content}
                </Text>
              </View>
            </View>
          ))}
          {loading && (
            <View style={s.bubbleRow}>
              <View style={s.avatar}><Text style={{ fontSize: 14 }}>🍽️</Text></View>
              <View style={[s.bubble, s.bubbleBot, s.typingBubble]}>
                <View style={s.typingDots}>
                  <View style={[s.typingDot, { opacity: 1 }]} />
                  <View style={[s.typingDot, { opacity: 0.6 }]} />
                  <View style={[s.typingDot, { opacity: 0.3 }]} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickRow}>
          {quickReplies.map((qr, i) => (
            <TouchableOpacity key={i} style={s.quickBtn} onPress={() => send(qr)} disabled={loading}>
              <Text style={s.quickText}>{qr}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={s.inputRow}>
          {voiceEnabled && (
            <TouchableOpacity
              style={s.voiceBtn}
              onPress={() => {
                setInput((prev: string) => `${prev}${prev ? " " : ""}voice order input`);
              }}
            >
              <Text style={s.voiceIcon}>🎙️</Text>
            </TouchableOpacity>
          )}
          <TextInput
            style={s.input}
            placeholder={t("chatbot.placeholder")}
            placeholderTextColor={COLORS.muted}
            value={input}
            onChangeText={setInput}
            multiline
            textAlign="left"
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnDisabled]}
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.sendIcon}>↑</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  headerSub: { fontSize: 12, color: "#4CAF50" },
  headerSubError: { color: "#E53E3E" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4CAF50" },
  dotTyping: { backgroundColor: COLORS.primary },
  dotError: { backgroundColor: "#E53E3E" },
  messages: { flex: 1, paddingHorizontal: 16 },
  bubbleRow: { flexDirection: "row", marginBottom: 12, alignItems: "flex-end", gap: 8 },
  bubbleRowUser: { flexDirection: "row-reverse" },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" },
  bubble: { maxWidth: "75%", borderRadius: 16, padding: 12 },
  bubbleBot: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  bubbleTextUser: { color: "#fff" },
  typingBubble: { paddingVertical: 14 },
  typingDots: { flexDirection: "row", gap: 4, alignItems: "center" },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.primary },
  quickRow: { paddingHorizontal: 16, paddingVertical: 8, maxHeight: 50 },
  quickBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  quickText: { fontSize: 12, color: COLORS.primary, fontWeight: "500" },
  inputRow: { flexDirection: "row", padding: 12, backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 10, alignItems: "flex-end" },
  input: { flex: 1, backgroundColor: COLORS.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: COLORS.text, maxHeight: 100, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  sendIcon: { color: "#fff", fontSize: 18, fontWeight: "700" },
  voiceBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" },
  voiceIcon: { fontSize: 16 },
});
