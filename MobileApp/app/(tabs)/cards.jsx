import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated as RNAnimated,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { cardAPI, walletAPI } from "../../services/api";

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CARD_COLORS = [
  "#2563EB", // blue
  "#334155", // slate
  "#7C3AED", // violet
  "#E11D48", // rose
  "#059669", // emerald
  "#D97706", // amber
];

const FUND_CURRENCIES = [
  "KES",
  "USD",
  "EUR",
  "GBP",
  "NGN",
  "GHS",
  "ZAR",
  "UGX",
];
const CARD_TYPES = ["virtual", "physical"];

const CARD_BENEFITS = [
  {
    iconName: "shield-checkmark-outline",
    tint: "#3B82F6",
    title: "Zero-liability Protection",
    desc: "You're never responsible for unauthorized charges.",
  },
  {
    iconName: "wifi-outline",
    tint: "#0D9488",
    title: "Contactless Payments",
    desc: "Tap to pay anywhere in 180+ countries.",
  },
  {
    iconName: "lock-closed-outline",
    tint: "#7C3AED",
    title: "Instant Freeze & Unfreeze",
    desc: "Lock your card in seconds if it goes missing.",
  },
  {
    iconName: "notifications-outline",
    tint: "#D97706",
    title: "Real-time Alerts",
    desc: "Get notified instantly for every transaction.",
  },
];

