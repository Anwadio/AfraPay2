/**
 * SupportController
 *
 * Manages the customer support system:
 *   Tickets     — create, list (own), view detail
 *   Messages    — add reply to a ticket (user & staff)
 *   FAQs        — static, searchable, categorised article bank
 *   System status — live operational flag per service
 *
 * Appwrite collections required (IDs via env):
 *   APPWRITE_SUPPORT_TICKETS_COLLECTION_ID
 *   APPWRITE_SUPPORT_MESSAGES_COLLECTION_ID
 *
 * Access-control:
 *   All /support/** routes require authentication.
 *   Users can only read/write their own tickets.
 *   Staff (role admin/super_admin) can access any ticket.
 */

"use strict";

const { Client, Databases, Users, ID, Query } = require("node-appwrite");
const config = require("../config/environment");
const logger = require("../utils/logger");
const {
  ValidationError,
  NotFoundError,
  AuthorizationError,
} = require("../middleware/monitoring/errorHandler");

// ── Appwrite client ──────────────────────────────────────────────────────────
const _client = new Client()
  .setEndpoint(config.database.appwrite.endpoint)
  .setProject(config.database.appwrite.projectId)
  .setKey(config.database.appwrite.apiKey);

const db = new Databases(_client);
const users = new Users(_client);

// ── Collection accessors ─────────────────────────────────────────────────────
const DB = () => config.database.appwrite.databaseId;
const TICKETS = () => config.database.appwrite.supportTicketsCollectionId;
const MESSAGES = () => config.database.appwrite.supportMessagesCollectionId;

// ── Static FAQ bank ──────────────────────────────────────────────────────────
// These are baked-in; no extra Appwrite collection required.
const FAQS = [
  // payments
  {
    id: "faq-1",
    category: "payments",
    question: "How long do international transfers take?",
    answer:
      "International transfers typically complete within 1–3 business days, depending on the destination country and receiving bank. Some corridors (e.g., Nigeria ↔ Ghana) can be near-instant. You'll receive an email and in-app notification when your transfer is complete.",
  },
  {
    id: "faq-2",
    category: "payments",
    question: "What are the transaction limits?",
    answer:
      "Limits depend on your KYC verification level. Level 0: up to $100/day. Level 1: up to $1,000/day. Level 2: up to $10,000/day. Level 3 (full verification) has no daily limit, subject to local regulations.",
  },
  {
    id: "faq-3",
    category: "payments",
    question: "Why was my payment declined?",
    answer:
      "Payments may be declined due to an insufficient balance, incorrect recipient details, daily limit exceeded, or our fraud-prevention system flagging unusual activity. Check the notification email for the specific reason. If the issue persists, open a support ticket.",
  },
  // account
  {
    id: "faq-4",
    category: "account",
    question: "How do I verify my account (KYC)?",
    answer:
      "Go to Dashboard → Profile → Verification. You'll need a government-issued photo ID (passport, national ID, or driver's licence) and a matching selfie. Verification usually takes 1–2 business days.",
  },
  {
    id: "faq-5",
    category: "account",
    question: "Can I change the email address on my account?",
    answer:
      "Email changes require identity verification for security reasons. Open a support ticket with the subject 'Email Change Request' and include your current email, desired new email, and a copy of your photo ID.",
  },
  {
    id: "faq-6",
    category: "account",
    question: "How do I close my AfraPay account?",
    answer:
      "Navigate to Settings → Account → Delete Account. Before deletion, ensure your wallet balance is zero — all pending transactions must settle first. For regulatory reasons, account data is retained for 7 years after closure.",
  },
  // security
  {
    id: "faq-7",
    category: "security",
    question: "What should I do if I suspect unauthorised access?",
    answer:
      "Act immediately: (1) Change your password in Settings → Security. (2) Enable Two-Factor Authentication. (3) Log out all other sessions. (4) Open a high-priority support ticket with the subject 'Security Incident'. Our team will investigate and can freeze suspicious activity.",
  },
  {
    id: "faq-8",
    category: "security",
    question: "How does AfraPay protect my money?",
    answer:
      "All customer funds are held in segregated accounts at licensed financial institutions. We use 256-bit AES encryption for data at rest, TLS 1.3 in transit, and operate under PCI-DSS standards. Your money is ring-fenced and is never used to fund business operations.",
  },
  {
    id: "faq-9",
    category: "security",
    question: "What is Two-Factor Authentication and should I enable it?",
    answer:
      "Two-Factor Authentication (2FA) requires both your password and a 6-digit code from an authenticator app (such as Google Authenticator or Authy) to log in. We strongly recommend enabling it in Settings → Security. It is your most effective defence against unauthorised login.",
  },
  // transfers
  {
    id: "faq-10",
    category: "transfers",
    question: "Can I cancel or reverse a transfer?",
    answer:
      "Once a transfer has been confirmed by the receiving institution, it cannot be reversed. If the transfer is still in 'pending' status, open a support ticket immediately. Act within 30 minutes for the best chance of cancellation.",
  },
  {
    id: "faq-11",
    category: "transfers",
    question: "What currencies does AfraPay support?",
    answer:
      "AfraPay currently supports NGN, GHS, KES, ZAR, UGX, TZS, RWF, XOF, and USD. More currencies are added regularly. Check our Pricing page for the latest list and real-time exchange rates.",
  },
  // fees
  {
    id: "faq-12",
    category: "fees",
    question: "What are AfraPay's fees?",
    answer:
      "Transfers are charged at 1% (minimum $0.50, maximum $15.00) plus the interbank FX spread. Topping up your wallet and receiving money are always free. A detailed fee schedule is available on our Pricing page.",
  },
  {
    id: "faq-13",
    category: "fees",
    question: "Are there fees for receiving money?",
    answer:
      "No. Receiving money into your AfraPay wallet is completely free. Fees only apply when you send money or initiate an international transfer.",
  },
  {
    id: "faq-14",
    category: "fees",
    question: "Why was I charged more than the displayed fee?",
    answer:
      "The displayed fee is calculated on the send amount at the time of quote. Exchange rates are locked for 60 seconds. If you initiated the transfer after the rate expired, the recalculated rate may differ slightly. The final fee breakdown is always shown on your transaction receipt.",
  },
];

