/* eslint-disable no-console */
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  Fragment,
} from "react";
import { DashboardLayout } from "../components/layout/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import { supportAPI } from "../services/api";
import toast from "react-hot-toast";

// ─── tiny design-system helpers ─────────────────────────────────────────────
const Card = ({ children, className = "" }) => (
  <div
    className={`bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl ${className}`}
  >
    {children}
  </div>
);

const Badge = ({ color = "neutral", children }) => {
  const map = {
    green:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    amber:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    neutral:
      "bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${map[color]}`}
    >
      {children}
    </span>
  );
};

const inputCls =
  "w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm " +
  "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 " +
  "focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 " +
  "placeholder:text-neutral-400";

const btnPrimary =
  "inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white " +
  "bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const btnOutline =
  "inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold " +
  "text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 " +
  "border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 " +
  "rounded-lg transition-colors disabled:opacity-50";

// ─── Spinner ─────────────────────────────────────────────────────────────────
const Spinner = ({ size = 5 }) => (
  <svg
    className={`w-${size} h-${size} animate-spin text-primary-500`}
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

// ─── Status pill helper ───────────────────────────────────────────────────────
function statusColor(s) {
  if (s === "open") return "blue";
  if (s === "in-progress") return "amber";
  if (s === "resolved") return "green";
  if (s === "closed") return "neutral";
  return "neutral";
}
function priorityColor(p) {
  if (p === "urgent") return "red";
  if (p === "high") return "amber";
  if (p === "medium") return "blue";
  return "neutral";
}

// ─── format timestamp ─────────────────────────────────────────────────────────
function fmt(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
function fromNow(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = ["overview", "new-ticket", "my-tickets", "faq", "status"];
const TAB_LABELS = {
  overview: "Overview",
  "new-ticket": "New Ticket",
  "my-tickets": "My Tickets",
  faq: "FAQ",
  status: "System Status",
};

// ════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ════════════════════════════════════════════════════════════════════════════
const OverviewTab = ({ onNavigate }) => {
  const channels = [
    {
      icon: (
        <svg
          className="w-6 h-6 text-primary-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
      ),
      title: "Submit a Ticket",
      desc: "Describe your issue and our team will respond within 4 business hours.",
      cta: "Open Ticket",
      onClick: () => onNavigate("new-ticket"),
    },
    {
      icon: (
        <svg
          className="w-6 h-6 text-secondary-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      title: "Browse FAQs",
      desc: "Find instant answers to the most common questions about your account and payments.",
      cta: "View FAQs",
      onClick: () => onNavigate("faq"),
    },
    {
      icon: (
        <svg
          className="w-6 h-6 text-amber-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      title: "System Status",
      desc: "Check real-time operational status for payments, transfers, and all AfraPay services.",
      cta: "View Status",
      onClick: () => onNavigate("status"),
    },
    {
      icon: (
        <svg
          className="w-6 h-6 text-purple-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
      title: "Email Us",
      desc: "For non-urgent enquiries you can also write to us at support@afrapayafrica.com.",
      cta: "Send Email",
      onClick: () => window.open("mailto:support@afrapayafrica.com", "_blank"),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 p-8 text-white">
        <h2 className="text-2xl font-bold">How can we help?</h2>
        <p className="mt-1 text-primary-100 text-sm max-w-lg">
          Search our help centre, browse FAQs, or open a support ticket. Our
          team is available Monday – Friday 08:00 – 20:00 WAT.
        </p>
      </div>

      {/* Channel cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {channels.map((c) => (
          <Card
            key={c.title}
            className="p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-lg bg-neutral-50 dark:bg-neutral-700 flex items-center justify-center">
              {c.icon}
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                {c.title}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {c.desc}
              </p>
            </div>
            <button
              type="button"
              onClick={c.onClick}
              className={btnOutline + " mt-auto self-start"}
            >
              {c.cta}
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </Card>
        ))}
      </div>

      {/* Response SLA strip */}
      <Card className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-neutral-200 dark:divide-neutral-700">
          {[
            { label: "Urgent tickets", value: "1 h" },
            { label: "High priority", value: "4 h" },
            { label: "Standard tickets", value: "1 day" },
            { label: "Email enquiries", value: "2 days" },
          ].map(({ label, value }) => (
            <div key={label} className="px-4 first:pl-0 last:pr-0 text-center">
              <p className="text-xl font-bold text-primary-600 dark:text-primary-400">
                {value}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {label}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// NEW TICKET TAB
// ════════════════════════════════════════════════════════════════════════════
const CATEGORIES = [
  { value: "payments", label: "Payments & Transactions" },
  { value: "account", label: "Account & Profile" },
  { value: "security", label: "Security & Access" },
  { value: "transfers", label: "Transfers & Exchange" },
  { value: "fees", label: "Fees & Pricing" },
  { value: "other", label: "Other" },
];
const PRIORITIES = [
  { value: "low", label: "Low — general question" },
  { value: "medium", label: "Medium — something isn't working" },
  { value: "high", label: "High — my account is affected" },
  { value: "urgent", label: "Urgent — security incident / funds at risk" },
];

const NewTicketTab = ({ onTicketCreated }) => {
  const [form, setForm] = useState({
    subject: "",
    category: "",
    priority: "medium",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (name === "message") setCharCount(value.length);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) {
      toast.error("Please select a category.");
      return;
    }
    if (form.message.length < 20) {
      toast.error("Please provide at least 20 characters in your message.");
      return;
    }
    setSending(true);
    try {
      const res = await supportAPI.createTicket(form);
      toast.success("Ticket submitted! We'll respond within 4 business hours.");
      onTicketCreated(res.data?.ticket);
    } catch (err) {
      console.error("Create ticket failed", err);
      toast.error(
        err.response?.data?.error?.message ||
          "Failed to submit ticket. Please try again.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Open a Support Ticket
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Provide as much detail as possible so we can help you faster.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Subject */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              placeholder="Brief summary of your issue"
              maxLength={150}
              required
              className={inputCls}
            />
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                required
                className={inputCls}
              >
                <option value="">Select a category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Priority
              </label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className={inputCls}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Message <span className="text-red-500">*</span>
              </label>
              <span
                className={`text-xs ${charCount > 4800 ? "text-red-500" : "text-neutral-400"}`}
              >
                {charCount}/5000
              </span>
            </div>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              rows={8}
              maxLength={5000}
              required
              placeholder="Describe your issue in detail — include any error messages, transaction IDs, or screenshots you have."
              className={inputCls + " resize-none"}
            />
          </div>

          <button type="submit" disabled={sending} className={btnPrimary}>
            {sending ? (
              <>
                <Spinner size={4} /> Submitting…
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                Submit Ticket
              </>
            )}
          </button>
        </form>
      </Card>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MY TICKETS TAB
// ════════════════════════════════════════════════════════════════════════════
const TicketThread = ({ ticket, onBack, onMessageSent }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  // Auto-refresh every 15 s while thread is open
  const pollRef = useRef(null);
  const bottomRef = useRef(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await supportAPI.getTicket(ticket.$id);
      if (res?.success) {
        setMessages(res.data.messages || []);
      }
    } catch (err) {
      console.error("Load messages failed", err);
    } finally {
      setLoading(false);
    }
  }, [ticket.$id]);

  useEffect(() => {
    loadMessages();
    pollRef.current = setInterval(loadMessages, 15000);
    return () => clearInterval(pollRef.current);
  }, [loadMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await supportAPI.addMessage(ticket.$id, reply.trim());
      setReply("");
      await loadMessages();
      onMessageSent?.();
    } catch (err) {
      console.error("Send message failed", err);
      toast.error(
        err.response?.data?.error?.message || "Failed to send message.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className={btnOutline + " flex-shrink-0"}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
            {ticket.subject}
          </h2>
          <div className="flex flex-wrap gap-2 mt-1">
            <Badge color={statusColor(ticket.status)}>
              {ticket.status.replace("-", " ")}
            </Badge>
            <Badge color={priorityColor(ticket.priority)}>
              {ticket.priority} priority
            </Badge>
            <span className="text-xs text-neutral-400">
              #{ticket.$id.slice(-8)}
            </span>
            <span className="text-xs text-neutral-400">
              Opened {fmt(ticket.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Thread */}
      <Card className="divide-y divide-neutral-100 dark:divide-neutral-700">
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-neutral-400 p-6">No messages yet.</p>
        ) : (
          messages.map((msg) => {
            const isStaff = msg.isStaff;
            return (
              <div
                key={msg.$id}
                className={`p-5 ${isStaff ? "bg-primary-50 dark:bg-primary-900/10" : ""}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                      isStaff
                        ? "bg-primary-600"
                        : "bg-neutral-400 dark:bg-neutral-600"
                    }`}
                  >
                    {isStaff ? "A" : (msg.senderName?.[0] || "U").toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {isStaff ? "AfraPay Support" : msg.senderName}
                  </span>
                  {isStaff && <Badge color="blue">Staff</Badge>}
                  <span className="ml-auto text-xs text-neutral-400">
                    {fromNow(msg.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                  {msg.message}
                </p>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </Card>

      {/* Reply box */}
      {ticket.status !== "closed" ? (
        <Card className="p-4">
          <form onSubmit={handleSend} className="space-y-3">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
              maxLength={5000}
              placeholder="Type your reply…"
              className={inputCls + " resize-none"}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-neutral-400">
                {reply.length}/5000
              </span>
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                className={btnPrimary}
              >
                {sending ? (
                  <>
                    <Spinner size={4} /> Sending…
                  </>
                ) : (
                  "Send Reply"
                )}
              </button>
            </div>
          </form>
        </Card>
      ) : (
        <div className="p-4 text-sm text-neutral-500 dark:text-neutral-400 text-center border border-neutral-200 dark:border-neutral-700 rounded-lg">
          This ticket is closed. Open a new ticket if you need further help.
        </div>
      )}
    </div>
  );
};

const MyTicketsTab = ({ refreshKey }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await supportAPI.getTickets({ status: filter });
      if (res?.success) setTickets(res.data.tickets || []);
    } catch (err) {
      console.error("Load tickets failed", err);
      toast.error("Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (selected) {
    return (
      <TicketThread
        ticket={selected}
        onBack={() => {
          setSelected(null);
          load();
        }}
        onMessageSent={load}
      />
    );
  }

  const STATUS_FILTERS = [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "in-progress", label: "In Progress" },
    { value: "resolved", label: "Resolved" },
    { value: "closed", label: "Closed" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          My Tickets
        </h2>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setFilter(s.value)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                filter === s.value
                  ? "bg-primary-600 text-white border-primary-600"
                  : "border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : tickets.length === 0 ? (
        <Card className="p-12 text-center">
          <svg
            className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No tickets found.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Card
              key={t.$id}
              className="p-4 cursor-pointer hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 transition-all"
              onClick={() => setSelected(t)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge color={statusColor(t.status)}>
                      {t.status.replace("-", " ")}
                    </Badge>
                    <Badge color={priorityColor(t.priority)}>
                      {t.priority}
                    </Badge>
                    <span className="text-xs text-neutral-400">
                      #{t.$id.slice(-8)}
                    </span>
                  </div>
                  <p className="mt-1 font-medium text-neutral-800 dark:text-neutral-200 truncate">
                    {t.subject}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {t.messageCount || 1} message
                    {(t.messageCount || 1) !== 1 ? "s" : ""} · Last updated{" "}
                    {fromNow(t.updatedAt || t.createdAt)}
                  </p>
                </div>
                <svg
                  className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// FAQ TAB
// ════════════════════════════════════════════════════════════════════════════
const FaqTab = () => {
  const [faqs, setFaqs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const searchRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await supportAPI.getFaqs({ category, q: search });
      if (res?.success) {
        setFaqs(res.data.faqs || []);
        if (res.data.categories) setCategories(res.data.categories);
      }
    } catch (err) {
      console.error("Load FAQs failed", err);
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Frequently Asked Questions
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Browse common topics or search for anything specific.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={searchRef}
          type="search"
          placeholder="Search FAQs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputCls + " pl-9"}
        />
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategory("all")}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              category === "all"
                ? "bg-primary-600 text-white border-primary-600"
                : "border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                category === c.id
                  ? "bg-primary-600 text-white border-primary-600"
                  : "border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Accordion */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : faqs.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No results found.{" "}
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("all");
              }}
              className="text-primary-600 hover:underline"
            >
              Clear filters
            </button>
          </p>
        </Card>
      ) : (
        <Card className="divide-y divide-neutral-100 dark:divide-neutral-700">
          {faqs.map((faq) => (
            <div key={faq.id}>
              <button
                type="button"
                onClick={() => setOpen(open === faq.id ? null : faq.id)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
              >
                <span className="flex-1 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {faq.question}
                </span>
                <svg
                  className={`w-4 h-4 flex-shrink-0 mt-0.5 text-neutral-400 transition-transform ${
                    open === faq.id ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {open === faq.id && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// SYSTEM STATUS TAB
// ════════════════════════════════════════════════════════════════════════════
const statusMeta = {
  operational: {
    color: "green",
    dot: "bg-green-500",
    label: "Operational",
  },
  degraded: {
    color: "amber",
    dot: "bg-amber-500",
    label: "Degraded Performance",
  },
  partial_outage: {
    color: "amber",
    dot: "bg-amber-500",
    label: "Partial Outage",
  },
  major_outage: { color: "red", dot: "bg-red-500", label: "Major Outage" },
};

const overallMeta = {
  operational: {
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
    icon: "text-green-600 dark:text-green-400",
    text: "All systems operational",
  },
  degraded: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    icon: "text-amber-600",
    text: "Degraded performance detected",
  },
  major_outage: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    icon: "text-red-600",
    text: "Service disruption in progress",
  },
};

const StatusTab = () => {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await supportAPI.getSystemStatus();
      if (res?.success) {
        setStatusData(res.data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error("Load status failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // refresh every 30 s
    return () => clearInterval(t);
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const overall = statusData?.overall || "operational";
  const meta = overallMeta[overall] || overallMeta.operational;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          System Status
        </h2>
        <div className="flex items-center gap-2">
          {lastRefreshed && (
            <span className="text-xs text-neutral-400">
              Updated {fromNow(lastRefreshed.toISOString())}
            </span>
          )}
          <button
            type="button"
            onClick={load}
            className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            aria-label="Refresh status"
          >
            <svg
              className="w-4 h-4 text-neutral-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Overall banner */}
      <div
        className={`flex items-center gap-3 p-4 rounded-xl border ${meta.bg} ${meta.border}`}
      >
        <svg
          className={`w-6 h-6 ${meta.icon} flex-shrink-0`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          {overall === "operational" ? (
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          ) : (
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          )}
        </svg>
        <p className="font-semibold text-neutral-900 dark:text-neutral-100">
          {meta.text}
        </p>
      </div>

      {/* Service rows */}
      <Card className="divide-y divide-neutral-100 dark:divide-neutral-700">
        {(statusData?.services || []).map((svc) => {
          const m = statusMeta[svc.status] || statusMeta.operational;
          return (
            <div
              key={svc.key}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2 h-2 rounded-full ${m.dot} flex-shrink-0`}
                />
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  {svc.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:block text-xs text-neutral-400">
                  {svc.uptimePercent?.toFixed(2)}% uptime
                </span>
                <Badge color={m.color}>{m.label}</Badge>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN HelpSupport PAGE
// ════════════════════════════════════════════════════════════════════════════
const HelpSupport = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [ticketRefreshKey, setTicketRefreshKey] = useState(0);

  const handleTicketCreated = (ticket) => {
    setTicketRefreshKey((k) => k + 1);
    setActiveTab("my-tickets");
    if (ticket) {
      toast.success(`Ticket #${ticket.$id?.slice(-8)} created.`);
    }
  };

  const dashboardUser = {
    name: user?.name || user?.email || "User",
    email: user?.email || "",
    avatar: user?.avatar || null,
    role: user?.role || "user",
  };

  return (
    <DashboardLayout user={dashboardUser}>
      <div className="max-w-3xl mx-auto pb-12">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Help &amp; Support
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Get help with your account, report issues, or check service status.
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex overflow-x-auto gap-0.5 border-b border-neutral-200 dark:border-neutral-700 mb-6 -mx-1 px-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary-600 text-primary-700 dark:text-primary-400"
                  : "border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && <OverviewTab onNavigate={setActiveTab} />}
        {activeTab === "new-ticket" && (
          <NewTicketTab onTicketCreated={handleTicketCreated} />
        )}
        {activeTab === "my-tickets" && (
          <MyTicketsTab refreshKey={ticketRefreshKey} />
        )}
        {activeTab === "faq" && <FaqTab />}
        {activeTab === "status" && <StatusTab />}
      </div>
    </DashboardLayout>
  );
};

export default HelpSupport;
