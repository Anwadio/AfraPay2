/**
 * SendMoneyModal.jsx
 *
 * Production-ready Send Money flow for AfraPay.
 * Supports M-Pesa, MTN Mobile Money, and internal wallet transfers.
 *
 * Flow: Form → Confirm → Processing → Result
 */

import React, { useState, useCallback, useRef, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  AlertTriangle,
  PhoneCall,
  ArrowUpRight,
  Info,
} from "lucide-react";
import { cn } from "../../utils";
import { Button } from "../ui";
import { paymentAPI } from "../../services/api";

/** RFC-4122 UUID v4 — crypto.getRandomValues for browser compatibility */
function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16),
  );
}

// ── Constants ────────────────────────────────────────────────────────────────

const PROVIDERS = [
  {
    id: "mpesa",
    label: "M-Pesa",
    description: "Safaricom • Kenya",
    currencies: ["KES"],
    defaultCurrency: "KES",
    icon: "📱",
    accent: "from-green-500 to-emerald-600",
    ring: "ring-green-200",
    hint: "e.g. +254712345678",
    inputType: "phone",
  },
  {
    id: "mtn",
    label: "MTN MoMo",
    description: "MTN Mobile Money • West/East Africa",
    currencies: ["GHS", "UGX", "RWF", "NGN", "XOF"],
    defaultCurrency: "GHS",
    icon: "📲",
    accent: "from-yellow-400 to-orange-500",
    ring: "ring-yellow-200",
    hint: "e.g. +233201234567",
    inputType: "phone",
  },
  {
    id: "wallet",
    label: "AfraPay Wallet",
    description: "Instant • Zero fee",
    currencies: ["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR"],
    defaultCurrency: "USD",
    icon: "💼",
    accent: "from-blue-500 to-indigo-600",
    ring: "ring-blue-200",
    hint: "Recipient’s registered phone number",
    inputType: "phone",
  },
  {
    id: "paystack",
    label: "Paystack",
    description: "Bank Transfer • NGN • GHS • KES • ZAR",
    currencies: ["NGN", "GHS", "ZAR", "KES"],
    defaultCurrency: "NGN",
    icon: "🏦",
    accent: "from-teal-500 to-cyan-600",
    ring: "ring-teal-200",
    hint: "10-digit account number",
    inputType: "bank",
  },
  {
    id: "flutterwave",
    label: "Flutterwave",
    description: "Bank Transfer • Pan-Africa",
    currencies: ["NGN", "GHS", "KES", "ZAR", "UGX", "EUR", "USD", "GBP"],
    defaultCurrency: "NGN",
    icon: "🌊",
    accent: "from-orange-500 to-rose-500",
    ring: "ring-orange-200",
    hint: "Bank account number",
    inputType: "bank",
  },
  {
    id: "stripe",
    label: "Stripe",
    description: "Connected Account • USD • EUR • GBP",
    currencies: ["USD", "EUR", "GBP", "CAD", "AUD"],
    defaultCurrency: "USD",
    icon: "⚡",
    accent: "from-violet-500 to-purple-600",
    ring: "ring-violet-200",
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
  TZS: "🇹🇿",
  ZMW: "🇿🇲",
  CAD: "🇨🇦",
  AUD: "🇦🇺",
};

const STEPS = {
  FORM: "form",
  CONFIRM: "confirm",
  PROCESSING: "processing",
  RESULT: "result",
};

// ── Animation variants ────────────────────────────────────────────────────────

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2, delay: 0.1 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
  exit: { opacity: 0, scale: 0.96, y: 10, transition: { duration: 0.2 } },
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

// ── Utility helpers ───────────────────────────────────────────────────────────

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

/** Returns true for phone / USSD-based providers */
function isMobileProvider(id) {
  return id === "mpesa" || id === "mtn" || id === "wallet";
}

/** Returns true for bank account transfer providers */
function isBankProvider(id) {
  return id === "paystack" || id === "flutterwave";
}

/** Returns true for Stripe connected-account transfers */
function isStripeProvider(id) {
  return id === "stripe";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProviderCard({ provider, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(provider.id)}
      className={cn(
        "flex items-center gap-3 w-full p-3 rounded-xl border-2 text-left",
        "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1",
        selected
          ? `border-transparent bg-gradient-to-r ${provider.accent} text-white shadow-md focus:ring-blue-400`
          : `border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm text-gray-900 focus:ring-gray-300`,
      )}
      aria-pressed={selected}
    >
      <span className="text-2xl flex-shrink-0" aria-hidden="true">
        {provider.icon}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "font-semibold text-sm",
            selected ? "text-white" : "text-gray-900",
          )}
        >
          {provider.label}
        </p>
        <p
          className={cn(
            "text-xs truncate",
            selected ? "text-white/80" : "text-gray-500",
          )}
        >
          {provider.description}
        </p>
      </div>
      {selected && (
        <CheckCircle2 className="w-4 h-4 ml-auto flex-shrink-0 text-white" />
      )}
    </button>
  );
}

