/* eslint-disable no-console */
import React, { useState } from "react";
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

/* ── Static demo card data ─────────────────────────────────────────────── */
const DEMO_CARDS = [
  {
    id: "card-1",
    type: "Virtual",
    network: "Visa",
    label: "Primary Virtual Card",
    last4: "4242",
    expiry: "03/29",
    holder: "Anthony Wai",
    balance: 1240.5,
    currency: "USD",
    status: "active",
    color: "from-blue-600 via-blue-500 to-teal-500",
  },
  {
    id: "card-2",
    type: "Physical",
    network: "Mastercard",
    label: "Savings Debit Card",
    last4: "8817",
    expiry: "11/27",
    holder: "Anthony Wai",
    balance: 3580.0,
    currency: "USD",
    status: "active",
    color: "from-slate-700 via-slate-600 to-slate-500",
  },
  {
    id: "card-3",
    type: "Virtual",
    network: "Visa",
    label: "Travel Card",
    last4: "3391",
    expiry: "06/26",
    holder: "Anthony Wai",
    balance: 520.0,
    currency: "EUR",
    status: "frozen",
    color: "from-violet-600 via-purple-500 to-indigo-500",
  },
];

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
              Balance
            </p>
            <p className="text-sm font-semibold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: card.currency,
                minimumFractionDigits: 2,
              }).format(card.balance)}
            </p>
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
  const [cards, setCards] = useState(DEMO_CARDS);
  const [revealedCards, setRevealedCards] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);

  const dashboardUser = {
    name: user?.name || user?.email || "User",
    email: user?.email || "",
    avatar: user?.avatar || null,
  };

  const toggleReveal = (id) =>
    setRevealedCards((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleFreeze = (id) =>
    setCards((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: c.status === "frozen" ? "active" : "frozen" }
          : c,
      ),
    );

  const deleteCard = (id) =>
    setCards((prev) => prev.filter((c) => c.id !== id));

  const activeCards = cards.filter((c) => c.status === "active").length;
  const frozenCards = cards.filter((c) => c.status === "frozen").length;

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
                label: "Total Balance",
                value: new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 2,
                }).format(
                  cards
                    .filter((c) => c.currency === "USD")
                    .reduce((sum, c) => sum + c.balance, 0),
                ),
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
            {cards.length === 0 ? (
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
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-8 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                    Request New Card
                  </h2>
                </div>

                <div className="space-y-4 mb-6">
                  {[
                    "Virtual Visa Card",
                    "Virtual Mastercard",
                    "Physical Debit Card",
                  ].map((type, i) => (
                    <button
                      key={i}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all",
                        "border-neutral-200 dark:border-neutral-700",
                        "hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20",
                        "text-left",
                      )}
                      onClick={() => {
                        setShowAddModal(false);
                      }}
                    >
                      <CreditCard className="w-5 h-5 text-blue-500 shrink-0" />
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-white text-sm">
                          {type}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {i === 2
                            ? "Delivered in 5-7 business days"
                            : "Instant issuance — free"}
                        </p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-neutral-300 ml-auto" />
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </PageContainer>
    </DashboardLayout>
  );
};

export default Cards;
