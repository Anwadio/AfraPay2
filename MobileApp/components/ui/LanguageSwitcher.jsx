/**
 * LanguageSwitcher — MobileApp
 * ────────────────────────────
 * A bottom-sheet style modal that lets the user select English or French.
 * Persists the choice via LanguageContext → AsyncStorage.
 *
 * Usage:
 *   <LanguageSwitcher visible={open} onClose={() => setOpen(false)} />
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../contexts/LanguageContext";

export default function LanguageSwitcher({ visible, onClose }) {
  const { t } = useTranslation();
  const { language, changeLanguage, supportedLanguages, languageMeta } =
    useLanguage();

  const handleSelect = async (lang) => {
    if (lang !== language) {
      await changeLanguage(lang);
    }
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Title */}
        <Text style={styles.title}>{t("settings.selectLanguage")}</Text>

        {/* Language options */}
        {supportedLanguages.map((code) => {
          const meta = languageMeta[code];
          const selected = code === language;
          return (
            <TouchableOpacity
              key={code}
              onPress={() => handleSelect(code)}
              style={[styles.option, selected && styles.optionSelected]}
              activeOpacity={0.75}
            >
              <Text style={styles.flag}>{meta.flag}</Text>
              <View style={styles.optionTexts}>
                <Text
                  style={[styles.nativeName, selected && styles.selectedText]}
                >
                  {meta.nativeName}
                </Text>
                <Text style={styles.englishName}>{meta.englishName}</Text>
              </View>
              {selected && (
                <Ionicons name="checkmark-circle" size={22} color="#2563EB" />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Cancel */}
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>{t("settings.cancel")}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 12,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 16,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: "#F8FAFC",
  },
  optionSelected: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },
  flag: {
    fontSize: 28,
    marginRight: 14,
  },
  optionTexts: {
    flex: 1,
  },
  nativeName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  selectedText: {
    color: "#2563EB",
  },
  englishName: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
  },
});
