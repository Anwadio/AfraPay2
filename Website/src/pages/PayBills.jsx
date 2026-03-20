/* eslint-disable no-console */
import React, { useState, useCallback, useRef, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Droplets,
  Wifi,
  Smartphone,
  Tv,
  Building2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  AlertTriangle,
  Repeat2,
  Receipt,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { Button } from "../components/ui";
import {
  PageContainer,
  AnimatedSection,
  SectionHeader,
  GlassCard,
} from "../components/ui/PremiumUI";
import { useAuth } from "../contexts/AuthContext";
import { paymentAPI } from "../services/api";
import { cn } from "../utils";

/* ── UUID v4 ────────────────────────────────────────────────────────────── */
function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16),
  );
}

/* ── Bill categories ────────────────────────────────────────────────────── */
const CATEGORIES = [
  {
    id: "electricity",
    label: "Electricity",
    icon: Zap,
    color: "amber",
    providers: [
      {
        id: "kplc",
        name: "KPLC (Kenya)",
        currency: "KES",
        provider: "mpesa",
        hint: "Customer account number",
      },
      {
        id: "umeme",
        name: "UMEME (Uganda)",
        currency: "UGX",
        provider: "mtn",
        hint: "Meter / account number",
      },
      {
        id: "tanesco",
        name: "TANESCO (Tanzania)",
        currency: "TZS",
        provider: "mpesa",
        hint: "Customer number",
      },
      {
        id: "eepco",
        name: "EEPCo (Ethiopia)",
        currency: "ETB",
        provider: "mtn",
        hint: "Account number",
      },
    ],
  },
  {
    id: "water",
    label: "Water",
    icon: Droplets,
    color: "blue",
    providers: [
      {
        id: "nairobi_water",
        name: "Nairobi Water",
        currency: "KES",
        provider: "mpesa",
        hint: "Customer / account number",
      },
      {
        id: "nwsc_ug",
        name: "NWSC (Uganda)",
        currency: "UGX",
        provider: "mtn",
        hint: "Account number",
      },
    ],
  },
  {
    id: "internet",
    label: "Internet / TV",
    icon: Wifi,
    color: "teal",
    providers: [
      {
        id: "safaricom_home",
        name: "Safaricom Home",
        currency: "KES",
        provider: "mpesa",
        hint: "Account number",
      },
      {
        id: "dstv",
        name: "DStv",
        currency: "USD",
        provider: "wallet",
        hint: "Smartcard number",
      },
      {
        id: "zuku",
        name: "Zuku",
        currency: "KES",
        provider: "mpesa",
        hint: "Account number",
      },
    ],
  },
  {
    id: "airtime",
    label: "Airtime",
    icon: Smartphone,
    color: "green",
    providers: [
      {
        id: "safaricom",
        name: "Safaricom (Kenya)",
        currency: "KES",
        provider: "mpesa",
        hint: "e.g. +254712345678",
      },
      {
        id: "mtn_ug",
        name: "MTN (Uganda)",
        currency: "UGX",
        provider: "mtn",
        hint: "e.g. +256771234567",
      },
      {
        id: "airtel_ke",
        name: "Airtel (Kenya)",
        currency: "KES",
        provider: "mpesa",
        hint: "e.g. +254100000000",
      },
      {
        id: "tigo",
        name: "Tigo (Tanzania)",
        currency: "TZS",
        provider: "mpesa",
        hint: "e.g. +255612345678",
      },
    ],
  },
  {
    id: "tv",
    label: "Pay TV",
    icon: Tv,
    color: "violet",
    providers: [
      {
        id: "gotv",
        name: "GOtv",
        currency: "KES",
        provider: "mpesa",
        hint: "IUC / card number",
      },
      {
        id: "startimes",
        name: "StarTimes",
        currency: "KES",
        provider: "mpesa",
        hint: "Smartcard number",
      },
    ],
  },
  {
    id: "rent",
    label: "Rent / Utilities",
    icon: Building2,
    color: "purple",
    providers: [
      {
        id: "mpesa_paybill",
        name: "M-Pesa Paybill",
        currency: "KES",
        provider: "mpesa",
        hint: "Paybill account number",
      },
      {
        id: "mtn_momo_biz",
        name: "MTN MoMo Business",
        currency: "UGX",
        provider: "mtn",
        hint: "Business account number",
      },
    ],
  },
];

