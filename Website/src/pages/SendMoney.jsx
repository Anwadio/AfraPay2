/* eslint-disable no-console */
import React, { useState, useCallback, useRef, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  User,
  Repeat2,
  Info,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { DashboardSection } from "../components/layout/DashboardUtils";
import { Button, Badge } from "../components/ui";
import {
  PageContainer,
  AnimatedSection,
  SectionHeader,
  GlassCard,
} from "../components/ui/PremiumUI";
import { useAuth } from "../contexts/AuthContext";
import { paymentAPI } from "../services/api";
import { cn } from "../utils";

/* ── UUID v4 ─────────────────────────────────────────────────────────────── */
function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16),
  );
}

/* ── Constants ───────────────────────────────────────────────────────────── */
const PROVIDERS = [
  {
    id: "mpesa",
    label: "M-Pesa",
    description: "Safaricom · Kenya",
    currencies: ["KES"],
    defaultCurrency: "KES",
    icon: "📱",
    accent: "from-green-500 to-emerald-600",
    hint: "e.g. +254712345678",
    inputType: "phone",
  },
  {
    id: "mtn",
    label: "MTN MoMo",
    description: "MTN Mobile Money · West/East Africa",
    currencies: ["GHS", "UGX", "RWF", "NGN", "XOF"],
    defaultCurrency: "GHS",
    icon: "📲",
    accent: "from-yellow-400 to-orange-500",
    hint: "e.g. +233201234567",
    inputType: "phone",
  },
  {
    id: "wallet",
    label: "AfraPay Wallet",
    description: "Instant · Zero fee",
    currencies: ["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR"],
    defaultCurrency: "USD",
    icon: "💼",
    accent: "from-blue-500 to-indigo-600",
    hint: "Recipient's registered phone number",
    inputType: "phone",
  },
  {
    id: "paystack",
    label: "Paystack",
    description: "Bank Transfer · NGN · GHS · KES · ZAR",
    currencies: ["NGN", "GHS", "ZAR", "KES"],
    defaultCurrency: "NGN",
    icon: "🏦",
    accent: "from-teal-500 to-cyan-600",
    hint: "10-digit account number",
    inputType: "bank",
  },
  {
    id: "flutterwave",
    label: "Flutterwave",
    description: "Bank Transfer · Pan-Africa",
    currencies: ["NGN", "GHS", "KES", "ZAR", "UGX", "EUR", "USD", "GBP"],
    defaultCurrency: "NGN",
    icon: "🌊",
    accent: "from-orange-500 to-rose-500",
    hint: "Bank account number",
    inputType: "bank",
  },
  {
    id: "stripe",
    label: "Stripe",
    description: "Connected Account · USD · EUR · GBP",
    currencies: ["USD", "EUR", "GBP", "CAD", "AUD"],
    defaultCurrency: "USD",
    icon: "⚡",
    accent: "from-violet-500 to-purple-600",
    hint: "acct_xxxxxxxxxxxxxxxxxx",
    inputType: "stripe_account",
  },
];

const CURRENCY_FLAGS = {
  KES: "🇰🇪",
  GHS: "🇬🇭",
  UGX: "🇺🇬",
  RWF: "🇷🇼",
  NGN: "🇳🇬",
  XOF: "🌍",
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  ZAR: "🇿🇦",
  CAD: "🇨🇦",
  AUD: "🇦🇺",
};

const STEPS = {
  FORM: "form",
  CONFIRM: "confirm",
  PROCESSING: "processing",
  RESULT: "result",
};

/* ── Demo recent transfers ───────────────────────────────────────────────── */
const DEMO_RECENT = [
  {
    id: 1,
    name: "Kofi Mensah",
    phone: "+233201234567",
    provider: "MTN MoMo",
    amount: 150,
    currency: "GHS",
    date: "Mar 12, 2026",
    status: "success",
  },
  {
    id: 2,
    name: "Amina Hassan",
    phone: "+254712345678",
    provider: "M-Pesa",
    amount: 2000,
    currency: "KES",
    date: "Mar 10, 2026",
    status: "success",
  },
  {
    id: 3,
    name: "David Okafor",
    phone: "+2348012345678",
    provider: "AfraPay Wallet",
    amount: 50,
    currency: "USD",
    date: "Mar 8, 2026",
    status: "failed",
  },
  {
    id: 4,
    name: "Fatou Diallo",
    phone: "+221771234567",
    provider: "MTN MoMo",
    amount: 75,
    currency: "XOF",
    date: "Mar 5, 2026",
    status: "success",
  },
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function formatCurrency(amount, currency) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
}