const EMPTY_FORM = {
  cardNumber: "",
  holderName: "",
  expiryMonth: "",
  expiryYear: "",
  cvv: "",
  label: "",
  cardType: "virtual",
  color: CARD_COLORS[0],
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

function resolveCardColor(colorField, index) {
  if (colorField && /^#[0-9a-fA-F]{3,8}$/.test(colorField)) return colorField;
  return CARD_COLORS[index % CARD_COLORS.length];
}

function mapApiCard(c, index) {
  return {
    id: c.id || c._id,
    type: capitalize(c.cardType) || "Virtual",
    network: capitalize(c.cardBrand) || "Other",
    label: c.label || "My Card",
    last4: c.cardLast4 || c.last4 || "????",
    expiry: `${String(c.expiryMonth).padStart(2, "0")}/${String(c.expiryYear).slice(-2)}`,
    holder: c.holderName || c.holder || "Card Holder",
    status: c.status || "active",
    isDefault: !!c.isDefault,
    color: resolveCardColor(c.color, index),
  };
}

function formatCardInput(text) {
  const digits = text.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

// â”€â”€â”€ Skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SkeletonBox({ style }) {
  const anim = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(anim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        RNAnimated.timing(anim, {
          toValue: 0,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [anim]);
  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.65],
  });
  return (
    <RNAnimated.View
      style={[{ backgroundColor: "#CBD5E1", borderRadius: 10, opacity }, style]}
    />
  );
}

function CardSkeletons() {
  return (
    <View style={{ padding: 20, gap: 20 }}>
      {[0, 1].map((i) => (
        <View
          key={i}
          style={[
            styles.cardShadow,
            { backgroundColor: "#e2e8f0", borderRadius: 20, padding: 22 },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 32,
            }}
          >
            <SkeletonBox style={{ width: 70, height: 18, borderRadius: 9 }} />
            <SkeletonBox style={{ width: 32, height: 22, borderRadius: 6 }} />
          </View>
          <SkeletonBox style={{ width: "75%", height: 22, marginBottom: 22 }} />
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <SkeletonBox style={{ width: "28%", height: 30 }} />
            <SkeletonBox style={{ width: "22%", height: 30 }} />
            <SkeletonBox style={{ width: "18%", height: 30 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

// â”€â”€â”€ AnimatedCard (tap scale) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AnimatedCard({ children, onPress, style }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View style={[animStyle, style]}>
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.975, { damping: 20, stiffness: 500 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 20, stiffness: 500 });
        }}
        onPress={onPress}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

// â”€â”€â”€ CardFace â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CardFace({ card, onPress }) {
  const frozen = card.status === "frozen";
  return (
    <AnimatedCard onPress={onPress} style={styles.cardShadow}>
      <View
        style={[
          styles.cardFace,
          { backgroundColor: card.color, opacity: frozen ? 0.65 : 1 },
        ]}
      >
        {/* Decorative blobs */}
        <View style={styles.blobTopRight} />
        <View style={styles.blobBottomLeft} />

        {/* Top row */}
        <View style={styles.cardTopRow}>
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            <Text style={styles.cardLabel}>{card.label}</Text>
            <View
              style={[
                styles.statusPill,
                frozen ? styles.statusFrozen : styles.statusActive,
              ]}
            >
              <Text style={styles.statusPillText}>
                {frozen ? "Frozen" : "Active"}
              </Text>
            </View>
          </View>
          <View>
            {card.network === "Mastercard" ? (
              <View style={{ flexDirection: "row" }}>
                <View
                  style={[
                    styles.networkCircle,
                    { backgroundColor: "rgba(239,68,68,0.85)" },
                  ]}
                />
                <View
                  style={[
                    styles.networkCircle,
                    {
                      backgroundColor: "rgba(251,191,36,0.75)",
                      marginLeft: -10,
                    },
                  ]}
                />
              </View>
            ) : (
              <Text style={styles.visaText}>VISA</Text>
            )}
          </View>
        </View>

        {/* Contactless icon */}
        <Ionicons
          name="wifi-outline"
          size={18}
          color="rgba(255,255,255,0.5)"
          style={{ marginBottom: 14, transform: [{ rotate: "90deg" }] }}
        />

        {/* Card number */}
        <Text style={styles.cardNumber}>
          â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ {card.last4}
        </Text>

        {/* Bottom row */}
        <View style={styles.cardBottomRow}>
          <View>
            <Text style={styles.cardFieldLabel}>CARD HOLDER</Text>
            <Text style={styles.cardFieldValue}>{card.holder}</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.cardFieldLabel}>EXPIRES</Text>
            <Text style={styles.cardFieldValue}>{card.expiry}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.cardFieldLabel}>TYPE</Text>
            <Text style={styles.cardFieldValue}>{card.type}</Text>
          </View>
        </View>

        {/* Frozen overlay */}
        {frozen && (
          <View style={styles.frozenOverlay}>
            <View style={styles.frozenPill}>
              <Ionicons
                name="lock-closed"
                size={14}
                color="#fff"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.frozenPillText}>Card Frozen</Text>
            </View>
          </View>
        )}

        {/* Default star */}
        {card.isDefault && (
          <View style={styles.defaultStar}>
            <Ionicons name="star" size={14} color="#FCD34D" />
          </View>
        )}
      </View>
    </AnimatedCard>
  );
}

// â”€â”€â”€ DetailsPanel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DetailsPanel({ card }) {
  return (
    <View style={styles.detailsPanel}>
      <View style={styles.detailsGrid}>
        <View style={styles.detailCell}>
          <Text style={styles.detailCellLabel}>CARD NUMBER</Text>
          <Text style={styles.detailCellValue}>
            â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ {card.last4}
          </Text>
        </View>
        <View style={styles.detailCell}>
          <Text style={styles.detailCellLabel}>EXPIRY</Text>
          <Text style={styles.detailCellValue}>{card.expiry}</Text>
        </View>
        <View style={styles.detailCell}>
          <Text style={styles.detailCellLabel}>CARD HOLDER</Text>
          <Text style={[styles.detailCellValue, { flex: 1 }]} numberOfLines={1}>
            {card.holder}
          </Text>
        </View>
        <View style={styles.detailCell}>
          <Text style={styles.detailCellLabel}>NETWORK / TYPE</Text>
          <Text style={styles.detailCellValue}>
            {card.network} Â· {card.type}
          </Text>
        </View>
      </View>
      <View style={{ marginTop: 8 }}>
        <Text style={styles.detailCellLabel}>CARD ID</Text>
        <Text
          style={[styles.detailCellValue, { fontSize: 11, color: "#94A3B8" }]}
          numberOfLines={1}
        >
          {card.id}
        </Text>
      </View>
    </View>
  );
}

