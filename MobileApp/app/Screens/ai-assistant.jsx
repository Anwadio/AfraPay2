import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { chatAPI } from "../../services/api";

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm AfraPay's AI assistant. I can help you with:\n\n• Sending money\n• Checking balances\n• Understanding your transactions\n• Financial tips\n\nHow can I help you today?",
  timestamp: new Date(),
};

const SUGGESTIONS = [
  "How do I send money?",
  "What are my recent transactions?",
  "How do I add a card?",
  "Explain my fees",
];

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const time = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <View
      className={`mb-3 flex-row ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <View className="w-8 h-8 rounded-full bg-blue-600 items-center justify-center mr-2 mt-1 flex-shrink-0">
          <Text className="text-white text-sm font-bold">AI</Text>
        </View>
      )}
      <View
        className={`max-w-4/5 rounded-2xl px-4 py-3 ${
          isUser ? "bg-blue-600 rounded-br-sm" : "bg-white rounded-bl-sm"
        }`}
        style={
          !isUser
            ? {
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
              }
            : {}
        }
      >
        <Text
          className={`text-sm leading-5 ${isUser ? "text-white" : "text-slate-800"}`}
          style={{ fontFamily: Platform.OS === "ios" ? "System" : "Roboto" }}
        >
          {message.content}
        </Text>
        <Text
          className={`text-xs mt-1 ${isUser ? "text-blue-200" : "text-slate-400"}`}
        >
          {time}
        </Text>
      </View>
    </View>
  );
}

function TypingIndicator() {
  return (
    <View className="flex-row items-center mb-3">
      <View className="w-8 h-8 rounded-full bg-blue-600 items-center justify-center mr-2">
        <Text className="text-white text-sm font-bold">AI</Text>
      </View>
      <View
        className="bg-white rounded-2xl rounded-bl-sm px-4 py-3"
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center gap-1">
          {[0, 1, 2].map((i) => (
            <View key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          ))}
        </View>
      </View>
    </View>
  );
}

export default function AIAssistantScreen() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const scrollRef = useRef(null);

  // Create a new chat session on mount
  useEffect(() => {
    createSession();
  }, []);

  const createSession = async () => {
    try {
      const res = await chatAPI.createSession();
      const id = res.data?.session?._id || res.data?.sessionId || res.data?._id;
      setSessionId(id);
    } catch {
      // If session creation fails, we'll create it on first message
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const sendMessage = useCallback(
    async (text) => {
      const msgText = (text || inputText).trim();
      if (!msgText) return;
      setInputText("");

      // Only add the user message (not a re-display suggestion)
      const userMsg = {
        id: Date.now().toString(),
        role: "user",
        content: msgText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);
      scrollToBottom();

      try {
        let activeSessionId = sessionId;
        if (!activeSessionId) {
          const res = await chatAPI.createSession();
          activeSessionId =
            res.data?.session?._id || res.data?.sessionId || res.data?._id;
          setSessionId(activeSessionId);
        }

        const res = await chatAPI.sendMessage(activeSessionId, msgText);
        const reply = res.data?.message || res.data?.reply || res.data;
        const aiMsg = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            typeof reply === "string"
              ? reply
              : reply?.content || "I received your message.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err) {
        const errorMsg = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            err.response?.status === 401
              ? "Please log in to use the AI assistant."
              : "I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
        scrollToBottom();
      }
    },
    [inputText, sessionId],
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Chat messages */}
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4 pt-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToBottom}
        >
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {isTyping && <TypingIndicator />}
          <View className="h-4" />
        </ScrollView>

        {/* Suggestions (only show at start) */}
        {messages.length <= 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
          >
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => sendMessage(s)}
                className="mr-2 px-4 py-2 rounded-full bg-white border border-slate-200"
                style={{
                  shadowColor: "#000",
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <Text className="text-sm text-slate-700">{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input bar */}
        <View
          className="flex-row items-end px-4 py-3 bg-white border-t border-slate-100"
          style={{
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <View className="flex-1 bg-slate-50 rounded-2xl px-4 py-3 mr-3 border border-slate-200 max-h-28">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask me anything..."
              placeholderTextColor="#94a3b8"
              multiline
              className="text-slate-900 text-sm"
              style={{ lineHeight: 20 }}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
              blurOnSubmit
            />
          </View>
          <TouchableOpacity
            onPress={() => sendMessage()}
            disabled={!inputText.trim() || isTyping}
            className={`w-11 h-11 rounded-full items-center justify-center ${
              inputText.trim() && !isTyping ? "bg-blue-600" : "bg-slate-200"
            }`}
          >
            {isTyping ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white font-bold text-lg">↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
