import React, { useRef, useState } from "react";
import { View, TextInput, Text, Animated } from "react-native";

export default function Input({
  inputRef,
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  error,
  autoCapitalize = "none",
  multiline = false,
  numberOfLines,
  editable = true,
  rightElement,
  leftIcon,
  hint,
  returnKeyType,
  onSubmitEditing,
}) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };
  const handleBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? "#fca5a5" : "#e2e8f0", error ? "#ef4444" : "#2563eb"],
  });

  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: focused ? "#2563eb" : error ? "#ef4444" : "#475569",
            marginBottom: 6,
            letterSpacing: 0.1,
          }}
        >
          {label}
        </Text>
      )}
      <Animated.View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: focused ? 2 : 1.5,
          borderRadius: 14,
          paddingHorizontal: 14,
          backgroundColor: error ? "#fff5f5" : focused ? "#ffffff" : "#f8fafc",
          borderColor,
          shadowColor: focused ? "#2563eb" : "#000",
          shadowOpacity: focused ? 0.1 : 0.03,
          shadowRadius: focused ? 8 : 2,
          shadowOffset: { width: 0, height: focused ? 2 : 1 },
          elevation: focused ? 3 : 1,
        }}
      >
        {leftIcon && (
          <View style={{ marginRight: 10, opacity: focused ? 1 : 0.5 }}>
            {leftIcon}
          </View>
        )}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          style={{
            flex: 1,
            fontSize: 15,
            color: "#0f172a",
            paddingVertical: 14,
          }}
        />
        {rightElement && <View style={{ marginLeft: 10 }}>{rightElement}</View>}
      </Animated.View>
      {error ? (
        <Text
          style={{
            color: "#ef4444",
            fontSize: 12,
            marginTop: 5,
            marginLeft: 2,
            fontWeight: "500",
          }}
        >
          ⚠ {error}
        </Text>
      ) : hint ? (
        <Text
          style={{
            color: "#94a3b8",
            fontSize: 12,
            marginTop: 5,
            marginLeft: 2,
          }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