// â”€â”€â”€ ActionRow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ActionBtn({ iconName, label, tint = "#64748B", onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={() => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={[
        styles.actionBtn,
        { borderColor: disabled ? "#E2E8F0" : tint + "44" },
        disabled && { opacity: 0.38 },
      ]}
      activeOpacity={0.7}
    >
      <Ionicons
        name={iconName}
        size={15}
        color={disabled ? "#CBD5E1" : tint}
        style={{ marginBottom: 2 }}
      />
      <Text
        style={[styles.actionBtnLabel, { color: disabled ? "#CBD5E1" : tint }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// â”€â”€â”€ CardItem â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CardItem({
  card,
  onToggleReveal,
  revealed,
  onSetDefault,
  onDelete,
  onToggleFreeze,
  onFundWallet,
}) {
  const frozen = card.status === "frozen";
  return (
    <View style={styles.cardItemWrap}>
      <CardFace card={card} onPress={onToggleReveal} />

      {/* Expanded details */}
      {revealed && <DetailsPanel card={card} />}

      {/* Action row */}
      <View style={styles.actionRow}>
        <ActionBtn
          iconName={revealed ? "eye-off-outline" : "eye-outline"}
          label={revealed ? "Hide" : "Details"}
          tint="#2563EB"
          onPress={onToggleReveal}
        />
        <ActionBtn
          iconName={frozen ? "lock-open-outline" : "lock-closed-outline"}
          label={frozen ? "Unfreeze" : "Freeze"}
          tint={frozen ? "#D97706" : "#475569"}
          onPress={() => onToggleFreeze(card)}
        />
        {!card.isDefault && (
          <ActionBtn
            iconName="star-outline"
            label="Default"
            tint="#CA8A04"
            onPress={() => onSetDefault(card.id)}
          />
        )}
        <ActionBtn
          iconName="wallet-outline"
          label="Fund"
          tint="#059669"
          disabled={frozen}
          onPress={() => onFundWallet(card)}
        />
        <ActionBtn
          iconName="trash-outline"
          label="Remove"
          tint="#EF4444"
          onPress={() => onDelete(card.id)}
        />
      </View>
    </View>
  );
}

// â”€â”€â”€ FormField â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FormField({ label, error, children }) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.formError}>{error}</Text> : null}
    </View>
  );
}

function StyledInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  maxLength,
  autoCapitalize,
  error,
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94A3B8"
      keyboardType={keyboardType || "default"}
      secureTextEntry={secureTextEntry}
      maxLength={maxLength}
      autoCapitalize={autoCapitalize || "sentences"}
      style={[styles.textInput, error && styles.textInputError]}
    />
  );
}