function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 4) + "****" + phone.slice(-3);
}

function maskAccount(acct) {
  if (!acct || acct.length < 5) return acct;
  return acct.slice(0, 3) + "****" + acct.slice(-3);
}

function isBankProvider(id) {
  return id === "paystack" || id === "flutterwave";
}
function isStripeProvider(id) {
  return id === "stripe";
}

/* ── ProviderCard ────────────────────────────────────────────────────────── */
function ProviderCard({ provider, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(provider.id)}
      className={cn(
        "flex items-center gap-3 w-full p-3 rounded-xl border-2 text-left",
        "transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        selected
          ? `border-transparent bg-gradient-to-r ${provider.accent} text-white shadow-md`
          : "border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-sm text-neutral-900 dark:text-white",
      )}
      aria-pressed={selected}
    >
      <span className="text-2xl shrink-0">{provider.icon}</span>
      <div className="min-w-0">
        <p
          className={cn("font-semibold text-sm", selected ? "text-white" : "")}
        >
          {provider.label}
        </p>
        <p
          className={cn(
            "text-xs truncate",
            selected
              ? "text-white/80"
              : "text-neutral-500 dark:text-neutral-400",
          )}
        >
          {provider.description}
        </p>
      </div>
      {selected && (
        <CheckCircle2 className="w-4 h-4 ml-auto shrink-0 text-white" />
      )}
    </button>
  );
}

function FieldLabel({ htmlFor, children, required }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
    >
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-1 text-xs text-red-600 flex items-center gap-1"
    >
      <AlertCircle className="w-3 h-3 shrink-0" />
      {message}
    </p>
  );
}

function ReviewRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-neutral-100 dark:border-neutral-700 last:border-0">
      <span className="text-sm text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-semibold text-right",
          accent || "text-neutral-900 dark:text-white",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ── SendMoneyForm (inline, full-page) ──────────────────────────────────── */