// ── System services monitored on the status page ────────────────────────────
const SERVICES = [
  { name: "Payment Processing", key: "payments" },
  { name: "International Transfers", key: "transfers" },
  { name: "Wallet Services", key: "wallet" },
  { name: "Identity Verification", key: "kyc" },
  { name: "Mobile App", key: "mobile" },
  { name: "Website & Dashboard", key: "web" },
  { name: "Email Notifications", key: "email" },
];

// ── Controller ───────────────────────────────────────────────────────────────
class SupportController {
  // ── GET /support/faqs ────────────────────────────────────────────────────
  async getFaqs(req, res) {
    const { category, q } = req.query;
    let results = FAQS;

    if (category && category !== "all") {
      results = results.filter((f) => f.category === category);
    }

    if (q && q.trim()) {
      const lower = q.toLowerCase();
      results = results.filter(
        (f) =>
          f.question.toLowerCase().includes(lower) ||
          f.answer.toLowerCase().includes(lower),
      );
    }

    const categories = [...new Set(FAQS.map((f) => f.category))].map((c) => ({
      id: c,
      label: c.charAt(0).toUpperCase() + c.slice(1),
    }));

    res.success(
      { faqs: results, total: results.length, categories },
      "FAQs retrieved",
    );
  }

  // ── GET /support/system-status ───────────────────────────────────────────
  // In production: parallel-ping microservice health endpoints and surface
  // real latency. Here we return all-operational as the baseline.
  async getSystemStatus(_req, res) {
    const services = SERVICES.map((s) => ({
      ...s,
      status: "operational", // operational | degraded | partial_outage | major_outage
      uptimePercent: 99.99,
    }));

    res.success(
      {
        overall: "operational",
        services,
        lastChecked: new Date().toISOString(),
      },
      "System status retrieved",
    );
  }

  // ── POST /support/tickets ────────────────────────────────────────────────
  async createTicket(req, res) {
    const { user } = req;
    const { subject, category, priority = "medium", message } = req.body;

    if (!TICKETS() || !MESSAGES()) {
      throw new ValidationError(
        "Support ticketing is temporarily unavailable. " +
          "Please email support@afrapayafrica.com directly.",
      );
    }

    // Fetch the full user record so we get the stored name
    let userName = "";
    try {
      const appwriteUser = await users.get(user.id);
      userName = appwriteUser.name || "";
    } catch {
      // Non-fatal — fall back to email prefix
      userName = (user.email || "").split("@")[0];
    }

    const now = new Date().toISOString();

    const ticket = await db.createDocument(DB(), TICKETS(), ID.unique(), {
      userId: user.id,
      email: user.email || "",
      name: userName,
      subject: subject.trim(),
      category,
      priority,
      status: "open",
      messageCount: 1,
      lastReplyAt: now,
      $createdAt: now,
      $updatedAt: now,
    });

    // Persist the opening message as the first thread entry
    await db.createDocument(DB(), MESSAGES(), ID.unique(), {
      ticketId: ticket.$id,
      userId: user.id,
      senderName: userName || user.email || "User",
      message: message.trim(),
      isStaff: false,
      $createdAt: now,
      $updatedAt: now,
    });

    logger.audit("SUPPORT_TICKET_CREATED", user.id, {
      ticketId: ticket.$id,
      category,
      priority,
      ip: req.ip,
    });

    return res.status(201).json({
      success: true,
      data: { ticket },
      message:
        "Ticket submitted successfully. We typically respond within 4 business hours.",
    });
  }

