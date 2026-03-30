import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { paymentAPI, walletAPI } from "../../services/api";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";

// ─── Constants ────────────────────────────────────────────────────────────────
const STEPS = {
  FORM: "form",
  CONFIRM: "confirm",
  PROCESSING: "processing",
  RESULT: "result",
};

const PROVIDERS = [
  {
    id: "mpesa",
    label: "M-Pesa",
    description: "Safaricom · Kenya",
    currencies: ["KES"],
    defaultCurrency: "KES",
    iconName: "phone-portrait-outline",
    tint: "#059669",
    hint: "e.g. +254712345678",
    inputType: "phone",
  },
  {
    id: "mtn",
    label: "MTN MoMo",
    description: "MTN Mobile Money",
    currencies: ["GHS", "UGX", "RWF", "NGN", "XOF"],
    defaultCurrency: "GHS",
    iconName: "cellular-outline",
    tint: "#D97706",
    hint: "e.g. +233201234567",
    inputType: "phone",
  },
  {
    id: "wallet",
    label: "AfraPay Wallet",
    description: "Instant · Zero fee",
    currencies: ["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR"],
    defaultCurrency: "USD",
    iconName: "wallet-outline",
    tint: "#2563EB",
    hint: "Recipient's phone number",
    inputType: "phone",
  },
  {
    id: "paystack",
    label: "Paystack",
    description: "Bank Transfer · NGN · GHS",
    currencies: ["NGN", "GHS", "ZAR", "KES"],
    defaultCurrency: "NGN",
    iconName: "business-outline",
    tint: "#0D9488",
    hint: "10-digit account number",
    inputType: "bank",
  },
  {
    id: "flutterwave",
    label: "Flutterwave",
    description: "Bank Transfer · Pan-Africa",
    currencies: ["NGN", "GHS", "KES", "ZAR", "UGX", "EUR", "USD", "GBP"],
    defaultCurrency: "NGN",
    iconName: "globe-outline",
    tint: "#EA580C",
    hint: "Bank account number",
    inputType: "bank",
  },
  {
    id: "stripe",
    label: "Stripe",
    description: "Connected Account · USD · EUR",
    currencies: ["USD", "EUR", "GBP", "CAD", "AUD"],
    defaultCurrency: "USD",
    iconName: "flash-outline",
    tint: "#7C3AED",
    hint: "acct_xxxxxxxxxxxxxxxxxx",
    inputType: "stripe_account",
  },
];

const TX_STATUS_CONFIG = {
  completed: {
    label: "Sent",
    variant: "completed",
    color: "#EF4444",
    sign: "−",
  },
  failed: { label: "Failed", variant: "failed", color: "#94A3B8", sign: "" },
  pending: { label: "Pending", variant: "pending", color: "#94A3B8", sign: "" },
  processing: {
    label: "Processing",
    variant: "warning",
    color: "#94A3B8",
    sign: "",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function formatCurrency(amount, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(parseFloat(amount || 0));
  } catch {
    return `${currency} ${parseFloat(amount || 0).toFixed(2)}`;
  }
}

function formatRelDate(iso) {
  if (!iso) return "";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function maskRecipient(str, inputType) {
  if (!str || str.length < 6) return str;
  if (inputType === "phone") return str.slice(0, 4) + "****" + str.slice(-3);
  return str.slice(0, 3) + "****" + str.slice(-3);
}

function isBankProvider(id) {
  return id === "paystack" || id === "flutterwave";
}
function isStripeProvider(id) {
  return id === "stripe";
}

// ─── ProviderCard ─────────────────────────────────────────────────────────────
function ProviderCard({ provider, selected, onSelect }) {
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onSelect(provider.id);
      }}
      activeOpacity={0.75}
      style={[
        styles.providerCard,
        selected && {
          borderColor: provider.tint,
          backgroundColor: provider.tint + "0E",
        },
      ]}
    >
      <View
        style={[styles.providerIcon, { backgroundColor: provider.tint + "18" }]}
      >
        <Ionicons name={provider.iconName} size={18} color={provider.tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[styles.providerLabel, selected && { color: provider.tint }]}
        >
          {provider.label}
        </Text>
        <Text style={styles.providerDesc} numberOfLines={1}>
          {provider.description}
        </Text>
      </View>
      {selected && (
        <Ionicons name="checkmark-circle" size={18} color={provider.tint} />
      )}
    </TouchableOpacity>
  );
}