const COLOR_MAP = {
  amber:
    "bg-amber-50  text-amber-600  border-amber-100  dark:bg-amber-900/20  dark:text-amber-400  dark:border-amber-900/40",
  blue: "bg-blue-50   text-blue-600   border-blue-100   dark:bg-blue-900/20   dark:text-blue-400   dark:border-blue-900/40",
  teal: "bg-teal-50   text-teal-600   border-teal-100   dark:bg-teal-900/20   dark:text-teal-400   dark:border-teal-900/40",
  green:
    "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/40",
  violet:
    "bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-900/40",
  purple:
    "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/40",
};

const STEPS = {
  SELECT: "select",
  FORM: "form",
  CONFIRM: "confirm",
  PROCESSING: "processing",
  RESULT: "result",
};

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

/* ── Small helper components ────────────────────────────────────────────── */
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

/* ── Main page ──────────────────────────────────────────────────────────── */
const PayBills = () => {
  const { user } = useAuth();
  const idPrefix = useId();

  const [step, setStep] = useState(STEPS.SELECT);
  const [direction, setDirection] = useState(1);

  // Selection state
  const [categoryId, setCategoryId] = useState(null);
  const [billProvider, setBillProvider] = useState(null);

  // Form state
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);

  const idempotencyKey = useRef(uuidv4());

  const selectedCategory = CATEGORIES.find((c) => c.id === categoryId);
  const parsedAmount = parseFloat(amount);

  const goTo = useCallback((next, dir = 1) => {
    setDirection(dir);
    setStep(next);
  }, []);

  const handleSelectProvider = (cat, prov) => {
    setCategoryId(cat.id);
    setBillProvider(prov);
    setErrors({});
    goTo(STEPS.FORM);
  };

  const validate = () => {
    const errs = {};
    if (!accountNumber.trim())
      errs.account = "Account / reference number is required.";
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0)
      errs.amount = "Enter a valid amount.";
    if (parsedAmount > 50000) errs.amount = "Maximum bill payment is 50,000.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    goTo(STEPS.PROCESSING);
    try {
      const payload = {
        amount: parsedAmount,
        currency: billProvider.currency,
        provider: billProvider.provider,
        receiverPhone: accountNumber.trim(), // paybill uses same field
        description: `${selectedCategory.label} – ${billProvider.name}${description ? ": " + description : ""}`,
      };

      const res = await paymentAPI.sendMoney(payload, idempotencyKey.current);
      setResult({ success: true, data: res?.data || res });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Payment failed. Please try again.";
      setResult({ success: false, error: msg });
    }
    goTo(STEPS.RESULT);
  };

  const handleReset = () => {
    setStep(STEPS.SELECT);
    setCategoryId(null);
    setBillProvider(null);
    setAccountNumber("");
    setAmount("");
    setDescription("");
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

  const dashboardUser = {
    name: user?.name || user?.email || "User",
    email: user?.email || "",
    avatar: user?.avatar || null,
  };

  return (
    <DashboardLayout user={dashboardUser}>
      <PageContainer>
        <AnimatedSection>
          <SectionHeader
            title="Pay Bills"
            subtitle="Pay utilities, airtime, internet and more via M-Pesa or MTN MoMo"
            icon={<Receipt className="w-6 h-6" />}
            className="mb-6"
          />
        </AnimatedSection>

        <div className="max-w-2xl mx-auto">
          <AnimatedSection delay={0.04}>
            <GlassCard className="p-0 overflow-hidden">
              <AnimatePresence mode="wait" custom={direction}>
                {/* ── SELECT step ──────────────────────────────────────── */}
                {step === STEPS.SELECT && (
                  <motion.div
                    key="select"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="p-6"
                  >
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-5">
                      Choose a Bill Category
                    </h2>
                    <div className="space-y-4">
                      {CATEGORIES.map((cat) => {
                        const CatIcon = cat.icon;
                        return (
                          <div key={cat.id}>
                            <div
                              className={cn(
                                "flex items-center gap-2 mb-2 px-1",
                              )}
                            >
                              <CatIcon
                                className={cn(
                                  "w-4 h-4",
                                  COLOR_MAP[cat.color].split(" ")[1],
                                )}
                              />
                              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                {cat.label}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {cat.providers.map((prov) => (
                                <button
                                  key={prov.id}
                                  type="button"
                                  onClick={() =>
                                    handleSelectProvider(cat, prov)
                                  }
                                  className={cn(
                                    "flex items-center justify-between px-4 py-3 rounded-xl border text-left",
                                    "transition-all duration-200 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                                    COLOR_MAP[cat.color],
                                  )}
                                >
                                  <div>
                                    <p className="text-sm font-semibold text-neutral-800 dark:text-white truncate">
                                      {prov.name}
                                    </p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                      via{" "}
                                      {prov.provider === "mpesa"
                                        ? "M-Pesa"
                                        : prov.provider === "mtn"
                                          ? "MTN MoMo"
                                          : "AfraPay Wallet"}{" "}
                                      · {prov.currency}
                                    </p>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* ── FORM step ────────────────────────────────────────── */}
                {step === STEPS.FORM && billProvider && selectedCategory && (
                  <motion.div
                    key="form"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="p-6"
                  >
                    <button
                      type="button"
                      onClick={() => goTo(STEPS.SELECT, -1)}
                      className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 mb-4"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Back
                    </button>

                    <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">
                      {billProvider.name}
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
                      via{" "}
                      {billProvider.provider === "mpesa"
                        ? "M-Pesa"
                        : billProvider.provider === "mtn"
                          ? "MTN MoMo"
                          : "AfraPay Wallet"}{" "}
                      · {billProvider.currency}
                    </p>

                    {/* Account / reference */}
                    <div className="mb-4">
                      <FieldLabel htmlFor={`${idPrefix}-acct`} required>
                        {selectedCategory.id === "airtime"
                          ? "Phone Number"
                          : "Account / Reference Number"}
                      </FieldLabel>
                      <input
                        id={`${idPrefix}-acct`}
                        type="text"
                        placeholder={billProvider.hint}
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
                        id={`${idPrefix}-acct-err`}
                        message={errors.account}
                      />
                    </div>

                    {/* Amount */}
                    <div className="mb-4">
                      <FieldLabel htmlFor={`${idPrefix}-amount`} required>
                        Amount ({billProvider.currency})
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

                    {/* Description */}
                    <div className="mb-6">
                      <FieldLabel htmlFor={`${idPrefix}-desc`}>
                        Note (optional)
                      </FieldLabel>
                      <input
                        id={`${idPrefix}-desc`}
                        type="text"
                        maxLength={80}
                        placeholder="e.g. March bill"
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
                      Review <ChevronRight className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )}

                {/* ── CONFIRM step ─────────────────────────────────────── */}
                {step === STEPS.CONFIRM && billProvider && selectedCategory && (
                  <motion.div
                    key="confirm"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="p-6"
                  >
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                      Confirm Payment
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">
                      Review before submitting.
                    </p>

                    <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-4 mb-5">
                      <ReviewRow label="Biller" value={billProvider.name} />
                      <ReviewRow
                        label="Category"
                        value={selectedCategory.label}
                      />
                      <ReviewRow label="Account" value={accountNumber} />
                      <ReviewRow
                        label="Amount"
                        value={formatCurrency(
                          parsedAmount,
                          billProvider.currency,
                        )}
                        accent="text-blue-600 dark:text-blue-400"
                      />
                      {description && (
                        <ReviewRow label="Note" value={description} />
                      )}
                      <ReviewRow
                        label="Fee"
                        value="Free"
                        accent="text-emerald-600"
                      />
                    </div>

                    <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-xl p-3 mb-6 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>
                        Verify the account number before submitting — bill
                        payments cannot be reversed.
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
                        onClick={handleSubmit}
                      >
                        Pay Now
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* ── PROCESSING step ──────────────────────────────────── */}
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
                    className="flex flex-col items-center justify-center py-16 gap-4 p-6"
                  >
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                    <p className="text-base font-semibold text-neutral-700 dark:text-neutral-200">
                      Processing your payment…
                    </p>
                    <p className="text-sm text-neutral-400">
                      This usually takes a few seconds.
                    </p>
                  </motion.div>
                )}

                {/* ── RESULT step ──────────────────────────────────────── */}
                {step === STEPS.RESULT && (
                  <motion.div
                    key="result"
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="flex flex-col items-center py-12 text-center gap-4 p-6"
                  >
                    {result?.success ? (
                      <>
                        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                          Payment Sent!
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs">
                          {formatCurrency(
                            parsedAmount,
                            billProvider?.currency || "USD",
                          )}{" "}
                          paid to {billProvider?.name}.
                          {result.data?.transactionId
                            ? ` Ref: ${result.data.transactionId}`
                            : ""}
                        </p>
                        <div className="flex gap-3 mt-2">
                          <Button
                            variant="primary"
                            onClick={handleReset}
                            className="flex items-center gap-2"
                          >
                            <Repeat2 className="w-4 h-4" /> Pay Another
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                          <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                          Payment Failed
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
            </GlassCard>
          </AnimatedSection>
        </div>
      </PageContainer>
    </DashboardLayout>
  );
};

export default PayBills;