// â”€â”€â”€ ColorPicker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ColorPicker({ selected, onSelect }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
      {CARD_COLORS.map((c) => (
        <TouchableOpacity
          key={c}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
              () => {},
            );
            onSelect(c);
          }}
          style={[
            styles.colorSwatch,
            { backgroundColor: c },
            selected === c && styles.colorSwatchActive,
          ]}
        >
          {selected === c && (
            <Ionicons name="checkmark" size={14} color="#fff" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

// â”€â”€â”€ AddCardModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AddCardModal({ visible, onClose, onAdded }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const setF = (key) => (val) => setForm((p) => ({ ...p, [key]: val }));

  const validate = () => {
    const e = {};
    const digits = form.cardNumber.replace(/\s/g, "");
    if (!digits || digits.length < 13)
      e.cardNumber = "Enter a valid 13-19 digit card number";
    if (!form.holderName.trim()) e.holderName = "Cardholder name is required";
    const mo = parseInt(form.expiryMonth, 10);
    if (!mo || mo < 1 || mo > 12) e.expiryMonth = "Month must be 01â€“12";
    const yr = parseInt(form.expiryYear, 10);
    const nowYr = new Date().getFullYear();
    if (!yr || yr < nowYr || yr > nowYr + 20)
      e.expiryYear = `Enter ${nowYr}â€“${nowYr + 20}`;
    if (!form.cvv || !/^\d{3,4}$/.test(form.cvv))
      e.cvv = "CVV must be 3 or 4 digits";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await cardAPI.addCard({
        cardNumber: form.cardNumber.replace(/\s/g, ""),
        holderName: form.holderName.trim(),
        expiryMonth: parseInt(form.expiryMonth, 10),
        expiryYear: parseInt(form.expiryYear, 10),
        cvv: form.cvv,
        label: form.label.trim() || undefined,
        cardType: form.cardType,
        color: form.color,
      });
      const payload = res.data?.data ?? res.data;
      const added = payload?.card ?? payload;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      onAdded(added);
      setForm(EMPTY_FORM);
      setErrors({});
      onClose();
    } catch (err) {
      Alert.alert(
        "Card not added",
        err.response?.data?.message || "Check your card details and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalSafe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScroll}
          >
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="card-outline" size={20} color="#2563EB" />
              </View>
              <Text style={styles.modalTitle}>Add New Card</Text>
              <TouchableOpacity onPress={onClose} style={styles.modalClose}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Card preview */}
            <View style={[styles.previewCard, { backgroundColor: form.color }]}>
              <View style={styles.blobTopRight} />
              <View style={styles.blobBottomLeft} />
              <Text style={styles.cardLabel}>{form.label || "My Card"}</Text>
              <Text
                style={[styles.cardNumber, { marginTop: 18, marginBottom: 16 }]}
              >
                {form.cardNumber
                  ? `â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ ${form.cardNumber.replace(/\s/g, "").slice(-4) || "????"}`
                  : "â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ ????"}
              </Text>
              <Text style={styles.cardFieldValue}>
                {form.holderName || "Cardholder Name"}
              </Text>
            </View>

            {/* Form fields */}
            <FormField label="Card Number" error={errors.cardNumber}>
              <StyledInput
                value={form.cardNumber}
                onChangeText={(t) => setF("cardNumber")(formatCardInput(t))}
                placeholder="1234 5678 9012 3456"
                keyboardType="numeric"
                maxLength={19}
                error={errors.cardNumber}
              />
            </FormField>

            <FormField label="Cardholder Name" error={errors.holderName}>
              <StyledInput
                value={form.holderName}
                onChangeText={setF("holderName")}
                placeholder="John Doe"
                autoCapitalize="words"
                error={errors.holderName}
              />
            </FormField>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <FormField label="Exp. Month" error={errors.expiryMonth}>
                  <StyledInput
                    value={form.expiryMonth}
                    onChangeText={setF("expiryMonth")}
                    placeholder="MM"
                    keyboardType="numeric"
                    maxLength={2}
                    error={errors.expiryMonth}
                  />
                </FormField>
              </View>
              <View style={{ flex: 1.2 }}>
                <FormField label="Exp. Year" error={errors.expiryYear}>
                  <StyledInput
                    value={form.expiryYear}
                    onChangeText={setF("expiryYear")}
                    placeholder="YYYY"
                    keyboardType="numeric"
                    maxLength={4}
                    error={errors.expiryYear}
                  />
                </FormField>
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="CVV" error={errors.cvv}>
                  <StyledInput
                    value={form.cvv}
                    onChangeText={setF("cvv")}
                    placeholder="â€¢â€¢â€¢"
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                    error={errors.cvv}
                  />
                </FormField>
              </View>
            </View>

            <FormField label="Label (optional)">
              <StyledInput
                value={form.label}
                onChangeText={setF("label")}
                placeholder="e.g. Travel Card"
              />
            </FormField>

            {/* Card type */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Card Type</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {CARD_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => {
                      Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light,
                      ).catch(() => {});
                      setF("cardType")(t);
                    }}
                    style={[
                      styles.typeChip,
                      form.cardType === t && styles.typeChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        form.cardType === t && styles.typeChipTextActive,
                      ]}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Color */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Card Color</Text>
              <ColorPicker selected={form.color} onSelect={setF("color")} />
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={[styles.submitBtn, loading && { opacity: 0.65 }]}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Add Card</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// â”€â”€â”€ FundWalletModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FundWalletModal({ visible, onClose, cards, preselectedCard }) {
  const idempotencyKey = useRef(uuidv4());
  const [cardId, setCardId] = useState(preselectedCard?.id || "");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Sync preselected card when modal opens
  useEffect(() => {
    if (visible) {
      setCardId(preselectedCard?.id || "");
      setAmount("");
      setError(null);
      setSuccess(null);
    }
  }, [visible, preselectedCard]);

  const activeCards = cards.filter((c) => c.status === "active");

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (!cardId) return setError("Please select a card.");
    if (!parsed || parsed < 1) return setError("Minimum amount is 1.");
    if (parsed > 1_000_000) return setError("Maximum amount is 1,000,000.");
    setError(null);
    setLoading(true);
    try {
      const res = await walletAPI.chargeCard({
        cardId,
        amount: parsed,
        currency,
        idempotencyKey: idempotencyKey.current,
      });
      const data = res?.data?.data || res?.data || res;
      setSuccess({
        amount: data.amount ?? parsed,
        currency: data.currency ?? currency,
        transactionId: data.transactionId,
      });
      idempotencyKey.current = uuidv4();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Charge failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => !loading && onClose()}
    >
      <SafeAreaView style={styles.modalSafe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScroll}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View
                style={[styles.modalIconWrap, { backgroundColor: "#ECFDF5" }]}
              >
                <Ionicons name="wallet-outline" size={20} color="#059669" />
              </View>
              <Text style={styles.modalTitle}>Fund Wallet</Text>
              <TouchableOpacity
                onPress={() => !loading && onClose()}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {success ? (
              /* â”€â”€ Success state â”€â”€ */
              <View style={styles.successWrap}>
                <View style={styles.successIconWrap}>
                  <Ionicons name="checkmark-circle" size={52} color="#059669" />
                </View>
                <Text style={styles.successTitle}>Wallet Funded!</Text>
                <Text style={styles.successAmount}>
                  {success.currency}{" "}
                  {parseFloat(success.amount).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </Text>
                {success.transactionId && (
                  <Text style={styles.successTxId}>
                    Tx: {success.transactionId}
                  </Text>
                )}
                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.submitBtn,
                    { backgroundColor: "#059669", marginTop: 24 },
                  ]}
                >
                  <Text style={styles.submitBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Card selector */}
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Select Card</Text>
                  {activeCards.length === 0 ? (
                    <Text
                      style={{ fontSize: 13, color: "#94A3B8", marginTop: 6 }}
                    >
                      No active cards available.
                    </Text>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {activeCards.map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light,
                            ).catch(() => {});
                            setCardId(c.id);
                          }}
                          style={[
                            styles.cardSelectRow,
                            cardId === c.id && {
                              borderColor: "#2563EB",
                              backgroundColor: "#EFF6FF",
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.cardSelectDot,
                              { backgroundColor: c.color },
                            ]}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.cardSelectLabel}>
                              {c.label}
                            </Text>
                            <Text style={styles.cardSelectSub}>
                              â€¢â€¢â€¢â€¢ {c.last4}
                            </Text>
                          </View>
                          {cardId === c.id && (
                            <Ionicons
                              name="checkmark-circle"
                              size={18}
                              color="#2563EB"
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Amount */}
                <FormField
                  label="Amount"
                  error={error && error.includes("amount") ? error : undefined}
                >
                  <View style={styles.amountRow}>
                    <TextInput
                      value={amount}
                      onChangeText={(t) => {
                        setError(null);
                        setAmount(t.replace(/[^0-9.]/g, ""));
                      }}
                      placeholder="0.00"
                      placeholderTextColor="#94A3B8"
                      keyboardType="decimal-pad"
                      style={[styles.textInput, { flex: 1 }]}
                    />
                    <View style={styles.currencyBadge}>
                      <Text style={styles.currencyBadgeText}>{currency}</Text>
                    </View>
                  </View>
                </FormField>

                {/* Currency */}
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Currency</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {FUND_CURRENCIES.map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light,
                          ).catch(() => {});
                          setCurrency(c);
                        }}
                        style={[
                          styles.typeChip,
                          currency === c && styles.typeChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeChipText,
                            currency === c && styles.typeChipTextActive,
                          ]}
                        >
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {error && !error.includes("amount") && (
                  <View style={styles.errorBanner}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={15}
                      color="#DC2626"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.errorBannerText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={loading || activeCards.length === 0}
                  style={[
                    styles.submitBtn,
                    { backgroundColor: "#059669" },
                    (loading || activeCards.length === 0) && { opacity: 0.55 },
                  ]}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      Charge Card & Fund Wallet
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// â”€â”€â”€ CardBenefits â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CardBenefits() {
  return (
    <Animated.View
      entering={FadeInDown.duration(350).delay(160)}
      style={styles.benefitsWrap}
    >
      <Text style={styles.benefitsTitle}>Card Benefits</Text>
      <View style={styles.benefitsGrid}>
        {CARD_BENEFITS.map((b) => (
          <View key={b.title} style={styles.benefitCard}>
            <View
              style={[styles.benefitIcon, { backgroundColor: b.tint + "18" }]}
            >
              <Ionicons name={b.iconName} size={18} color={b.tint} />
            </View>
            <Text style={styles.benefitTitle}>{b.title}</Text>
            <Text style={styles.benefitDesc}>{b.desc}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// â”€â”€â”€ CardsScreen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function CardsScreen() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [revealedId, setRevealedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [fundCard, setFundCard] = useState(null);
  const fabScale = useSharedValue(1);

  // â”€â”€ Data fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchCards = useCallback(async () => {
    try {
      setError(null);
      const res = await cardAPI.getCards();
      const payload = res.data?.data ?? res.data;
      const arr = Array.isArray(payload) ? payload : (payload?.cards ?? []);
      setCards(arr.map((c, i) => mapApiCard(c, i)));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load cards");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await fetchCards();
  };

  // â”€â”€ Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleAdded = useCallback((raw) => {
    setCards((prev) => [...prev, mapApiCard(raw, prev.length)]);
  }, []);

  const handleSetDefault = async (id) => {
    try {
      await cardAPI.setDefaultCard(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      setCards((prev) => prev.map((c) => ({ ...c, isDefault: c.id === id })));
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to set default card",
      );
    }
  };

  const handleDelete = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert("Remove Card", "Are you sure you want to remove this card?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await cardAPI.deleteCard(id);
            setCards((prev) => prev.filter((c) => c.id !== id));
            if (revealedId === id) setRevealedId(null);
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            ).catch(() => {});
          } catch (err) {
            Alert.alert(
              "Error",
              err.response?.data?.message || "Failed to remove card",
            );
          }
        },
      },
    ]);
  };

  const handleToggleFreeze = async (card) => {
    const newStatus = card.status === "frozen" ? "active" : "frozen";
    try {
      await cardAPI.updateCardStatus(card.id, newStatus);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, status: newStatus } : c)),
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to update card status",
      );
    }
  };

  // â”€â”€ FAB animation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.pageHeader}>
          <SkeletonBox style={{ width: 100, height: 24, borderRadius: 8 }} />
          <SkeletonBox style={{ width: 80, height: 32, borderRadius: 16 }} />
        </View>
        <CardSkeletons />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color="#CBD5E1" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchCards}>
            <Ionicons
              name="refresh-outline"
              size={16}
              color="#2563EB"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
            colors={["#2563EB"]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(0)}
          style={styles.pageHeader}
        >
          <View>
            <Text style={styles.pageTitle}>My Cards</Text>
            <Text style={styles.pageSubtitle}>
              {cards.length} {cards.length === 1 ? "card" : "cards"} saved
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
                () => {},
              );
              setShowAdd(true);
            }}
            style={styles.addBtn}
            activeOpacity={0.8}
          >
            <Ionicons
              name="add"
              size={18}
              color="#fff"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.addBtnText}>Add Card</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* â”€â”€ Card list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {cards.length === 0 ? (
          <Animated.View
            entering={FadeInDown.duration(350).delay(60)}
            style={styles.emptyWrap}
          >
            <View style={styles.emptyIconWrap}>
              <Ionicons name="card-outline" size={36} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No cards yet</Text>
            <Text style={styles.emptySub}>
              Add a card to make faster payments worldwide
            </Text>
            <TouchableOpacity
              onPress={() => setShowAdd(true)}
              style={[styles.submitBtn, { marginTop: 20 }]}
            >
              <Ionicons
                name="add-circle-outline"
                size={16}
                color="#fff"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.submitBtnText}>Add Your First Card</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <View style={styles.cardList}>
            {cards.map((card, i) => (
              <Animated.View
                key={card.id}
                entering={FadeInDown.duration(350).delay(60 + i * 60)}
              >
                <CardItem
                  card={card}
                  revealed={revealedId === card.id}
                  onToggleReveal={() => {
                    Haptics.impactAsync(
                      Haptics.ImpactFeedbackStyle.Light,
                    ).catch(() => {});
                    setRevealedId((prev) =>
                      prev === card.id ? null : card.id,
                    );
                  }}
                  onSetDefault={handleSetDefault}
                  onDelete={handleDelete}
                  onToggleFreeze={handleToggleFreeze}
                  onFundWallet={(c) => setFundCard(c)}
                />
              </Animated.View>
            ))}
          </View>
        )}

        {/* â”€â”€ Card benefits â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <CardBenefits />
      </ScrollView>

      {/* â”€â”€ Floating Add Button (secondary, bottom-right) â”€â”€â”€â”€â”€â”€â”€ */}
      <Animated.View style={[styles.fab, fabStyle]}>
        <TouchableOpacity
          onPress={() => {
            fabScale.value = withSpring(0.88, { damping: 12 }, () => {
              fabScale.value = withSpring(1);
            });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
              () => {},
            );
            setShowAdd(true);
          }}
          style={styles.fabInner}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* â”€â”€ Modals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AddCardModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={handleAdded}
      />
      <FundWalletModal
        visible={!!fundCard}
        onClose={() => setFundCard(null)}
        cards={cards}
        preselectedCard={fundCard}
      />
    </SafeAreaView>
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 120,
  },

  // â”€â”€ Page header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 3,
    fontWeight: "500",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  // â”€â”€ Card list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  cardList: {
    paddingHorizontal: 20,
    gap: 20,
    paddingTop: 10,
  },
  cardItemWrap: {
    gap: 10,
  },

  // â”€â”€ Card face â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
    borderRadius: 20,
  },
  cardFace: {
    borderRadius: 20,
    padding: 22,
    overflow: "hidden",
  },
  blobTopRight: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  blobBottomLeft: {
    position: "absolute",
    bottom: -35,
    left: -20,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  cardLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: "rgba(16,185,129,0.35)",
  },
  statusFrozen: {
    backgroundColor: "rgba(245,158,11,0.35)",
  },
  statusPillText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  networkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  visaText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    fontStyle: "italic",
    letterSpacing: 1,
  },
  cardNumber: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: 3,
    marginBottom: 18,
    fontVariant: ["tabular-nums"],
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  cardFieldLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  cardFieldValue: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  frozenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.32)",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  frozenPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  frozenPillText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  defaultStar: {
    position: "absolute",
    top: 14,
    right: 14,
  },

  // â”€â”€ Details panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  detailsPanel: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  detailCell: {
    width: "47%",
  },
  detailCellLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  detailCellValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },

  // â”€â”€ Action row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  actionRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  actionBtn: {
    flex: 1,
    minWidth: 52,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  actionBtnLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // â”€â”€ FAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  fab: {
    position: "absolute",
    bottom: 100,
    right: 20,
  },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },

  // â”€â”€ Empty state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 52,
    paddingHorizontal: 36,
    gap: 8,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  emptySub: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
  },

  // â”€â”€ Error state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 10,
  },
  errorTitle: { fontSize: 16, fontWeight: "700", color: "#334155" },
  errorSub: { fontSize: 13, color: "#94A3B8", textAlign: "center" },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.15)",
  },
  retryBtnText: { color: "#2563EB", fontWeight: "700", fontSize: 13 },

  // â”€â”€ Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  modalSafe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 48,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
    gap: 10,
  },
  modalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  // â”€â”€ Card preview (in add modal) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  previewCard: {
    borderRadius: 18,
    padding: 20,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },

  // â”€â”€ Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.3,
    marginBottom: 7,
  },
  formError: {
    fontSize: 11,
    color: "#DC2626",
    marginTop: 4,
    fontWeight: "500",
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "500",
  },
  textInputError: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },

  // â”€â”€ Type chips â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#fff",
  },
  typeChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  typeChipTextActive: {
    color: "#2563EB",
  },

  // â”€â”€ Color swatch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatchActive: {
    borderWidth: 2.5,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 4,
  },

  // â”€â”€ Submit button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 15,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },

  // â”€â”€ Fund wallet modal specifics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  cardSelectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#fff",
  },
  cardSelectDot: {
    width: 30,
    height: 30,
    borderRadius: 9,
  },
  cardSelectLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  cardSelectSub: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
    marginTop: 1,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  currencyBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorBannerText: {
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "500",
    flex: 1,
  },
  successWrap: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
  },
  successAmount: {
    fontSize: 26,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: -0.6,
    marginTop: 4,
  },
  successTxId: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
    marginTop: 2,
  },

  // â”€â”€ Benefits section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  benefitsWrap: {
    marginHorizontal: 20,
    marginTop: 28,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  benefitsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  benefitCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  benefitIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  benefitTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
    lineHeight: 16,
  },
  benefitDesc: {
    fontSize: 11,
    color: "#94A3B8",
    lineHeight: 15,
  },
});
