/* eslint-disable no-console */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Wifi,
  Shield,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Star,
} from "lucide-react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import {
  DashboardSection,
  DashboardGrid,
} from "../components/layout/DashboardUtils";
import { Button, Badge } from "../components/ui";
import {
  PageContainer,
  AnimatedSection,
  SectionHeader,
  GlassCard,
} from "../components/ui/PremiumUI";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../utils";
import { cardAPI } from "../services/cardAPI";

/* ── Constants ─────────────────────────────────────────────────────────── */
const CARD_COLORS = [
  "from-blue-600 via-blue-500 to-teal-500",
  "from-slate-700 via-slate-600 to-slate-500",
  "from-violet-600 via-purple-500 to-indigo-500",
  "from-rose-600 via-pink-500 to-rose-400",
  "from-emerald-600 via-green-500 to-teal-400",
  "from-amber-600 via-yellow-500 to-orange-400",
];

const CURRENT_YEAR = new Date().getFullYear();
const EXPIRY_YEARS = Array.from({ length: 12 }, (_, i) => CURRENT_YEAR + i);

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

/* ── API → UI shape mapper ──────────────────────────────────────────────── */
const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : str;

const mapApiCard = (c) => ({
  id: c.id,
  type: capitalize(c.cardType) || "Virtual",
  network: capitalize(c.cardBrand) || "Other",
  label: c.label || "My Card",
  last4: c.cardLast4,
  expiry: `${String(c.expiryMonth).padStart(2, "0")}/${String(c.expiryYear).slice(-2)}`,
  holder: c.holderName,
  status: c.status,
  isDefault: c.isDefault,
  color: c.color || CARD_COLORS[0],
});

const CARD_BENEFITS = [
  {
    icon: <Shield className="w-5 h-5 text-blue-400" />,
    title: "Zero-liability Protection",
    desc: "You're never responsible for unauthorized charges.",
  },
  {
    icon: <Wifi className="w-5 h-5 text-teal-400" />,
    title: "Contactless Payments",
    desc: "Tap to pay anywhere in 180+ countries.",
  },
  {
    icon: <Lock className="w-5 h-5 text-purple-400" />,
    title: "Instant Freeze & Unfreeze",
    desc: "Lock your card in seconds if it goes missing.",
  },
  {
    icon: <AlertCircle className="w-5 h-5 text-amber-400" />,
    title: "Real-time Alerts",
    desc: "Get notified instantly for every transaction.",
  },
];