function SendMoneyForm({ onSuccess }) {
  const idPrefix = useId();

  const [step, setStep] = useState(STEPS.FORM);
  const [direction, setDirection] = useState(1);
  const [provider, setProvider] = useState("mpesa");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);

  const idempotencyKey = useRef(uuidv4());
  const selectedProvider =
    PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];
  const parsedAmount = parseFloat(amount);

  const handleProviderChange = useCallback((newProvider) => {
    const pDef = PROVIDERS.find((p) => p.id === newProvider);
    setProvider(newProvider);
    setCurrency(pDef?.defaultCurrency || "USD");
    setErrors({});
  }, []);

  const validate = () => {
    const errs = {};
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0)
      errs.amount = "Enter a valid amount greater than zero.";
    if (parsedAmount > 50000)
      errs.amount = "Maximum single transfer is 50,000.";
    if (isStripeProvider(provider)) {
      if (!accountNumber.trim())
        errs.account = "Stripe connected account ID is required.";
      else if (!/^acct_[a-zA-Z0-9]{16,}$/.test(accountNumber.trim()))
        errs.account = "Enter a valid Stripe account ID (acct_…).";
    } else if (isBankProvider(provider)) {
      if (!accountNumber.trim()) errs.account = "Account number is required.";
      else if (!/^\d{6,20}$/.test(accountNumber.trim()))
        errs.account = "Account number must be 6–20 digits.";
      if (!bankCode.trim()) errs.bankCode = "Bank code is required.";
    } else {
      if (!phone.trim()) errs.phone = "Phone number is required.";
      else if (!/^\+\d{7,15}$/.test(phone.trim()))
        errs.phone = "Include country code, e.g. +254712345678.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goTo = (nextStep, dir = 1) => {
    setDirection(dir);
    setStep(nextStep);
  };

  const handleSubmitSend = async () => {
    goTo(STEPS.PROCESSING);
    try {
      const payload = {
        amount: parsedAmount,
        currency,
        provider,
        description: description.trim() || undefined,
        ...(isStripeProvider(provider) || isBankProvider(provider)
          ? {
              accountNumber: accountNumber.trim(),
              bankCode: bankCode.trim() || undefined,
              accountName: accountName.trim() || undefined,
            }
          : { receiverPhone: phone.trim() }),
      };
      const res = await paymentAPI.sendMoney(payload, idempotencyKey.current);
      setResult({ success: true, data: res?.data || res });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Transfer failed. Please try again.";
      setResult({ success: false, error: msg });
    }
    goTo(STEPS.RESULT);
  };

  const handleReset = () => {
    setStep(STEPS.FORM);
    setAmount("");
    setPhone("");
    setDescription("");
    setAccountNumber("");
    setBankCode("");
    setAccountName("");
    setErrors({});
    setResult(null);
    idempotencyKey.current = uuidv4();
  };

  const slideVariants = {
    enter: (dir) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
    center: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
    },
    exit: (dir) => ({
      opacity: 0,
      x: dir > 0 ? -40 : 40,
      transition: { duration: 0.2 },
    }),
  };

  const recipientDisplay =
    isBankProvider(provider) || isStripeProvider(provider)
      ? maskAccount(accountNumber)
      : maskPhone(phone);

  return (
    <GlassCard className="p-0 overflow-hidden">
      {/* Step indicator */}
      <div className="flex items-center gap-2 px-6 pt-5 pb-3 border-b border-neutral-100 dark:border-neutral-700/50">
        {[STEPS.FORM, STEPS.CONFIRM, STEPS.RESULT].map((s, i) => (
          <React.Fragment key={s}>
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                step === s
                  ? "bg-blue-600 text-white shadow-md"
                  : i <
                      [
                        STEPS.FORM,
                        STEPS.CONFIRM,
                        STEPS.PROCESSING,
                        STEPS.RESULT,
                      ].indexOf(step)
                    ? "bg-emerald-500 text-white"
                    : "bg-neutral-100 dark:bg-neutral-700 text-neutral-400",
              )}
            >
              {i <
              [
                STEPS.FORM,
                STEPS.CONFIRM,
                STEPS.PROCESSING,
                STEPS.RESULT,
              ].indexOf(step) ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                i + 1
              )}
            </div>
            {i < 2 && (
              <div
                className={cn(
                  "flex-1 h-0.5 rounded",
                  i <
                    [
                      STEPS.FORM,
                      STEPS.CONFIRM,
                      STEPS.PROCESSING,
                      STEPS.RESULT,
                    ].indexOf(step)
                    ? "bg-emerald-400"
                    : "bg-neutral-200 dark:bg-neutral-700",
                )}
              />
            )}
          </React.Fragment>
        ))}
        <span className="ml-2 text-xs text-neutral-400 capitalize">
          {step === STEPS.PROCESSING ? "processing" : step}
        </span>
      </div>

      <div className="p-6 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {/* ── FORM step ─────────────────────────────────────────────── */}
          {step === STEPS.FORM && (
            <motion.div
              key="form"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-5">
                Send Money
              </h2>

              {/* Provider grid */}
              <div className="mb-5">
                <FieldLabel>Select Provider</FieldLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {PROVIDERS.map((p) => (
                    <ProviderCard
                      key={p.id}
                      provider={p}
                      selected={provider === p.id}
                      onSelect={handleProviderChange}
                    />
                  ))}
                </div>
              </div>

              {/* Amount + currency */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <FieldLabel htmlFor={`${idPrefix}-amount`} required>
                    Amount
                  </FieldLabel>
                  <input
                    id={`${idPrefix}-amount`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setErrors((p) => ({ ...p, amount: undefined }));
                    }}
                    aria-invalid={!!errors.amount}
                    aria-describedby={
                      errors.amount ? `${idPrefix}-amount-err` : undefined
                    }
                    className={cn(
                      "w-full px-3 py-2.5 rounded-xl border text-sm font-mono bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                      errors.amount
                        ? "border-red-400"
                        : "border-neutral-200 dark:border-neutral-600",
                    )}
                  />
                  <FieldError
                    id={`${idPrefix}-amount-err`}
                    message={errors.amount}
                  />
                </div>
                <div className="w-28">
                  <FieldLabel htmlFor={`${idPrefix}-currency`}>
                    Currency
                  </FieldLabel>
                  <select
                    id={`${idPrefix}-currency`}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {selectedProvider.currencies.map((c) => (
                      <option key={c} value={c}>
                        {CURRENCY_FLAGS[c] || ""} {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recipient field */}
              {isStripeProvider(provider) ? (
                <div className="mb-4">
                  <FieldLabel htmlFor={`${idPrefix}-account`} required>
                    Stripe Account ID
                  </FieldLabel>
                  <input
                    id={`${idPrefix}-account`}
                    type="text"
                    placeholder="acct_xxxxxxxxxxxxxxxxxx"
                    value={accountNumber}
                    onChange={(e) => {
                      setAccountNumber(e.target.value);
                      setErrors((p) => ({ ...p, account: undefined }));
                    }}
                    aria-invalid={!!errors.account}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-xl border text-sm font-mono bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                      errors.account
                        ? "border-red-400"
                        : "border-neutral-200 dark:border-neutral-600",
                    )}
                  />
                  <FieldError
                    id={`${idPrefix}-account-err`}
                    message={errors.account}
                  />
                </div>
              ) : isBankProvider(provider) ? (
                <>
                  <div className="mb-4">
                    <FieldLabel htmlFor={`${idPrefix}-account`} required>
                      Account Number
                    </FieldLabel>
                    <input
                      id={`${idPrefix}-account`}
                      type="text"
                      placeholder={selectedProvider.hint}
                      value={accountNumber}
                      onChange={(e) => {
                        setAccountNumber(e.target.value);
                        setErrors((p) => ({ ...p, account: undefined }));
                      }}
                      aria-invalid={!!errors.account}
                      className={cn(
                        "w-full px-3 py-2.5 rounded-xl border text-sm font-mono bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                        errors.account
                          ? "border-red-400"
                          : "border-neutral-200 dark:border-neutral-600",
                      )}
                    />
                    <FieldError
                      id={`${idPrefix}-account-err`}
                      message={errors.account}
                    />
                  </div>
                  <div className="mb-4">
                    <FieldLabel htmlFor={`${idPrefix}-bankcode`} required>
                      Bank Code
                    </FieldLabel>
                    <input
                      id={`${idPrefix}-bankcode`}
                      type="text"
                      placeholder="e.g. 044"
                      value={bankCode}
                      onChange={(e) => {
                        setBankCode(e.target.value);
                        setErrors((p) => ({ ...p, bankCode: undefined }));
                      }}
                      className={cn(
                        "w-full px-3 py-2.5 rounded-xl border text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                        errors.bankCode
                          ? "border-red-400"
                          : "border-neutral-200 dark:border-neutral-600",
                      )}
                    />
                    <FieldError
                      id={`${idPrefix}-bankcode-err`}
                      message={errors.bankCode}
                    />
                  </div>
                  <div className="mb-4">
                    <FieldLabel htmlFor={`${idPrefix}-accountname`}>
                      Account Name (optional)
                    </FieldLabel>
                    <input
                      id={`${idPrefix}-accountname`}
                      type="text"
                      placeholder="e.g. John Doe"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              ) : (
                <div className="mb-4">
                  <FieldLabel htmlFor={`${idPrefix}-phone`} required>
                    Recipient Phone Number
                  </FieldLabel>
                  <input
                    id={`${idPrefix}-phone`}
                    type="tel"
                    placeholder={selectedProvider.hint}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setErrors((p) => ({ ...p, phone: undefined }));
                    }}
                    aria-invalid={!!errors.phone}
                    aria-describedby={
                      errors.phone ? `${idPrefix}-phone-err` : undefined
                    }
                    className={cn(
                      "w-full px-3 py-2.5 rounded-xl border text-sm font-mono bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors",
                      errors.phone
                        ? "border-red-400"
                        : "border-neutral-200 dark:border-neutral-600",
                    )}
                  />
                  <FieldError
                    id={`${idPrefix}-phone-err`}
                    message={errors.phone}
                  />
                </div>
              )}

              {/* Description */}
              <div className="mb-6">
                <FieldLabel htmlFor={`${idPrefix}-desc`}>
                  Description (optional)
                </FieldLabel>
                <input
                  id={`${idPrefix}-desc`}
                  type="text"
                  maxLength={80}
                  placeholder="e.g. Rent payment"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <Button
                variant="primary"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => {
                  if (validate()) goTo(STEPS.CONFIRM);
                }}
              >
                Review Transfer <ChevronRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {/* ── CONFIRM step ──────────────────────────────────────────── */}
          {step === STEPS.CONFIRM && (
            <motion.div
              key="confirm"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                Confirm Transfer
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
                Please review the details before sending.
              </p>

              <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-4 mb-5">
                <ReviewRow
                  label="Provider"
                  value={`${selectedProvider.icon} ${selectedProvider.label}`}
                />
                <ReviewRow
                  label="Amount"
                  value={formatCurrency(parsedAmount, currency)}
                  accent="text-blue-600 dark:text-blue-400"
                />
                <ReviewRow label="Recipient" value={recipientDisplay} />
                {description && <ReviewRow label="Note" value={description} />}
                <ReviewRow label="Fee" value="Free" accent="text-emerald-600" />
              </div>

              <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl p-3 mb-6 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  Transfers cannot be reversed once sent. Verify the recipient
                  details carefully.
                </span>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 flex items-center justify-center gap-1"
                  onClick={() => goTo(STEPS.FORM, -1)}
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 flex items-center justify-center gap-2"
                  onClick={handleSubmitSend}
                >
                  <Send className="w-4 h-4" /> Send Now
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── PROCESSING step ────────────────────────────────────────── */}
          {step === STEPS.PROCESSING && (
            <motion.div
              key="processing"
              variants={{
                enter: { opacity: 0 },
                center: { opacity: 1 },
                exit: { opacity: 0 },
              }}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col items-center justify-center py-12 gap-4"
            >
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <p className="text-base font-semibold text-neutral-700 dark:text-neutral-200">
                Processing your transfer…
              </p>
              <p className="text-sm text-neutral-400">
                This usually takes a few seconds.
              </p>
            </motion.div>
          )}

          {/* ── RESULT step ────────────────────────────────────────────── */}
          {step === STEPS.RESULT && (
            <motion.div
              key="result"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col items-center py-10 text-center gap-4"
            >
              {result?.success ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                    Transfer Sent!
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs">
                    {formatCurrency(parsedAmount, currency)} has been sent via{" "}
                    {selectedProvider.label}.
                    {result.data?.transactionId
                      ? ` Ref: ${result.data.transactionId}`
                      : ""}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="primary"
                      onClick={handleReset}
                      className="flex items-center gap-2"
                    >
                      <Repeat2 className="w-4 h-4" /> Send Again
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                    Transfer Failed
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs">
                    {result?.error}
                  </p>
                  <Button
                    variant="primary"
                    onClick={handleReset}
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
const SendMoney = () => {
  const { user } = useAuth();

  const dashboardUser = {
    name: user?.name || user?.email || "User",
    email: user?.email || "",
    avatar: user?.avatar || null,
  };

  return (
    <DashboardLayout user={dashboardUser}>
      <PageContainer>
        {/* Page header */}
        <AnimatedSection>
          <SectionHeader
            title="Send Money"
            subtitle="Transfer funds securely via M-Pesa, MTN MoMo, bank transfer, or AfraPay wallet"
            icon={<Send className="w-6 h-6" />}
            className="mb-6"
          />
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Send form — takes up most space */}
          <div className="lg:col-span-3">
            <AnimatedSection delay={0.05}>
              <SendMoneyForm onSuccess={() => {}} />
            </AnimatedSection>
          </div>

          {/* Right column: tips + recent */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Security tip */}
            <AnimatedSection delay={0.08}>
              <GlassCard className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 shrink-0">
                  <Info className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 mb-1">
                    Stay safe
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    AfraPay will never ask you to share your PIN or OTP. Only
                    send money to people you trust.
                  </p>
                </div>
              </GlassCard>
            </AnimatedSection>

            {/* Recent transfers */}
            <AnimatedSection delay={0.11}>
              <DashboardSection
                title="Recent Transfers"
                description="Your last 4 outgoing transactions"
              >
                <div className="space-y-2">
                  {DEMO_RECENT.map((tx) => (
                    <div
                      key={tx.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl",
                        "bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors",
                      )}
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">
                          {tx.name}
                        </p>
                        <p className="text-xs text-neutral-400 truncate">
                          {tx.provider} · {tx.date}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={cn(
                            "text-sm font-bold",
                            tx.status === "success"
                              ? "text-red-500"
                              : "text-neutral-400",
                          )}
                        >
                          {tx.status === "success" ? "−" : ""}
                          {formatCurrency(tx.amount, tx.currency)}
                        </p>
                        <Badge
                          variant={
                            tx.status === "success" ? "success" : "danger"
                          }
                          size="sm"
                        >
                          {tx.status === "success" ? "Sent" : "Failed"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardSection>
            </AnimatedSection>

            {/* Limits info */}
            <AnimatedSection delay={0.14}>
              <GlassCard className="p-4">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 mb-3 flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-blue-500" /> Transfer
                  Limits
                </p>
                <div className="space-y-2 text-xs text-neutral-500 dark:text-neutral-400">
                  {[
                    { label: "Per transaction", value: "50,000 USD" },
                    { label: "Daily limit", value: "100,000 USD" },
                    { label: "Monthly limit", value: "500,000 USD" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between">
                      <span>{row.label}</span>
                      <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </AnimatedSection>
          </div>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
};

export default SendMoney;