  // ── GET /support/tickets ─────────────────────────────────────────────────
  async getTickets(req, res) {
    const { user } = req;
    const { status, page = "1", limit = "10" } = req.query;

    if (!TICKETS()) {
      return res.success({ tickets: [], total: 0 }, "No tickets");
    }

    const filters = [
      Query.equal("userId", user.id),
      Query.orderDesc("$updatedAt"),
    ];
    if (status && status !== "all") {
      filters.push(Query.equal("status", status));
    }

    const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const offset = Math.max(0, (parseInt(page, 10) - 1) * pageSize);

    const response = await db.listDocuments(DB(), TICKETS(), [
      ...filters,
      Query.limit(pageSize),
      Query.offset(offset),
    ]);

    res.success(
      { tickets: response.documents, total: response.total },
      "Tickets retrieved",
    );
  }

  // ── GET /support/tickets/:id ─────────────────────────────────────────────
  async getTicket(req, res) {
    const { user } = req;
    const { id } = req.params;

    if (!TICKETS()) throw new NotFoundError("Ticket not found");

    let ticket;
    try {
      ticket = await db.getDocument(DB(), TICKETS(), id);
    } catch {
      throw new NotFoundError("Ticket not found");
    }

    // Only owner or admin may read the ticket
    if (
      ticket.userId !== user.id &&
      user.role !== "admin" &&
      user.role !== "super_admin"
    ) {
      throw new AuthorizationError(
        "You do not have permission to view this ticket",
      );
    }

    let messages = [];
    if (MESSAGES()) {
      const msgRes = await db.listDocuments(DB(), MESSAGES(), [
        Query.equal("ticketId", id),
        Query.orderAsc("$createdAt"),
        Query.limit(200),
      ]);
      messages = msgRes.documents;
    }

    res.success({ ticket, messages }, "Ticket retrieved");
  }

  // ── POST /support/tickets/:id/messages ──────────────────────────────────
  async addMessage(req, res) {
    const { user } = req;
    const { id } = req.params;
    const { message } = req.body;

    if (!TICKETS() || !MESSAGES()) {
      throw new ValidationError(
        "Support messaging is temporarily unavailable.",
      );
    }

    let ticket;
    try {
      ticket = await db.getDocument(DB(), TICKETS(), id);
    } catch {
      throw new NotFoundError("Ticket not found");
    }

    if (
      ticket.userId !== user.id &&
      user.role !== "admin" &&
      user.role !== "super_admin"
    ) {
      throw new AuthorizationError("Access denied");
    }

    if (ticket.status === "closed") {
      throw new ValidationError(
        "This ticket is closed. Please open a new ticket if you need further assistance.",
      );
    }

    const now = new Date().toISOString();
    const isStaff = user.role === "admin" || user.role === "super_admin";

    // Resolve sender name from Appwrite (req.user has no name field)
    let senderName = "";
    try {
      const appwriteUser = await users.get(user.id);
      senderName = appwriteUser.name || "";
    } catch {
      senderName = (user.email || "").split("@")[0];
    }

    const msgDoc = await db.createDocument(DB(), MESSAGES(), ID.unique(), {
      ticketId: id,
      userId: user.id,
      senderName: senderName || user.email || "User",
      message: message.trim(),
      isStaff,
      $createdAt: now,
    });

    // Advance ticket status and bump counters
    const newStatus =
      isStaff && ticket.status === "open" ? "in-progress" : ticket.status;

    await db.updateDocument(DB(), TICKETS(), id, {
      status: newStatus,
      messageCount: (ticket.messageCount || 1) + 1,
      lastReplyAt: now,
      $updatedAt: now,
    });

    logger.info("Support ticket message added", {
      ticketId: id,
      userId: user.id,
      isStaff,
    });

    return res.status(201).json({
      success: true,
      data: { message: msgDoc },
      message: "Message sent",
    });
  }
}

module.exports = new SupportController();