function FieldLabel({ htmlFor, children, required }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-gray-700 mb-1"
    >
      {children}
      {required && (
        <span className="text-red-500 ml-0.5" aria-hidden="true">
          *
        </span>
      )}
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
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {message}
    </p>
  );
}

function ReviewRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={cn(
          "text-sm font-semibold text-right",
          accent || "text-gray-900",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ── Main Modal Component ──────────────────────────────────────────────────────

/**
 * SendMoneyModal
 *
 * @param {Object}   props
 * @param {boolean}  props.open           Controls visibility
 * @param {Function} props.onClose        Called when the modal should close
 * @param {Function} [props.onSuccess]    Called with the result object on success
 */
export default function SendMoneyModal({ open, onClose, onSuccess }) {
  const idPrefix = useId();

  // Form state
  const [step, setStep] = useState(STEPS.FORM);
  const [direction, setDirection] = useState(1);

  const [provider, setProvider] = useState("mpesa");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");

  // Bank-transfer recipient fields (paystack / flutterwave / stripe)
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountName, setAccountName] = useState("");

  // Validation errors
  const [errors, setErrors] = useState({});

  // Request state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { success, data, error }

  // Idempotency key — generated once per form session, reset on new attempt
  const idempotencyKey = useRef(uuidv4());

  // ── Derived values ──────────────────────────────────────────────────────────

  const selectedProvider =
    PROVIDERS.find((p) => p.id === provider) || PROVIDERS[0];
  const parsedAmount = parseFloat(amount);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleProviderChange = useCallback(
    (newProvider) => {
      const pDef = PROVIDERS.find((p) => p.id === newProvider);
      setProvider(newProvider);
      // Auto-switch currency to provider's default if current is incompatible
      if (pDef && !pDef.currencies.includes(currency)) {
        setCurrency(pDef.defaultCurrency);
      }
      // Reset all recipient fields when the provider changes
      setPhone("");
      setAccountNumber("");
      setBankCode("");
      setAccountName("");
      setErrors({});
    },
    [currency],
  );

  const validate = useCallback(() => {
    const errs = {};

    if (!provider) errs.provider = "Please select a provider";

    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      errs.amount = "Enter a valid positive amount";
    } else if (parsedAmount > 1_000_000) {
      errs.amount = "Amount cannot exceed 1,000,000";
    }

    if (!currency || currency.length !== 3) {
      errs.currency = "Select a currency";
    }

    if (isMobileProvider(provider)) {
      const cleanPhone = phone.trim().replace(/\s/g, "");
      if (!cleanPhone) {
        errs.phone = "Phone number is required";
      } else if (!/^[+\d][\d\s\-().]{6,19}$/.test(cleanPhone)) {
        errs.phone = "Enter a valid international phone number";
      }
    } else if (isBankProvider(provider)) {
      if (!accountNumber.trim()) {
        errs.accountNumber = "Account number is required";
      } else if (!/^\d{5,20}$/.test(accountNumber.trim())) {
        errs.accountNumber =
          "Enter a valid numeric account number (5–20 digits)";
      }
      if (!bankCode.trim()) {
        errs.bankCode = "Bank code is required";
      }
      if (!accountName.trim()) {
        errs.accountName = "Account holder name is required";
      } else if (accountName.trim().length < 2) {
        errs.accountName = "Enter the full account holder name";
      }
    } else if (isStripeProvider(provider)) {
      if (!accountNumber.trim()) {
        errs.accountNumber = "Connected Account ID is required";
      } else if (!/^acct_[a-zA-Z0-9]{8,}$/.test(accountNumber.trim())) {
        errs.accountNumber =
          "Enter a valid Stripe Connected Account ID (e.g. acct_…)";
      }
    }

    if (description && description.length > 200) {
      errs.description = "Description must be 200 characters or fewer";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [
    provider,
    amount,
    parsedAmount,
    currency,
    phone,
    accountNumber,
    bankCode,
    accountName,
    description,
  ]);

  const goToConfirm = useCallback(() => {
    if (!validate()) return;
    setDirection(1);
    setStep(STEPS.CONFIRM);
  }, [validate]);

  const goBackToForm = useCallback(() => {
    setDirection(-1);
    setStep(STEPS.FORM);
  }, []);

  const handleSubmit = useCallback(async () => {
    setDirection(1);
    setStep(STEPS.PROCESSING);
    setLoading(true);

    try {
      const response = await paymentAPI.sendMoney(
        {
          amount: parsedAmount,
          currency,
          provider,
          ...(isMobileProvider(provider)
            ? { receiverPhone: phone.trim() }
            : isBankProvider(provider)
              ? {
                  receiverAccountNumber: accountNumber.trim(),
                  receiverBankCode: bankCode.trim(),
                  receiverAccountName: accountName.trim(),
                }
              : { receiverAccountNumber: accountNumber.trim() }), // stripe
          description: description.trim() || undefined,
        },
        idempotencyKey.current,
      );

      setResult({ success: true, data: response.data || response });
      setStep(STEPS.RESULT);
      onSuccess?.(response.data || response);
    } catch (err) {
      const errorMsg =
        err?.response?.data?.error?.message ||
        err?.message ||
        "Payment failed. Please try again.";
      setResult({ success: false, error: errorMsg });
      setStep(STEPS.RESULT);
    } finally {
      setLoading(false);
    }
  }, [
    parsedAmount,
    currency,
    provider,
    phone,
    accountNumber,
    bankCode,
    accountName,
    description,
    onSuccess,
  ]);

  const handleClose = useCallback(() => {
    if (loading) return; // prevent close while in flight
    onClose();
    // Reset state after animation
    setTimeout(() => {
      setStep(STEPS.FORM);
      setDirection(1);
      setAmount("");
      setPhone("");
      setAccountNumber("");
      setBankCode("");
      setAccountName("");
      setDescription("");
      setErrors({});
      setResult(null);
      idempotencyKey.current = uuidv4();
    }, 300);
  }, [loading, onClose]);

  const handleRetry = useCallback(() => {
    idempotencyKey.current = uuidv4(); // new key for retry
    setResult(null);
    setDirection(-1);
    setStep(STEPS.FORM);
  }, []);

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderForm = () => (
    <div className="space-y-5">
      {/* Provider selection */}
      <fieldset>
        <legend className="block text-sm font-medium text-gray-700 mb-2">
          Send via{" "}
          <span className="text-red-500" aria-hidden="true">
            *
          </span>
        </legend>
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-2"
          role="radiogroup"
        >
          {PROVIDERS.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              selected={provider === p.id}
              onSelect={handleProviderChange}
            />
          ))}
        </div>
        {errors.provider && (
          <FieldError
            id={`${idPrefix}-provider-err`}
            message={errors.provider}
          />
        )}
      </fieldset>

      {/* Amount + Currency */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <FieldLabel htmlFor={`${idPrefix}-amount`} required>
            Amount
          </FieldLabel>
          <div className="relative">
            <input
              id={`${idPrefix}-amount`}
              type="number"
              min="0.01"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setErrors((er) => ({ ...er, amount: undefined }));
              }}
              aria-describedby={
                errors.amount ? `${idPrefix}-amount-err` : undefined
              }
              aria-required="true"
              aria-invalid={!!errors.amount}
              className={cn(
                "w-full px-4 py-3 border rounded-lg text-gray-900 font-semibold text-lg",
                "focus:outline-none focus:ring-2 focus:ring-offset-1",
                "transition-colors duration-200",
                errors.amount
                  ? "border-red-400 bg-red-50 focus:ring-red-400"
                  : "border-gray-300 bg-white focus:ring-blue-400 hover:border-gray-400",
              )}
            />
          </div>
          <FieldError id={`${idPrefix}-amount-err`} message={errors.amount} />
        </div>

        <div>
          <FieldLabel htmlFor={`${idPrefix}-currency`} required>
            Currency
          </FieldLabel>
          <select
            id={`${idPrefix}-currency`}
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value);
              setErrors((er) => ({ ...er, currency: undefined }));
            }}
            aria-required="true"
            className="w-full px-3 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 hover:border-gray-400 h-[50px]"
          >
            {selectedProvider.currencies.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_FLAGS[c] || ""} {c}
              </option>
            ))}
          </select>
          <FieldError
            id={`${idPrefix}-currency-err`}
            message={errors.currency}
          />
        </div>
      </div>

      {/* Recipient details — rendered based on provider type */}
      {isMobileProvider(provider) ? (
        <div>
          <FieldLabel htmlFor={`${idPrefix}-phone`} required>
            {provider === "wallet"
              ? "Recipient’s Phone Number"
              : "Recipient’s Mobile Number"}
          </FieldLabel>
          <div className="relative">
            <PhoneCall
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              aria-hidden="true"
            />
            <input
              id={`${idPrefix}-phone`}
              type="tel"
              autoComplete="tel"
              placeholder={selectedProvider.hint}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setErrors((er) => ({ ...er, phone: undefined }));
              }}
              aria-describedby={
                errors.phone
                  ? `${idPrefix}-phone-err`
                  : `${idPrefix}-phone-hint`
              }
              aria-required="true"
              aria-invalid={!!errors.phone}
              className={cn(
                "w-full pl-10 pr-4 py-3 border rounded-lg text-gray-900 font-medium",
                "focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors duration-200",
                errors.phone
                  ? "border-red-400 bg-red-50 focus:ring-red-400"
                  : "border-gray-300 bg-white focus:ring-blue-400 hover:border-gray-400",
              )}
            />
          </div>
          <p
            id={`${idPrefix}-phone-hint`}
            className="mt-1 text-xs text-gray-500 flex items-center gap-1"
          >
            <Info className="w-3 h-3" aria-hidden="true" />
            {provider === "wallet"
              ? "Phone number linked to the recipient’s AfraPay account"
              : `Include country code — ${selectedProvider.hint}`}
          </p>
          <FieldError id={`${idPrefix}-phone-err`} message={errors.phone} />
        </div>
      ) : isBankProvider(provider) ? (
        <div className="space-y-4">
          {/* Account number */}
          <div>
            <FieldLabel htmlFor={`${idPrefix}-acct-num`} required>
              Account Number
            </FieldLabel>
            <input
              id={`${idPrefix}-acct-num`}
              type="text"
              inputMode="numeric"
              placeholder={selectedProvider.hint}
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value);
                setErrors((er) => ({ ...er, accountNumber: undefined }));
              }}
              aria-required="true"
              aria-invalid={!!errors.accountNumber}
              className={cn(
                "w-full px-4 py-3 border rounded-lg text-gray-900 font-medium",
                "focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors duration-200",
                errors.accountNumber
                  ? "border-red-400 bg-red-50 focus:ring-red-400"
                  : "border-gray-300 bg-white focus:ring-blue-400 hover:border-gray-400",
              )}
            />
            <FieldError
              id={`${idPrefix}-acct-num-err`}
              message={errors.accountNumber}
            />
          </div>
          {/* Bank code */}
          <div>
            <FieldLabel htmlFor={`${idPrefix}-bank-code`} required>
              Bank Code
            </FieldLabel>
            <input
              id={`${idPrefix}-bank-code`}
              type="text"
              placeholder="e.g. 057 (Zenith Bank) / GCB (Ghana)"
              value={bankCode}
              onChange={(e) => {
                setBankCode(e.target.value);
                setErrors((er) => ({ ...er, bankCode: undefined }));
              }}
              aria-required="true"
              aria-invalid={!!errors.bankCode}
              className={cn(
                "w-full px-4 py-3 border rounded-lg text-gray-900 font-medium text-sm",
                "focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors duration-200",
                errors.bankCode
                  ? "border-red-400 bg-red-50 focus:ring-red-400"
                  : "border-gray-300 bg-white focus:ring-blue-400 hover:border-gray-400",
              )}
            />
            <FieldError
              id={`${idPrefix}-bank-code-err`}
              message={errors.bankCode}
            />
          </div>
          {/* Account holder name */}
          <div>
            <FieldLabel htmlFor={`${idPrefix}-acct-name`} required>
              Account Holder Name
            </FieldLabel>
            <input
              id={`${idPrefix}-acct-name`}
              type="text"
              autoComplete="name"
              placeholder="Full name as on bank account"
              value={accountName}
              onChange={(e) => {
                setAccountName(e.target.value);
                setErrors((er) => ({ ...er, accountName: undefined }));
              }}
              aria-required="true"
              aria-invalid={!!errors.accountName}
              className={cn(
                "w-full px-4 py-3 border rounded-lg text-gray-900 font-medium text-sm",
                "focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors duration-200",
                errors.accountName
                  ? "border-red-400 bg-red-50 focus:ring-red-400"
                  : "border-gray-300 bg-white focus:ring-blue-400 hover:border-gray-400",
              )}
            />
            <FieldError
              id={`${idPrefix}-acct-name-err`}
              message={errors.accountName}
            />
          </div>
        </div>
      ) : (
        /* Stripe — single Connected Account ID field */
        <div>
          <FieldLabel htmlFor={`${idPrefix}-acct-num`} required>
            Stripe Connected Account ID
          </FieldLabel>
          <input
            id={`${idPrefix}-acct-num`}
            type="text"
            placeholder={selectedProvider.hint}
            value={accountNumber}
            onChange={(e) => {
              setAccountNumber(e.target.value);
              setErrors((er) => ({ ...er, accountNumber: undefined }));
            }}
            aria-required="true"
            aria-invalid={!!errors.accountNumber}
            className={cn(
              "w-full px-4 py-3 border rounded-lg text-gray-900 font-mono text-sm",
              "focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors duration-200",
              errors.accountNumber
                ? "border-red-400 bg-red-50 focus:ring-red-400"
                : "border-gray-300 bg-white focus:ring-blue-400 hover:border-gray-400",
            )}
          />
          <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
            <Info className="w-3 h-3" aria-hidden="true" />
            The recipient’s Stripe Connect account ID (starts with{" "}
            <code className="font-mono">acct_</code>)
          </p>
          <FieldError
            id={`${idPrefix}-acct-num-err`}
            message={errors.accountNumber}
          />
        </div>
      )}

      {/* Description (optional) */}
      <div>
        <FieldLabel htmlFor={`${idPrefix}-description`}>
          Note <span className="text-gray-400 font-normal">(optional)</span>
        </FieldLabel>
        <input
          id={`${idPrefix}-description`}
          type="text"
          maxLength={200}
          placeholder="e.g. Rent, school fees, family support…"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            setErrors((er) => ({ ...er, description: undefined }));
          }}
          className={cn(
            "w-full px-4 py-3 border rounded-lg text-gray-900 font-medium text-sm",
            "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1",
            "transition-colors duration-200 border-gray-300 bg-white hover:border-gray-400",
          )}
        />
        <FieldError id={`${idPrefix}-desc-err`} message={errors.description} />
      </div>

      {/* CTA */}
      <Button type="button" onClick={goToConfirm} className="w-full" size="lg">
        Review Transfer
        <ChevronRight className="w-4 h-4 ml-1" aria-hidden="true" />
      </Button>
    </div>
  );

  const renderConfirm = () => (
    <div className="space-y-5">
      {/* Hero amount */}
      <div
        className={cn(
          "rounded-2xl p-5 text-white bg-gradient-to-br",
          selectedProvider.accent,
          "shadow-lg",
        )}
      >
        <p className="text-white/80 text-sm font-medium mb-1">
          You are sending
        </p>
        <p className="text-4xl font-bold tabular-nums leading-tight">
          {!isNaN(parsedAmount) ? formatCurrency(parsedAmount, currency) : "—"}
        </p>
        <p className="mt-2 text-white/80 text-sm">
          via {selectedProvider.icon} {selectedProvider.label}
        </p>
      </div>

      {/* Details */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-1 divide-y divide-gray-100">
        {isMobileProvider(provider) ? (
          <ReviewRow label="To" value={maskPhone(phone.trim())} />
        ) : isBankProvider(provider) ? (
          <>
            <ReviewRow
              label="Account"
              value={maskAccount(accountNumber.trim())}
            />
            <ReviewRow label="Bank Code" value={bankCode.trim()} />
            <ReviewRow label="Beneficiary" value={accountName.trim()} />
          </>
        ) : (
          <ReviewRow
            label="Stripe Account"
            value={maskAccount(accountNumber.trim())}
          />
        )}
        <ReviewRow
          label="Provider"
          value={`${selectedProvider.icon}  ${selectedProvider.label}`}
        />
        <ReviewRow
          label="Amount"
          value={
            !isNaN(parsedAmount) ? formatCurrency(parsedAmount, currency) : "—"
          }
          accent="text-blue-700"
        />
        <ReviewRow label="Fee" value="Free" accent="text-emerald-600" />
        {description && <ReviewRow label="Note" value={description} />}
      </div>

      {/* Provider-specific notice */}
      {(provider === "mpesa" || provider === "mtn") && (
        <div className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
          <AlertTriangle
            className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>USSD Push:</strong> The recipient will receive a prompt on
            their phone to approve the payment. Completion may take up to 60
            seconds.
          </p>
        </div>
      )}
      {isBankProvider(provider) && (
        <div className="flex gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3">
          <Info
            className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-xs text-blue-800 leading-relaxed">
            Funds will be transferred to the bank account via{" "}
            <strong>{selectedProvider.label}</strong>. Processing typically
            takes a few hours, but may take up to 24 hours.
          </p>
        </div>
      )}
      {isStripeProvider(provider) && (
        <div className="flex gap-2 rounded-lg bg-violet-50 border border-violet-200 p-3">
          <Info
            className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-xs text-violet-800 leading-relaxed">
            Funds will be transferred to the Stripe Connected Account and are
            usually available within minutes.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={goBackToForm}
          className="flex-1"
        >
          <ChevronLeft className="w-4 h-4 mr-1" aria-hidden="true" />
          Back
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          className="flex-1"
          size="lg"
        >
          Confirm &amp; Send
          <ArrowUpRight className="w-4 h-4 ml-1" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
      <div
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br",
          selectedProvider.accent,
          "shadow-lg",
        )}
      >
        <Loader2
          className="w-9 h-9 text-white animate-spin"
          aria-hidden="true"
        />
      </div>
      <div>
        <p className="text-lg font-bold text-gray-900">Sending Payment…</p>
        <p className="text-sm text-gray-500 mt-1">
          {provider === "wallet"
            ? "Processing your wallet transfer"
            : isMobileProvider(provider)
              ? `Sending USSD push via ${selectedProvider.label}`
              : `Processing bank transfer via ${selectedProvider.label}`}
        </p>
      </div>
      <p className="text-xs text-gray-400 max-w-[240px]">
        Please do not close this window.
      </p>
    </div>
  );

  const renderResult = () => {
    if (!result) return null;
    const isSuccess = result.success;
    const txId = result.data?.transactionId;
    const status = result.data?.status;

    return (
      <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center shadow-lg",
            isSuccess ? "bg-emerald-100" : "bg-red-100",
          )}
        >
          {isSuccess ? (
            <CheckCircle2
              className="w-10 h-10 text-emerald-600"
              aria-hidden="true"
            />
          ) : (
            <AlertCircle
              className="w-10 h-10 text-red-500"
              aria-hidden="true"
            />
          )}
        </motion.div>

        {/* Heading */}
        <div>
          <p className="text-xl font-bold text-gray-900">
            {isSuccess
              ? status === "completed"
                ? "Transfer Sent!"
                : "Request Accepted"
              : "Payment Failed"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {isSuccess
              ? status === "completed"
                ? `${formatCurrency(parsedAmount, currency)} transferred successfully.`
                : `Your payment is being processed via ${selectedProvider.label}.`
              : result.error}
          </p>
        </div>

        {/* Transaction ID */}
        {isSuccess && txId && (
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-2 w-full">
            <p className="text-xs text-gray-500 mb-0.5">Transaction ID</p>
            <p className="text-xs font-mono text-gray-800 break-all">{txId}</p>
          </div>
        )}

        {/* Async status note */}
        {isSuccess && status === "processing" && (
          <div className="flex gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3 text-left">
            <Info
              className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="text-xs text-blue-800 leading-relaxed">
              The recipient has received a payment prompt. You can check the
              transaction status in your <strong>Transaction History</strong>.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 w-full mt-2">
          {!isSuccess && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRetry}
              className="flex-1"
            >
              Try Again
            </Button>
          )}
          <Button
            type="button"
            onClick={handleClose}
            className="flex-1"
            variant={isSuccess ? "primary" : "secondary"}
          >
            {isSuccess ? "Done" : "Close"}
          </Button>
        </div>
      </div>
    );
  };

  const STEP_TITLES = {
    [STEPS.FORM]: "Send Money",
    [STEPS.CONFIRM]: "Review Transfer",
    [STEPS.PROCESSING]: "Processing…",
    [STEPS.RESULT]: result?.success ? "Transfer Complete" : "Transfer Failed",
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${idPrefix}-title`}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            variants={modalVariants}
            className={cn(
              "relative w-full sm:max-w-md bg-white",
              "rounded-t-3xl sm:rounded-2xl shadow-2xl",
              "max-h-[92dvh] overflow-y-auto",
            )}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-5 pb-4 bg-white border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Send className="w-4 h-4 text-blue-600" aria-hidden="true" />
                </div>
                <h2
                  id={`${idPrefix}-title`}
                  className="text-base font-bold text-gray-900"
                >
                  {STEP_TITLES[step]}
                </h2>
              </div>
              {!loading && (
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close send money dialog"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Step indicator (form + confirm only) */}
            {(step === STEPS.FORM || step === STEPS.CONFIRM) && (
              <div
                className="flex gap-1 px-5 pt-3"
                role="progressbar"
                aria-label="Step progress"
                aria-valuenow={step === STEPS.FORM ? 1 : 2}
                aria-valuemin={1}
                aria-valuemax={2}
              >
                {[STEPS.FORM, STEPS.CONFIRM].map((s, i) => (
                  <div
                    key={s}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-all duration-300",
                      step === s || (step === STEPS.CONFIRM && i === 0)
                        ? "bg-blue-500"
                        : "bg-gray-200",
                    )}
                  />
                ))}
              </div>
            )}

            {/* Step content */}
            <div className="px-5 py-5">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  {step === STEPS.FORM && renderForm()}
                  {step === STEPS.CONFIRM && renderConfirm()}
                  {step === STEPS.PROCESSING && renderProcessing()}
                  {step === STEPS.RESULT && renderResult()}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