// ─── CurrencyPill ─────────────────────────────────────────────────────────────
function CurrencyPill({ code, selected, onSelect }) {
  return (
    <TouchableOpacity
      onPress={() => onSelect(code)}
      style={[styles.currencyPill, selected && styles.currencyPillActive]}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.currencyPillText,
          selected && styles.currencyPillTextActive,
        ]}
      >
        {code}
      </Text>
    </TouchableOpacity>
  );
}

// ─── ReviewRow ────────────────────────────────────────────────────────────────
function ReviewRow({ label, value, valueColor }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={[styles.reviewValue, valueColor && { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

// ─── StepIndicator ───────────────────────────────────────────────────────────
function StepIndicator({ step }) {
  const steps = [STEPS.FORM, STEPS.CONFIRM, STEPS.RESULT];
  const activeIdx = [
    STEPS.FORM,
    STEPS.CONFIRM,
    STEPS.PROCESSING,
    STEPS.RESULT,
  ].indexOf(step);

  return (
    <View style={styles.stepRow}>
      {steps.map((s, i) => {
        const done = i < activeIdx;
        const active =
          i === activeIdx || (s === STEPS.RESULT && step === STEPS.PROCESSING);
        return (
          <React.Fragment key={s}>
            <View
              style={[
                styles.stepDot,
                done && styles.stepDotDone,
                active && !done && styles.stepDotActive,
              ]}
            >
              {done ? (
                <Ionicons name="checkmark" size={11} color="#fff" />
              ) : (
                <Text style={styles.stepDotText}>{i + 1}</Text>
              )}
            </View>
            {i < steps.length - 1 && (
              <View style={[styles.stepLine, done && styles.stepLineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── RecentTransferItem ──────────────────────────────────────────────────────
function RecentTransferItem({ transfer, onQuickFill }) {
  const cfg =
    TX_STATUS_CONFIG[transfer.status?.toLowerCase()] ||
    TX_STATUS_CONFIG.pending;
  const providerCfg = PROVIDERS.find((p) => p.id === transfer.provider);
  const recipientDisplay =
    transfer.recipientPhone ||
    transfer.phone ||
    transfer.recipientEmail ||
    transfer.recipient ||
    "—";

  return (
    <TouchableOpacity
      style={styles.txItem}
      onPress={() => onQuickFill(transfer)}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.txAvatar,
          { backgroundColor: (providerCfg?.tint || "#2563EB") + "18" },
        ]}
      >
        <Ionicons
          name={providerCfg?.iconName || "swap-horizontal-outline"}
          size={18}
          color={providerCfg?.tint || "#2563EB"}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txRecipient} numberOfLines={1}>
          {recipientDisplay}
        </Text>
        <Text style={styles.txMeta}>
          {providerCfg?.label || transfer.provider} ·{" "}
          {formatRelDate(transfer.createdAt)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.txAmount, { color: cfg.color }]}>
          {cfg.sign}
          {formatCurrency(transfer.amount, transfer.currency)}
        </Text>
        <Badge label={cfg.label} variant={cfg.variant} />
      </View>
    </TouchableOpacity>
  );
}

// ─── SendMoneyScreen ──────────────────────────────────────────────────────────
export default function SendMoneyScreen() {
  const router = useRouter();
  const idempotencyKey = useRef(uuidv4());

  const [step, setStep] = useState(STEPS.FORM);
  const [provider, setProvider] = useState("mpesa");
  const [currency, setCurrency] = useState("KES");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);

  const [balances, setBalances] = useState(null);
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  const selectedProvider =
    PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];

  // ── Data fetch ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setTxLoading(true);
      const [balRes, recRes] = await Promise.all([
        walletAPI.getBalances(),
        paymentAPI.getRecentTransfers(8),
      ]);
      setBalances(balRes.data?.balances || balRes.data || null);
      setRecentTransfers(recRes.data?.transfers || recRes.data || []);
    } catch {
      // non-critical — UI degrades gracefully
    } finally {
      setTxLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Provider change resets recipient fields & picks default currency ─────
  const handleProviderChange = useCallback((id) => {
    const p = PROVIDERS.find((x) => x.id === id);
    setProvider(id);
    setCurrency(p?.defaultCurrency || "USD");
    setPhone("");
    setAccountNumber("");
    setBankCode("");
    setAccountName("");
    setErrors({});
  }, []);

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0)
      e.amount = "Enter a valid amount";

    if (isStripeProvider(provider)) {
      if (!accountNumber.trim() || !accountNumber.trim().startsWith("acct_"))
        e.account = "Enter a valid Stripe account ID (starts with acct_)";
    } else if (isBankProvider(provider)) {
      if (!accountNumber.trim()) e.account = "Account number is required";
      if (!bankCode.trim()) e.bankCode = "Bank code is required";
    } else {
      if (!phone.trim()) e.phone = "Recipient phone number is required";
      else if (phone.trim().length < 7) e.phone = "Enter a valid phone number";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleReview = () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => {},
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setStep(STEPS.CONFIRM);
  };

  // ── Send ─────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    setStep(STEPS.PROCESSING);
    try {
      const payload = {
        provider,
        amount: parseFloat(amount),
        currency,
        description: description.trim() || undefined,
        ...(isStripeProvider(provider)
          ? { accountId: accountNumber.trim() }
          : isBankProvider(provider)
            ? {
                accountNumber: accountNumber.trim(),
                bankCode: bankCode.trim(),
                accountName: accountName.trim() || undefined,
              }
            : { phone: phone.trim() }),
      };
      const res = await paymentAPI.sendMoney(payload, idempotencyKey.current);
      setResult({ success: true, data: res.data });
      idempotencyKey.current = uuidv4(); // rotate key
      await fetchData(); // refresh balance + recent list
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Transfer failed. Please try again.";
      setResult({ success: false, error: msg });
    }
    setStep(STEPS.RESULT);
  };

  const handleReset = () => {
    setStep(STEPS.FORM);
    setAmount("");
    setPhone("");
    setAccountNumber("");
    setBankCode("");
    setAccountName("");
    setDescription("");
    setErrors({});
    setResult(null);
  };

  // Quick-fill from recent transfer tap
  const handleQuickFill = useCallback(
    (tx) => {
      if (tx.provider && PROVIDERS.find((p) => p.id === tx.provider)) {
        handleProviderChange(tx.provider);
      }
      if (tx.phone || tx.recipientPhone)
        setPhone(tx.phone || tx.recipientPhone);
      if (tx.currency) setCurrency(tx.currency);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },
    [handleProviderChange],
  );

  // ── Wallet available balance for selected currency ───────────────────────
  const walletBalance = (() => {
    if (!balances) return null;
    const wallets =
      balances.wallets || (Array.isArray(balances) ? balances : [balances]);
    return (
      wallets.find?.((w) => w.currency === currency)?.availableBalance ?? null
    );
  })();

  const recipientDisplay =
    isStripeProvider(provider) || isBankProvider(provider)
      ? maskRecipient(accountNumber, "bank")
      : maskRecipient(phone, "phone");

  // ─────────────────────────────────────────────────────────────────────────
  // STEP: PROCESSING
  // ─────────────────────────────────────────────────────────────────────────
  if (step === STEPS.PROCESSING) {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.processingTitle}>Sending your transfer…</Text>
        <Text style={styles.processingSubtitle}>
          This usually takes a few seconds
        </Text>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP: RESULT
  // ─────────────────────────────────────────────────────────────────────────
  if (step === STEPS.RESULT) {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.resultCard}
        >
          {result?.success ? (
            <>
              <View
                style={[styles.resultIconWrap, { backgroundColor: "#D1FAE5" }]}
              >
                <Ionicons name="checkmark-circle" size={48} color="#059669" />
              </View>
              <Text style={styles.resultTitle}>Transfer Sent!</Text>
              <Text style={styles.resultSubtitle}>
                {formatCurrency(amount, currency)} sent via{" "}
                {selectedProvider.label}
              </Text>
              {result.data?.transaction?.id && (
                <View style={styles.resultRefWrap}>
                  <Text style={styles.resultRefLabel}>Transaction ID</Text>
                  <Text style={styles.resultRef}>
                    {result.data.transaction.id}
                  </Text>
                </View>
              )}
              <View style={{ width: "100%", gap: 10, marginTop: 24 }}>
                <Button title="Send Again" onPress={handleReset} size="lg" />
                <Button
                  title="View Transactions"
                  variant="outline"
                  onPress={() => {
                    handleReset();
                    router.push("/(tabs)/transactions");
                  }}
                  size="lg"
                />
              </View>
            </>
          ) : (
            <>
              <View
                style={[styles.resultIconWrap, { backgroundColor: "#FEE2E2" }]}
              >
                <Ionicons name="close-circle" size={48} color="#EF4444" />
              </View>
              <Text style={styles.resultTitle}>Transfer Failed</Text>
              <Text style={styles.resultSubtitle}>{result?.error}</Text>
              <View style={{ width: "100%", gap: 10, marginTop: 24 }}>
                <Button title="Try Again" onPress={handleReset} size="lg" />
              </View>
            </>
          )}
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP: CONFIRM
  // ─────────────────────────────────────────────────────────────────────────
  if (step === STEPS.CONFIRM) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => setStep(STEPS.FORM)}
                style={styles.backBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={22} color="#2563EB" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.pageTitle}>Confirm Transfer</Text>
                <Text style={styles.pageSubtitle}>Review before sending</Text>
              </View>
            </View>

            <StepIndicator step={step} />

            <Animated.View
              entering={FadeInDown.duration(380)}
              style={styles.sectionPad}
            >
              {/* Amount hero */}
              <View style={styles.confirmHero}>
                <View
                  style={[
                    styles.confirmProviderBadge,
                    { backgroundColor: selectedProvider.tint + "18" },
                  ]}
                >
                  <Ionicons
                    name={selectedProvider.iconName}
                    size={14}
                    color={selectedProvider.tint}
                  />
                  <Text
                    style={[
                      styles.confirmProviderLabel,
                      { color: selectedProvider.tint },
                    ]}
                  >
                    {selectedProvider.label}
                  </Text>
                </View>
                <Text style={styles.confirmAmount}>
                  {formatCurrency(amount, currency)}
                </Text>
                <Text style={styles.confirmTo}>
                  to {recipientDisplay || "—"}
                </Text>
              </View>

              {/* Review rows */}
              <View style={styles.reviewCard}>
                <ReviewRow label="Provider" value={selectedProvider.label} />
                <ReviewRow
                  label="Amount"
                  value={formatCurrency(amount, currency)}
                  valueColor="#2563EB"
                />
                <ReviewRow label="Recipient" value={recipientDisplay || "—"} />
                {isBankProvider(provider) && bankCode && (
                  <ReviewRow label="Bank Code" value={bankCode} />
                )}
                {isBankProvider(provider) && accountName && (
                  <ReviewRow label="Account Name" value={accountName} />
                )}
                {description.trim() && (
                  <ReviewRow label="Note" value={description} />
                )}
                <ReviewRow label="Fee" value="Free" valueColor="#059669" />
              </View>

              {/* Warning */}
              <View style={styles.warningBanner}>
                <Ionicons
                  name="warning-outline"
                  size={15}
                  color="#B45309"
                  style={{ marginTop: 1 }}
                />
                <Text style={styles.warningText}>
                  Transfers cannot be reversed once sent. Please verify
                  recipient details carefully.
                </Text>
              </View>

              <View style={{ gap: 10, marginTop: 8 }}>
                <Button title="Send Now" onPress={handleSend} size="lg" />
                <Button
                  title="Go Back"
                  variant="outline"
                  onPress={() => setStep(STEPS.FORM)}
                  size="lg"
                />
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP: FORM
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Header ─────────────────────────────────────── */}
          <Animated.View
            entering={FadeInDown.duration(380).delay(0)}
            style={styles.header}
          >
            <View>
              <Text style={styles.pageTitle}>Send Money</Text>
              <Text style={styles.pageSubtitle}>
                Transfer to anyone, anywhere
              </Text>
            </View>
          </Animated.View>

          <StepIndicator step={step} />

          {/* ── Wallet Balance Chip ────────────────────────── */}
          {provider === "wallet" && walletBalance !== null && (
            <Animated.View
              entering={FadeInDown.duration(380).delay(40)}
              style={styles.sectionPad}
            >
              <View style={styles.balanceChip}>
                <Ionicons name="wallet-outline" size={15} color="#2563EB" />
                <Text style={styles.balanceChipText}>
                  Available:{" "}
                  <Text style={{ fontWeight: "700", color: "#0F172A" }}>
                    {formatCurrency(walletBalance, currency)}
                  </Text>
                </Text>
              </View>
            </Animated.View>
          )}

          {/* ── Provider Selection ─────────────────────────── */}
          <Animated.View
            entering={FadeInDown.duration(380).delay(60)}
            style={styles.sectionPad}
          >
            <Text style={styles.sectionLabel}>Send via</Text>
            <View style={styles.providerGrid}>
              {PROVIDERS.map((p) => (
                <ProviderCard
                  key={p.id}
                  provider={p}
                  selected={provider === p.id}
                  onSelect={handleProviderChange}
                />
              ))}
            </View>
          </Animated.View>

          {/* ── Amount & Currency ──────────────────────────── */}
          <Animated.View
            entering={FadeInDown.duration(380).delay(120)}
            style={styles.sectionPad}
          >
            <Text style={styles.sectionLabel}>Amount</Text>
            <Input
              value={amount}
              onChangeText={(v) => {
                setAmount(v);
                if (errors.amount)
                  setErrors((e) => ({ ...e, amount: undefined }));
              }}
              placeholder="0.00"
              keyboardType="decimal-pad"
              error={errors.amount}
            />
            <Text style={[styles.sectionLabel, { marginTop: 4 }]}>
              Currency
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 4 }}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            >
              {selectedProvider.currencies.map((c) => (
                <CurrencyPill
                  key={c}
                  code={c}
                  selected={currency === c}
                  onSelect={setCurrency}
                />
              ))}
            </ScrollView>
          </Animated.View>

          {/* ── Recipient Field(s) ─────────────────────────── */}
          <Animated.View
            entering={FadeInDown.duration(380).delay(180)}
            style={styles.sectionPad}
          >
            {isStripeProvider(provider) ? (
              <>
                <Text style={styles.sectionLabel}>Stripe Account ID</Text>
                <Input
                  value={accountNumber}
                  onChangeText={(v) => {
                    setAccountNumber(v);
                    setErrors((e) => ({ ...e, account: undefined }));
                  }}
                  placeholder={selectedProvider.hint}
                  autoCapitalize="none"
                  error={errors.account}
                />
              </>
            ) : isBankProvider(provider) ? (
              <>
                <Text style={styles.sectionLabel}>Account Number</Text>
                <Input
                  value={accountNumber}
                  onChangeText={(v) => {
                    setAccountNumber(v);
                    setErrors((e) => ({ ...e, account: undefined }));
                  }}
                  placeholder={selectedProvider.hint}
                  keyboardType="numeric"
                  error={errors.account}
                />
                <Text style={styles.sectionLabel}>Bank Code</Text>
                <Input
                  value={bankCode}
                  onChangeText={(v) => {
                    setBankCode(v);
                    setErrors((e) => ({ ...e, bankCode: undefined }));
                  }}
                  placeholder="e.g. 044"
                  keyboardType="numeric"
                  error={errors.bankCode}
                />
                <Text style={styles.sectionLabel}>Account Name (optional)</Text>
                <Input
                  value={accountName}
                  onChangeText={setAccountName}
                  placeholder="e.g. John Doe"
                  autoCapitalize="words"
                />
              </>
            ) : (
              <>
                <Text style={styles.sectionLabel}>Recipient Phone Number</Text>
                <Input
                  value={phone}
                  onChangeText={(v) => {
                    setPhone(v);
                    setErrors((e) => ({ ...e, phone: undefined }));
                  }}
                  placeholder={selectedProvider.hint}
                  keyboardType="phone-pad"
                  error={errors.phone}
                />
              </>
            )}

            <Text style={styles.sectionLabel}>Description (optional)</Text>
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Rent payment"
              autoCapitalize="sentences"
            />
          </Animated.View>

          {/* ── Continue Button ────────────────────────────── */}
          <Animated.View
            entering={FadeInDown.duration(380).delay(240)}
            style={styles.sectionPad}
          >
            <Button
              title="Review Transfer"
              onPress={handleReview}
              size="lg"
              icon={<Ionicons name="arrow-forward" size={18} color="#fff" />}
            />
          </Animated.View>

          {/* ── Recent Transfers ───────────────────────────── */}
          {(txLoading || recentTransfers.length > 0) && (
            <Animated.View
              entering={FadeInDown.duration(380).delay(300)}
              style={[styles.sectionPad, { marginBottom: 12 }]}
            >
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Recent Transfers</Text>
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/transactions")}
                >
                  <Text style={styles.sectionLink}>See all</Text>
                </TouchableOpacity>
              </View>

              {txLoading ? (
                <View style={styles.txCard}>
                  {[...Array(3)].map((_, i) => (
                    <View key={i} style={styles.txSkeletonRow}>
                      <View style={styles.txSkeletonAvatar} />
                      <View style={{ flex: 1, gap: 8, marginLeft: 12 }}>
                        <View style={styles.txSkeletonLine1} />
                        <View style={styles.txSkeletonLine2} />
                      </View>
                      <View style={styles.txSkeletonAmount} />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.txCard}>
                  {recentTransfers.map((tx, i) => (
                    <RecentTransferItem
                      key={tx._id || tx.id || i}
                      transfer={tx}
                      onQuickFill={handleQuickFill}
                    />
                  ))}
                </View>
              )}
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  scrollContent: {
    paddingBottom: 110,
  },

  // ── Header ───────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "500",
  },

  // ── Step Indicator ────────────────────────────────────
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: "#2563EB",
  },
  stepDotDone: {
    backgroundColor: "#059669",
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 4,
    borderRadius: 1,
  },
  stepLineDone: {
    backgroundColor: "#059669",
  },

  // ── Sections ──────────────────────────────────────────
  sectionPad: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionLink: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "600",
  },

  // ── Balance Chip ───────────────────────────────────────
  balanceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.12)",
  },
  balanceChipText: {
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "500",
  },

  // ── Provider ───────────────────────────────────────────
  providerGrid: {
    gap: 8,
  },
  providerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  providerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  providerLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 1,
  },
  providerDesc: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },

  // ── Currency Pills ─────────────────────────────────────
  currencyPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  currencyPillActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  currencyPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  currencyPillTextActive: {
    color: "#fff",
  },

  // ── Confirm Step ───────────────────────────────────────
  confirmHero: {
    alignItems: "center",
    paddingVertical: 28,
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    gap: 6,
  },
  confirmProviderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  confirmProviderLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  confirmAmount: {
    fontSize: 34,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -1,
    marginTop: 4,
  },
  confirmTo: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F1F5F9",
  },
  reviewLabel: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  reviewValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    textAlign: "right",
    flex: 1,
    marginLeft: 12,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
    lineHeight: 18,
    fontWeight: "500",
  },

  // ── Processing ────────────────────────────────────────
  processingTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 8,
  },
  processingSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
  },

  // ── Result ─────────────────────────────────────────────
  resultCard: {
    alignItems: "center",
    width: "100%",
    gap: 8,
  },
  resultIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  resultSubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 260,
  },
  resultRefWrap: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 4,
  },
  resultRefLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  resultRef: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
    marginTop: 3,
    fontVariant: ["tabular-nums"],
  },

  // ── Recent Transfers ───────────────────────────────────
  txCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  txItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F8FAFC",
    gap: 12,
  },
  txAvatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  txRecipient: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 2,
  },
  txMeta: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  txAmount: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },

  // Skeleton rows inside txCard
  txSkeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  txSkeletonAvatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#E2E8F0",
  },
  txSkeletonLine1: {
    width: "55%",
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
  },
  txSkeletonLine2: {
    width: "35%",
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F1F5F9",
  },
  txSkeletonAmount: {
    width: 60,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#E2E8F0",
  },
});