/* ── CreditCardDisplay ─────────────────────────────────────────────────── */
const CreditCardDisplay = ({
  card,
  isRevealed,
  onToggleReveal,
  onToggleFreeze,
  onDelete,
  onSetDefault,
}) => {
  const frozen = card.status === "frozen";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="flex flex-col gap-4"
    >
      {/* Card face */}
      <div
        className={cn(
          "relative rounded-2xl p-6 text-white overflow-hidden select-none",
          "bg-gradient-to-br",
          card.color,
          frozen && "opacity-60 grayscale",
          "shadow-[0_8px_32px_rgba(0,0,0,0.22)]",
          "transition-all duration-500",
        )}
      >
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -bottom-12 -left-6 w-36 h-36 bg-white/10 rounded-full pointer-events-none" />

        {/* Top row */}
        <div className="relative flex items-start justify-between mb-6">
          <div>
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">
              {card.label}
            </p>
            <Badge variant={frozen ? "warning" : "success"} size="sm">
              {frozen ? "Frozen" : "Active"}
            </Badge>
          </div>
          {/* Network logo placeholder */}
          <div className="flex items-center gap-1">
            {card.network === "Mastercard" ? (
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-red-500/80" />
                <div className="w-8 h-8 rounded-full bg-yellow-400/80" />
              </div>
            ) : (
              <span className="text-white font-bold italic text-lg tracking-tight">
                VISA
              </span>
            )}
          </div>
        </div>

        {/* Contactless icon */}
        <Wifi className="w-5 h-5 text-white/50 mb-4 rotate-90" />

        {/* Card number */}
        <p className="text-xl font-mono tracking-[0.2em] mb-5">
          {isRevealed
            ? `•••• •••• •••• ${card.last4}`
            : `•••• •••• •••• ${card.last4}`}
        </p>

        {/* Bottom row */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-white/50 text-[10px] uppercase tracking-wider mb-0.5">
              Card Holder
            </p>
            <p className="text-sm font-semibold">{card.holder}</p>
          </div>
          <div className="text-right">
            <p className="text-white/50 text-[10px] uppercase tracking-wider mb-0.5">
              Expires
            </p>
            <p className="text-sm font-semibold">{card.expiry}</p>
          </div>
          <div className="text-right">
            <p className="text-white/50 text-[10px] uppercase tracking-wider mb-0.5">
              Type
            </p>
            <p className="text-sm font-semibold">{card.type}</p>
          </div>
        </div>

        {/* Frozen overlay */}
        {frozen && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl">
            <div className="flex items-center gap-2 bg-black/50 px-4 py-2 rounded-full">
              <Lock className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-semibold">
                Card Frozen
              </span>
            </div>
          </div>
        )}

        {/* Default indicator */}
        {card.isDefault && (
          <div className="absolute top-3 right-3">
            <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
          </div>
        )}
      </div>

      {/* Card actions */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleReveal}
          className="flex items-center gap-1.5 flex-1"
        >
          {isRevealed ? (
            <>
              <EyeOff className="w-4 h-4" /> Hide Details
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" /> Show Details
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onToggleFreeze(card.id)}
          className={cn(
            "flex items-center gap-1.5 flex-1",
            frozen &&
              "text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20",
          )}
        >
          {frozen ? (
            <>
              <Unlock className="w-4 h-4" /> Unfreeze
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" /> Freeze
            </>
          )}
        </Button>
        {!card.isDefault && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSetDefault(card.id)}
            title="Set as default"
            className="flex items-center gap-1.5 text-yellow-600 border-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
          >
            <Star className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(card.id)}
          className="flex items-center gap-1.5 text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

/* ── Main Cards Page ───────────────────────────────────────────────────── */
const Cards = () => {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revealedCards, setRevealedCards] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);

  const dashboardUser = {
    name: user?.name || user?.email || "User",
    email: user?.email || "",
    avatar: user?.avatar || null,
  };

  /* Fetch on mount */
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const data = await cardAPI.getCards();
        setCards((data.cards || []).map(mapApiCard));
      } catch (err) {
        setError("Failed to load cards. Please try again.");
        console.error("Failed to fetch cards:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, []);

  const toggleReveal = (id) =>
    setRevealedCards((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleFreeze = async (id) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    const newStatus = card.status === "frozen" ? "active" : "frozen";
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)),
    );
    try {
      await cardAPI.updateCardStatus(id, newStatus);
    } catch (err) {
      setCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: card.status } : c)),
      );
      console.error("Failed to update card status:", err);
    }
  };

  const deleteCard = async (id) => {
    const snapshot = [...cards];
    setCards((prev) => prev.filter((c) => c.id !== id));
    try {
      await cardAPI.deleteCard(id);
    } catch (err) {
      setCards(snapshot);
      console.error("Failed to delete card:", err);
    }
  };

  const setDefaultCard = async (id) => {
    const snapshot = [...cards];
    setCards((prev) => prev.map((c) => ({ ...c, isDefault: c.id === id })));
    try {
      await cardAPI.setDefaultCard(id);
    } catch (err) {
      setCards(snapshot);
      console.error("Failed to set default card:", err);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "cardNumber") {
      const digits = value.replace(/\D/g, "").slice(0, 16);
      const formatted = digits.replace(/(.{4})/g, "$1 ").trim();
      setFormData((prev) => ({ ...prev, cardNumber: formatted }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    try {
      const data = await cardAPI.addCard({
        cardNumber: formData.cardNumber.replace(/\s/g, ""),
        holderName: formData.holderName.trim(),
        expiryMonth: parseInt(formData.expiryMonth, 10),
        expiryYear: parseInt(formData.expiryYear, 10),
        cvv: formData.cvv,
        label: formData.label.trim() || undefined,
        cardType: formData.cardType,
        color: formData.color,
      });
      setCards((prev) => [...prev, mapApiCard(data.card)]);
      setShowAddModal(false);
      setFormData(EMPTY_FORM);
    } catch (err) {
      setAddError(
        err.response?.data?.message || "Failed to add card. Please try again.",
      );
    } finally {
      setAdding(false);
    }
  };

  const activeCards = cards.filter((c) => c.status === "active").length;
  const frozenCards = cards.filter((c) => c.status === "frozen").length;
  const virtualCards = cards.filter((c) => c.type === "Virtual").length;

  return (
    <DashboardLayout user={dashboardUser}>
      <PageContainer>
        {/* Header */}
        <AnimatedSection>
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <SectionHeader
              title="My Cards"
              subtitle="Manage your virtual and physical payment cards"
              icon={<CreditCard className="w-6 h-6" />}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New Card
            </Button>
          </div>
        </AnimatedSection>

        {/* Stats row */}
        <AnimatedSection delay={0.05}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: "Total Cards",
                value: cards.length,
                color: "text-blue-600",
              },
              {
                label: "Active",
                value: activeCards,
                color: "text-emerald-600",
              },
              { label: "Frozen", value: frozenCards, color: "text-amber-600" },
              {
                label: "Virtual",
                value: virtualCards,
                color: "text-purple-600",
              },
            ].map((stat, i) => (
              <GlassCard key={i} className="p-4 text-center">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                  {stat.label}
                </p>
                <p className={cn("text-2xl font-bold", stat.color)}>
                  {stat.value}
                </p>
              </GlassCard>
            ))}
          </div>
        </AnimatedSection>

        {/* Cards grid */}
        <AnimatedSection delay={0.1}>
          <DashboardSection
            title="Your Cards"
            description={`${cards.length} card${cards.length !== 1 ? "s" : ""} linked to your account`}
          >
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
                <p className="text-sm text-red-500">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </Button>
              </div>
            ) : cards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CreditCard className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mb-4" />
                <p className="text-lg font-semibold text-neutral-600 dark:text-neutral-400">
                  No cards yet
                </p>
                <p className="text-sm text-neutral-400 mb-6">
                  Add a virtual or physical card to get started.
                </p>
                <Button
                  variant="primary"
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Your First Card
                </Button>
              </div>
            ) : (
              <DashboardGrid columns={3}>
                <AnimatePresence>
                  {cards.map((card) => (
                    <CreditCardDisplay
                      key={card.id}
                      card={card}
                      isRevealed={!!revealedCards[card.id]}
                      onToggleReveal={() => toggleReveal(card.id)}
                      onToggleFreeze={toggleFreeze}
                      onDelete={deleteCard}
                      onSetDefault={setDefaultCard}
                    />
                  ))}
                </AnimatePresence>
              </DashboardGrid>
            )}
          </DashboardSection>
        </AnimatedSection>

        {/* Card benefits */}
        <AnimatedSection delay={0.15}>
          <DashboardSection title="Card Benefits">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CARD_BENEFITS.map((benefit, i) => (
                <GlassCard key={i} className="flex items-start gap-4 p-4">
                  <div className="mt-0.5 shrink-0">{benefit.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 mb-0.5">
                      {benefit.title}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {benefit.desc}
                    </p>
                  </div>
                </GlassCard>
              ))}
            </div>
          </DashboardSection>
        </AnimatedSection>

        {/* Add Card Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => !adding && setShowAddModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                    Add New Card
                  </h2>
                </div>

                <form onSubmit={handleAddCard} className="space-y-4">
                  {/* Card Number */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      name="cardNumber"
                      value={formData.cardNumber}
                      onChange={handleFormChange}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Cardholder Name */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      name="holderName"
                      value={formData.holderName}
                      onChange={handleFormChange}
                      placeholder="Full name on card"
                      required
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Expiry + CVV */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                        Month
                      </label>
                      <select
                        name="expiryMonth"
                        value={formData.expiryMonth}
                        onChange={handleFormChange}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">MM</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(
                          (m) => (
                            <option key={m} value={m}>
                              {String(m).padStart(2, "0")}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                        Year
                      </label>
                      <select
                        name="expiryYear"
                        value={formData.expiryYear}
                        onChange={handleFormChange}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">YYYY</option>
                        {EXPIRY_YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                        CVV
                      </label>
                      <input
                        type="password"
                        name="cvv"
                        value={formData.cvv}
                        onChange={handleFormChange}
                        placeholder="•••"
                        maxLength={4}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Card Label */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                      Card Label{" "}
                      <span className="text-neutral-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      name="label"
                      value={formData.label}
                      onChange={handleFormChange}
                      placeholder="e.g. Primary Card, Travel Card"
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Card Type */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                      Card Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {["virtual", "physical"].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, cardType: type }))
                          }
                          className={cn(
                            "p-3 rounded-xl border-2 transition-all text-sm font-medium capitalize",
                            formData.cardType === type
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                              : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400",
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Colour picker */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                      Card Colour
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {CARD_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, color }))
                          }
                          className={cn(
                            "w-8 h-8 rounded-full bg-gradient-to-br transition-transform",
                            color,
                            formData.color === color
                              ? "ring-2 ring-offset-2 ring-blue-500 scale-110"
                              : "hover:scale-105",
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Error */}
                  {addError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {addError}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowAddModal(false);
                        setFormData(EMPTY_FORM);
                        setAddError(null);
                      }}
                      disabled={adding}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1 flex items-center justify-center gap-2"
                      disabled={adding}
                    >
                      {adding ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Adding…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Add Card
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </PageContainer>
    </DashboardLayout>
  );
};

export default Cards;
