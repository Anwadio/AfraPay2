import React, { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  BookOpenIcon,
  FolderIcon,
  MapIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ClockIcon,
  UsersIcon,
  ArrowPathIcon,
  LockClosedIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { educationAPI } from "../services/adminAPI";

// ─── Constants ────────────────────────────────────────────────────────────────
const CONTENT_TYPES = [
  "article",
  "video",
  "quiz",
  "tool",
  "infographic",
  "podcast",
];
const DIFFICULTY_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
  "all_levels",
];
const CONTENT_STATUSES = ["draft", "published", "archived"];

const TYPE_BADGE = {
  article: "badge-blue",
  video: "badge-violet",
  quiz: "badge-yellow",
  tool: "badge-green",
  infographic: "badge-blue",
  podcast: "badge-violet",
};
const STATUS_BADGE = {
  published: "badge-green",
  draft: "badge-yellow",
  archived: "badge-gray",
};
const LEVEL_BADGE = {
  beginner: "badge-green",
  intermediate: "badge-blue",
  advanced: "badge-violet",
  all_levels: "badge-gray",
};

function fmt(str) {
  if (!str) return "—";
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Shared UI Helpers ────────────────────────────────────────────────────────
function TableSkeleton({ cols = 7, rows = 8 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-50">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="table-cell">
              <div
                className="skeleton h-4 rounded"
                style={{ width: `${55 + ((i * 13 + j * 7) % 35)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

function EmptyState({ icon: Icon = BookOpenIcon, title, message, action }) {
  return (
    <div className="flex flex-col items-center py-16 text-center px-6">
      <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-slate-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {message && (
        <p className="text-xs text-slate-500 mt-1.5 max-w-xs">{message}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function Pagination({ page, totalPages, totalItems, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;
  const start = Math.max(1, Math.min(totalPages - 4, page - 2));
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, i) => start + i,
  );
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/40">
      <p className="text-xs text-slate-500">
        Page {page} of {totalPages} &middot; {totalItems} items
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn-ghost text-xs py-1.5 px-2.5 disabled:opacity-40"
        >
          Prev
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`text-xs py-1.5 px-2.5 rounded-lg font-medium transition-colors ${p === page ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-100"}`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn-ghost text-xs py-1.5 px-2.5 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, color = "blue" }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="card p-5 flex items-start gap-4">
      <div
        className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 tabular mt-0.5">
          {value ?? <span className="skeleton inline-block h-6 w-12 rounded" />}
        </p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      className="ml-1 text-slate-400 hover:text-slate-600 transition-colors"
      title="Copy ID"
    >
      {copied ? (
        <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <DocumentDuplicateIcon className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

// ─── Content Modal ────────────────────────────────────────────────────────────
const EMPTY_CONTENT = {
  title: "",
  excerpt: "",
  body: "",
  categorySlug: "",
  type: "article",
  level: "beginner",
  durationMinutes: "",
  videoUrl: "",
  tags: "",
  isPremium: false,
  featured: false,
  publishImmediately: false,
};

function ContentModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  categories,
  isSaving,
}) {
  const isEdit = !!initialData?.$id;
  const [form, setForm] = useState(() => {
    if (!initialData) return { ...EMPTY_CONTENT };
    return {
      title: initialData.title || "",
      excerpt: initialData.excerpt || "",
      body: initialData.body || "",
      categorySlug: initialData.categorySlug || "",
      type: initialData.type || "article",
      level: initialData.level || "beginner",
      durationMinutes: initialData.durationMinutes || "",
      videoUrl: initialData.videoUrl || "",
      tags: Array.isArray(initialData.tags)
        ? initialData.tags.join(", ")
        : initialData.tags || "",
      isPremium: !!initialData.isPremium,
      featured: !!initialData.featured,
      publishImmediately: false,
    };
  });

  // Reset when modal opens with new data
  React.useEffect(() => {
    if (isOpen) {
      setForm(
        initialData
          ? {
              title: initialData.title || "",
              excerpt: initialData.excerpt || "",
              body: initialData.body || "",
              categorySlug: initialData.categorySlug || "",
              type: initialData.type || "article",
              level: initialData.level || "beginner",
              durationMinutes: initialData.durationMinutes || "",
              videoUrl: initialData.videoUrl || "",
              tags: Array.isArray(initialData.tags)
                ? initialData.tags.join(", ")
                : initialData.tags || "",
              isPremium: !!initialData.isPremium,
              featured: !!initialData.featured,
              publishImmediately: false,
            }
          : { ...EMPTY_CONTENT },
      );
    }
  }, [isOpen, initialData]);

  const set = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.categorySlug) {
      toast.error("Please select a category");
      return;
    }
    const payload = {
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || undefined,
      body: form.body.trim() || undefined,
      categorySlug: form.categorySlug,
      type: form.type,
      level: form.level,
      durationMinutes: form.durationMinutes
        ? parseInt(form.durationMinutes, 10)
        : undefined,
      videoUrl: form.videoUrl.trim() || undefined,
      tags: form.tags
        ? form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      isPremium: form.isPremium,
      featured: form.featured,
      publishImmediately: !isEdit && form.publishImmediately,
    };
    onSave(payload);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? "Edit Content" : "Create Content"}
          </h2>
          <button onClick={onClose} className="btn-icon">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="overflow-y-auto flex-1">
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Title *</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={set}
                  className="input"
                  placeholder="e.g. Introduction to Budgeting"
                  required
                />
              </div>
              <div>
                <label className="label">Category *</label>
                <select
                  name="categorySlug"
                  value={form.categorySlug}
                  onChange={set}
                  className="select"
                  required
                >
                  <option value="">Select a category</option>
                  {(categories || []).map((c) => (
                    <option key={c.$id || c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Content Type</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={set}
                  className="select"
                >
                  {CONTENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {fmt(t)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Difficulty Level</label>
                <select
                  name="level"
                  value={form.level}
                  onChange={set}
                  className="select"
                >
                  {DIFFICULTY_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {fmt(l)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Duration (minutes)</label>
                <input
                  name="durationMinutes"
                  type="number"
                  min="1"
                  max="9999"
                  value={form.durationMinutes}
                  onChange={set}
                  className="input"
                  placeholder="e.g. 15"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">
                  Excerpt{" "}
                  <span className="font-normal text-slate-400 normal-case">
                    (short teaser shown in listings)
                  </span>
                </label>
                <textarea
                  name="excerpt"
                  value={form.excerpt}
                  onChange={set}
                  className="input resize-none"
                  rows={2}
                  placeholder="A brief, engaging summary of this content…"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">
                  Body{" "}
                  <span className="font-normal text-slate-400 normal-case">
                    (main content)
                  </span>
                </label>
                <textarea
                  name="body"
                  value={form.body}
                  onChange={set}
                  className="input resize-none font-mono text-xs"
                  rows={6}
                  placeholder="The full article/lesson text, markdown supported…"
                />
              </div>
              <div>
                <label className="label">Video URL</label>
                <input
                  name="videoUrl"
                  value={form.videoUrl}
                  onChange={set}
                  className="input"
                  placeholder="https://youtube.com/watch?v=…"
                />
              </div>
              <div>
                <label className="label">
                  Tags{" "}
                  <span className="font-normal text-slate-400 normal-case">
                    (comma-separated)
                  </span>
                </label>
                <input
                  name="tags"
                  value={form.tags}
                  onChange={set}
                  className="input"
                  placeholder="budgeting, savings, personal finance"
                />
              </div>
              <div className="sm:col-span-2 flex flex-wrap items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="isPremium"
                    checked={form.isPremium}
                    onChange={set}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 font-medium">
                    Premium content
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="featured"
                    checked={form.featured}
                    onChange={set}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 font-medium">
                    Featured
                  </span>
                </label>
                {!isEdit && (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="publishImmediately"
                      checked={form.publishImmediately}
                      onChange={set}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-slate-700 font-medium">
                      Publish immediately
                    </span>
                  </label>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/40 sticky bottom-0">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Content"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Category Modal ───────────────────────────────────────────────────────────
const EMPTY_CATEGORY = {
  name: "",
  description: "",
  iconName: "",
  color: "#6366f1",
};

function CategoryModal({ isOpen, onClose, onSave, initialData, isSaving }) {
  const isEdit = !!initialData?.$id;
  const [form, setForm] = useState(() =>
    initialData
      ? {
          name: initialData.name || "",
          description: initialData.description || "",
          iconName: initialData.iconName || "",
          color: initialData.color || "#6366f1",
          active: initialData.active !== false,
          sortOrder: initialData.sortOrder ?? 0,
        }
      : { ...EMPTY_CATEGORY, active: true, sortOrder: 0 },
  );

  React.useEffect(() => {
    if (isOpen) {
      setForm(
        initialData
          ? {
              name: initialData.name || "",
              description: initialData.description || "",
              iconName: initialData.iconName || "",
              color: initialData.color || "#6366f1",
              active: initialData.active !== false,
              sortOrder: initialData.sortOrder ?? 0,
            }
          : { ...EMPTY_CATEGORY, active: true, sortOrder: 0 },
      );
    }
  }, [isOpen, initialData]);

  const set = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      iconName: form.iconName.trim(),
      color: form.color,
    };
    if (isEdit)
      Object.assign(payload, {
        active: form.active,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      });
    onSave(payload);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? "Edit Category" : "Create Category"}
          </h2>
          <button onClick={onClose} className="btn-icon">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="label">Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={set}
              className="input"
              placeholder="e.g. Personal Finance"
              required
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={set}
              className="input resize-none"
              rows={2}
              placeholder="What is this category about?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                Icon{" "}
                <span className="font-normal text-slate-400 normal-case">
                  (emoji or name)
                </span>
              </label>
              <input
                name="iconName"
                value={form.iconName}
                onChange={set}
                className="input"
                placeholder="💰 or wallet-icon"
              />
            </div>
            <div>
              <label className="label">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  name="color"
                  value={form.color}
                  onChange={set}
                  className="h-10 w-10 rounded-lg border border-slate-200 cursor-pointer p-1 flex-shrink-0"
                />
                <input
                  name="color"
                  value={form.color}
                  onChange={set}
                  className="input"
                  placeholder="#6366f1"
                />
              </div>
            </div>
          </div>
          {isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Sort Order</label>
                <input
                  name="sortOrder"
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={set}
                  className="input"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="active"
                    checked={form.active}
                    onChange={set}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 font-medium">
                    Active
                  </span>
                </label>
              </div>
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Category"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Learning Path Modal ──────────────────────────────────────────────────────
const EMPTY_PATH = {
  title: "",
  description: "",
  categorySlug: "",
  level: "beginner",
  estimatedWeeks: "",
  tags: "",
  contentIds: "",
  isPremium: false,
  featured: false,
  status: "draft",
};

function PathModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  categories,
  isSaving,
}) {
  const isEdit = !!initialData?.$id;
  const [form, setForm] = useState(() =>
    initialData
      ? {
          title: initialData.title || "",
          description: initialData.description || "",
          categorySlug: initialData.categorySlug || "",
          level: initialData.level || "beginner",
          estimatedWeeks: initialData.estimatedWeeks || "",
          tags: Array.isArray(initialData.tags)
            ? initialData.tags.join(", ")
            : initialData.tags || "",
          contentIds: Array.isArray(initialData.contentIds)
            ? initialData.contentIds.join("\n")
            : "",
          isPremium: !!initialData.isPremium,
          featured: !!initialData.featured,
          status: initialData.status || "draft",
        }
      : { ...EMPTY_PATH },
  );

  React.useEffect(() => {
    if (isOpen) {
      setForm(
        initialData
          ? {
              title: initialData.title || "",
              description: initialData.description || "",
              categorySlug: initialData.categorySlug || "",
              level: initialData.level || "beginner",
              estimatedWeeks: initialData.estimatedWeeks || "",
              tags: Array.isArray(initialData.tags)
                ? initialData.tags.join(", ")
                : initialData.tags || "",
              contentIds: Array.isArray(initialData.contentIds)
                ? initialData.contentIds.join("\n")
                : "",
              isPremium: !!initialData.isPremium,
              featured: !!initialData.featured,
              status: initialData.status || "draft",
            }
          : { ...EMPTY_PATH },
      );
    }
  }, [isOpen, initialData]);

  const set = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    const contentIds = form.contentIds
      ? form.contentIds
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    onSave({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      categorySlug: form.categorySlug || undefined,
      level: form.level,
      estimatedWeeks: form.estimatedWeeks
        ? parseInt(form.estimatedWeeks, 10)
        : undefined,
      tags: form.tags
        ? form.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      contentIds,
      isPremium: form.isPremium,
      featured: form.featured,
      status: form.status,
    });
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? "Edit Learning Path" : "Create Learning Path"}
          </h2>
          <button onClick={onClose} className="btn-icon">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="overflow-y-auto flex-1">
          <div className="p-6 space-y-4">
            <div>
              <label className="label">Title *</label>
              <input
                name="title"
                value={form.title}
                onChange={set}
                className="input"
                placeholder="e.g. Financial Literacy Fundamentals"
                required
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={set}
                className="input resize-none"
                rows={3}
                placeholder="Describe what learners will achieve…"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Category</label>
                <select
                  name="categorySlug"
                  value={form.categorySlug}
                  onChange={set}
                  className="select"
                >
                  <option value="">Select category</option>
                  {(categories || []).map((c) => (
                    <option key={c.$id || c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Level</label>
                <select
                  name="level"
                  value={form.level}
                  onChange={set}
                  className="select"
                >
                  {DIFFICULTY_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {fmt(l)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Estimated Weeks</label>
                <input
                  name="estimatedWeeks"
                  type="number"
                  min="1"
                  value={form.estimatedWeeks}
                  onChange={set}
                  className="input"
                  placeholder="e.g. 4"
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={set}
                  className="select"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">
                Tags{" "}
                <span className="font-normal text-slate-400 normal-case">
                  (comma-separated)
                </span>
              </label>
              <input
                name="tags"
                value={form.tags}
                onChange={set}
                className="input"
                placeholder="finance, literacy, beginner"
              />
            </div>
            <div>
              <label className="label">
                Content IDs{" "}
                <span className="font-normal text-slate-400 normal-case">
                  (one per line or comma-separated — copy IDs from Content tab)
                </span>
              </label>
              <textarea
                name="contentIds"
                value={form.contentIds}
                onChange={set}
                className="input resize-none font-mono text-xs"
                rows={4}
                placeholder={"67a1b2c3...\n67d4e5f6..."}
              />
            </div>
            <div className="flex flex-wrap items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="isPremium"
                  checked={form.isPremium}
                  onChange={set}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 font-medium">
                  Premium
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="featured"
                  checked={form.featured}
                  onChange={set}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 font-medium">
                  Featured
                </span>
              </label>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/40 sticky bottom-0">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Path"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ isOpen, onClose, onConfirm, target, isDeleting }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <TrashIcon className="h-6 w-6 text-red-500" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">
          Confirm Archive
        </h3>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          This will archive{" "}
          <span className="font-medium text-slate-700">"{target?.title}"</span>.
          It will be hidden from users but can be restored by the system.
        </p>
        <div className="flex items-center justify-center gap-3 mt-5">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="btn-danger"
          >
            {isDeleting ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" /> Archiving…
              </>
            ) : (
              "Archive"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main EducationPage ───────────────────────────────────────────────────────
const TABS = [
  { id: "content", label: "Content", icon: BookOpenIcon },
  { id: "categories", label: "Categories", icon: FolderIcon },
  { id: "paths", label: "Learning Paths", icon: MapIcon },
];
const INIT_FILTERS = {
  page: 1,
  limit: 20,
  search: "",
  category: "",
  type: "",
  status: "all",
};

export default function EducationPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("content");
  const [filters, setFilters] = useState({ ...INIT_FILTERS });
  const [searchInput, setSearchInput] = useState("");

  const [contentModal, setContentModal] = useState({ open: false, data: null });
  const [categoryModal, setCategoryModal] = useState({
    open: false,
    data: null,
  });
  const [pathModal, setPathModal] = useState({ open: false, data: null });
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    target: null,
    type: null,
  });

  // ── Queries ─────────────────────────────────────────────────────────────────
  // Pass status="all" so the (now extended) backend returns all statuses for admins
  // Strip empty/falsy values so optional enum validators on the backend
  // don't receive empty strings (e.g. type="" fails isIn([...TYPES]))
  const buildContentParams = (f) => {
    const params = { page: f.page, limit: f.limit };
    if (f.search) params.search = f.search;
    if (f.category) params.category = f.category;
    if (f.type) params.type = f.type;
    if (f.status && f.status !== "all") params.status = f.status;
    else if (f.status === "all") params.status = "all";
    return params;
  };

  const contentQuery = useQuery(
    ["education-content", filters],
    () => educationAPI.getContent(buildContentParams(filters)),
    { keepPreviousData: true, refetchInterval: 30000, staleTime: 15000 },
  );

  const categoriesQuery = useQuery(
    ["education-categories"],
    educationAPI.getCategories,
    { staleTime: 60000 },
  );

  const pathsQuery = useQuery(
    ["education-paths", { limit: 50, status: "all" }],
    () => educationAPI.getPaths({ limit: 50, status: "all" }),
    { refetchInterval: 60000, staleTime: 30000 },
  );

  const statsQuery = useQuery(
    ["education-admin-stats"],
    educationAPI.getAdminStats,
    { refetchInterval: 30000, staleTime: 15000 },
  );

  // ── Derived data (normalise different response shapes safely) ───────────────
  const stats = statsQuery.data?.data || {};
  const content = contentQuery.data?.data?.items || [];
  const contentPag = contentQuery.data?.data?.pagination || {};
  const categories = categoriesQuery.data?.data || [];
  const paths = pathsQuery.data?.data?.items || [];

  // ── Invalidation helper ──────────────────────────────────────────────────────
  const invalidateContent = useCallback(() => {
    queryClient.invalidateQueries(["education-content"]);
    queryClient.invalidateQueries(["education-admin-stats"]);
  }, [queryClient]);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createContentM = useMutation(educationAPI.createContent, {
    onSuccess: async (res, variables) => {
      toast.success("Content created");
      // Publish immediately if requested
      if (variables.publishImmediately && res?.data?.$id) {
        try {
          await educationAPI.publishContent(res.data.$id);
          toast.success("Content published");
        } catch {
          toast.error("Created but failed to publish — publish manually");
        }
      }
      invalidateContent();
      setContentModal({ open: false, data: null });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to create content"),
  });

  const updateContentM = useMutation(
    ({ id, data }) => educationAPI.updateContent(id, data),
    {
      onSuccess: () => {
        toast.success("Content updated");
        invalidateContent();
        setContentModal({ open: false, data: null });
      },
      onError: (err) =>
        toast.error(err.response?.data?.message || "Failed to update content"),
    },
  );

  const deleteContentM = useMutation(educationAPI.deleteContent, {
    onSuccess: () => {
      toast.success("Content archived");
      invalidateContent();
      setDeleteModal({ open: false, target: null, type: null });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to archive content"),
  });

  const publishM = useMutation(educationAPI.publishContent, {
    onSuccess: () => {
      toast.success("Published");
      invalidateContent();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to publish"),
  });

  const unpublishM = useMutation(educationAPI.unpublishContent, {
    onSuccess: () => {
      toast.success("Unpublished");
      invalidateContent();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to unpublish"),
  });

  const createCategoryM = useMutation(educationAPI.createCategory, {
    onSuccess: () => {
      toast.success("Category created");
      queryClient.invalidateQueries(["education-categories"]);
      queryClient.invalidateQueries(["education-admin-stats"]);
      setCategoryModal({ open: false, data: null });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to create category"),
  });

  const updateCategoryM = useMutation(
    ({ id, data }) => educationAPI.updateCategory(id, data),
    {
      onSuccess: () => {
        toast.success("Category updated");
        queryClient.invalidateQueries(["education-categories"]);
        setCategoryModal({ open: false, data: null });
      },
      onError: (err) =>
        toast.error(err.response?.data?.message || "Failed to update category"),
    },
  );

  const createPathM = useMutation(educationAPI.createPath, {
    onSuccess: () => {
      toast.success("Learning path created");
      queryClient.invalidateQueries(["education-paths"]);
      queryClient.invalidateQueries(["education-admin-stats"]);
      setPathModal({ open: false, data: null });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to create path"),
  });

  const updatePathM = useMutation(
    ({ id, data }) => educationAPI.updatePath(id, data),
    {
      onSuccess: () => {
        toast.success("Learning path updated");
        queryClient.invalidateQueries(["education-paths"]);
        setPathModal({ open: false, data: null });
      },
      onError: (err) =>
        toast.error(err.response?.data?.message || "Failed to update path"),
    },
  );

  const deletePathM = useMutation(educationAPI.deletePath, {
    onSuccess: () => {
      toast.success("Learning path archived");
      queryClient.invalidateQueries(["education-paths"]);
      queryClient.invalidateQueries(["education-admin-stats"]);
      setDeleteModal({ open: false, target: null, type: null });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to archive path"),
  });

  // ── Event handlers ───────────────────────────────────────────────────────────
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, search: searchInput.trim(), page: 1 }));
  };

  const setFilter = (key, value) =>
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const clearFilters = () => {
    setSearchInput("");
    setFilters({ ...INIT_FILTERS });
  };

  const handleContentSave = (data) => {
    if (contentModal.data?.$id) {
      const { publishImmediately: _pi, ...payload } = data;
      updateContentM.mutate({ id: contentModal.data.$id, data: payload });
    } else {
      createContentM.mutate(data);
    }
  };

  const handleCategorySave = (data) => {
    if (categoryModal.data?.$id)
      updateCategoryM.mutate({ id: categoryModal.data.$id, data });
    else createCategoryM.mutate(data);
  };

  const handlePathSave = (data) => {
    if (pathModal.data?.$id)
      updatePathM.mutate({ id: pathModal.data.$id, data });
    else createPathM.mutate(data);
  };

  const handleDeleteConfirm = () => {
    if (!deleteModal.target) return;
    if (deleteModal.type === "content")
      deleteContentM.mutate(deleteModal.target.id);
    else if (deleteModal.type === "path")
      deletePathM.mutate(deleteModal.target.id);
  };

  const hasFilters =
    filters.search ||
    filters.category ||
    filters.type ||
    (filters.status && filters.status !== "all");

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Education</h1>
          <p className="page-subtitle">
            Manage content, categories, and learning paths.
          </p>
        </div>
        {statsQuery.isLoading && (
          <ArrowPathIcon className="h-4 w-4 text-slate-400 animate-spin mt-1.5 flex-shrink-0" />
        )}
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={BookOpenIcon}
          label="Total Content"
          color="blue"
          value={stats.totalContent ?? (statsQuery.isLoading ? null : "—")}
        />
        <SummaryCard
          icon={FolderIcon}
          label="Categories"
          color="violet"
          value={
            stats.totalCategories ??
            (categoriesQuery.isLoading ? null : categories.length || "—")
          }
        />
        <SummaryCard
          icon={MapIcon}
          label="Learning Paths"
          color="amber"
          value={stats.totalPaths ?? (statsQuery.isLoading ? null : "—")}
        />
        <SummaryCard
          icon={UsersIcon}
          label="Enrolments"
          color="green"
          value={stats.totalEnrolments ?? (statsQuery.isLoading ? null : "—")}
        />
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0 border-b border-slate-200">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors duration-150 ${
              activeTab === id
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CONTENT TAB                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "content" && (
        <div className="space-y-4">
          {/* Filters row */}
          <div className="card card-body">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center gap-2 flex-1 min-w-0"
              >
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by title…"
                    className="input pl-9"
                  />
                </div>
                <button type="submit" className="btn-secondary flex-shrink-0">
                  Search
                </button>
              </form>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filters.category}
                  onChange={(e) => setFilter("category", e.target.value)}
                  className="select text-sm py-2"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.$id || c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.type}
                  onChange={(e) => setFilter("type", e.target.value)}
                  className="select text-sm py-2"
                >
                  <option value="">All Types</option>
                  {CONTENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {fmt(t)}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.status}
                  onChange={(e) => setFilter("status", e.target.value)}
                  className="select text-sm py-2"
                >
                  <option value="all">All Statuses</option>
                  {CONTENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {fmt(s)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setContentModal({ open: true, data: null })}
                  className="btn-primary flex-shrink-0"
                >
                  <PlusIcon className="h-4 w-4" /> Create
                </button>
              </div>
            </div>
            {/* Active filter chips */}
            {hasFilters && (
              <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">Filters:</span>
                {filters.search && (
                  <span className="badge badge-blue gap-1">
                    "{filters.search}"
                    <button
                      onClick={() => {
                        setSearchInput("");
                        setFilter("search", "");
                      }}
                      className="ml-0.5"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.category && (
                  <span className="badge badge-violet gap-1">
                    {categories.find((c) => c.slug === filters.category)
                      ?.name || filters.category}
                    <button
                      onClick={() => setFilter("category", "")}
                      className="ml-0.5"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.type && (
                  <span className="badge badge-gray gap-1">
                    {fmt(filters.type)}
                    <button
                      onClick={() => setFilter("type", "")}
                      className="ml-0.5"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.status && filters.status !== "all" && (
                  <span
                    className={`badge ${STATUS_BADGE[filters.status] || "badge-gray"} gap-1`}
                  >
                    {fmt(filters.status)}
                    <button
                      onClick={() => setFilter("status", "all")}
                      className="ml-0.5"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={clearFilters}
                  className="text-xs text-slate-400 hover:text-slate-600 underline ml-1"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Content table */}
          <div className="table-container">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="table-header-cell">Title</th>
                    <th className="table-header-cell">Type</th>
                    <th className="table-header-cell">Category</th>
                    <th className="table-header-cell">Level</th>
                    <th className="table-header-cell">Duration</th>
                    <th className="table-header-cell">Status</th>
                    <th className="table-header-cell">Views</th>
                    <th className="table-header-cell">Actions</th>
                  </tr>
                </thead>
                {contentQuery.isLoading ? (
                  <TableSkeleton cols={8} rows={8} />
                ) : contentQuery.isError ? (
                  <tbody>
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <p className="text-sm text-red-500 font-medium">
                          Failed to load content
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {contentQuery.error?.response?.data?.message ||
                            contentQuery.error?.message}
                        </p>
                        <button
                          onClick={() => contentQuery.refetch()}
                          className="mt-3 btn-ghost text-xs"
                        >
                          <ArrowPathIcon className="h-3.5 w-3.5 mr-1" /> Retry
                        </button>
                      </td>
                    </tr>
                  </tbody>
                ) : content.length === 0 ? (
                  <tbody>
                    <tr>
                      <td colSpan={8}>
                        <EmptyState
                          icon={BookOpenIcon}
                          title={
                            hasFilters
                              ? "No content matches your filters"
                              : "No content yet"
                          }
                          message={
                            hasFilters
                              ? "Try clearing some filters."
                              : "Create your first piece of educational content."
                          }
                          action={
                            hasFilters ? (
                              <button
                                onClick={clearFilters}
                                className="btn-secondary"
                              >
                                Clear filters
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setContentModal({ open: true, data: null })
                                }
                                className="btn-primary"
                              >
                                <PlusIcon className="h-4 w-4" /> Create Content
                              </button>
                            )
                          }
                        />
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody>
                    {content.map((item) => {
                      const id = item.$id || item.id;
                      return (
                        <tr
                          key={id}
                          className="table-row border-b border-slate-50"
                        >
                          <td className="table-cell max-w-xs">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {item.title}
                                </p>
                                {item.featured && (
                                  <StarSolid
                                    className="h-3.5 w-3.5 text-amber-400 flex-shrink-0"
                                    title="Featured"
                                  />
                                )}
                                {item.isPremium && (
                                  <LockClosedIcon
                                    className="h-3.5 w-3.5 text-violet-500 flex-shrink-0"
                                    title="Premium"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 mt-0.5">
                                <span className="text-xs text-slate-400 font-mono truncate max-w-[130px]">
                                  {id}
                                </span>
                                <CopyButton text={id} />
                              </div>
                            </div>
                          </td>
                          <td className="table-cell">
                            <span
                              className={`badge ${TYPE_BADGE[item.type] || "badge-gray"}`}
                            >
                              {item.type}
                            </span>
                          </td>
                          <td className="table-cell text-sm text-slate-600">
                            {item.categorySlug || "—"}
                          </td>
                          <td className="table-cell">
                            <span
                              className={`badge ${LEVEL_BADGE[item.level] || "badge-gray"}`}
                            >
                              {item.level?.replace("_", " ") || "—"}
                            </span>
                          </td>
                          <td className="table-cell">
                            {item.durationMinutes ? (
                              <span className="text-sm text-slate-600 flex items-center gap-1">
                                <ClockIcon className="h-3.5 w-3.5 text-slate-400" />
                                {item.durationMinutes}m
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="table-cell">
                            <span
                              className={`badge ${STATUS_BADGE[item.status] || "badge-gray"}`}
                            >
                              {item.status || "draft"}
                            </span>
                          </td>
                          <td className="table-cell tabular text-sm text-slate-600">
                            {item.views ?? 0}
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  setContentModal({ open: true, data: item })
                                }
                                className="btn-icon"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              {item.status === "published" ? (
                                <button
                                  onClick={() => unpublishM.mutate(id)}
                                  disabled={unpublishM.isLoading}
                                  className="btn-icon text-amber-500 hover:bg-amber-50"
                                  title="Unpublish"
                                >
                                  <NoSymbolIcon className="h-4 w-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => publishM.mutate(id)}
                                  disabled={publishM.isLoading}
                                  className="btn-icon text-emerald-600 hover:bg-emerald-50"
                                  title="Publish"
                                >
                                  <CheckCircleIcon className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  setDeleteModal({
                                    open: true,
                                    target: { id, title: item.title },
                                    type: "content",
                                  })
                                }
                                className="btn-icon text-red-500 hover:bg-red-50"
                                title="Archive"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                )}
              </table>
            </div>
            <Pagination
              page={contentPag.page || filters.page}
              totalPages={contentPag.totalPages}
              totalItems={contentPag.totalItems}
              onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CATEGORIES TAB                                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {categoriesQuery.isLoading
                ? "Loading…"
                : `${categories.length} ${categories.length === 1 ? "category" : "categories"}`}
            </p>
            <button
              onClick={() => setCategoryModal({ open: true, data: null })}
              className="btn-primary"
            >
              <PlusIcon className="h-4 w-4" /> New Category
            </button>
          </div>

          {categoriesQuery.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card p-5 space-y-3">
                  <div className="skeleton h-5 w-2/3 rounded" />
                  <div className="skeleton h-4 w-full rounded" />
                  <div className="skeleton h-4 w-1/2 rounded" />
                </div>
              ))}
            </div>
          ) : categoriesQuery.isError ? (
            <div className="card">
              <EmptyState
                icon={FolderIcon}
                title="Failed to load categories"
                message={
                  categoriesQuery.error?.response?.data?.message ||
                  categoriesQuery.error?.message
                }
              />
            </div>
          ) : categories.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={FolderIcon}
                title="No categories yet"
                message="Create categories to organise your educational content."
                action={
                  <button
                    onClick={() => setCategoryModal({ open: true, data: null })}
                    className="btn-primary"
                  >
                    <PlusIcon className="h-4 w-4" /> Create Category
                  </button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.$id || cat.slug}
                  className="card card-hover p-5 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {cat.iconName ? (
                        <span className="text-2xl leading-none flex-shrink-0">
                          {cat.iconName}
                        </span>
                      ) : cat.color ? (
                        <div
                          className="h-8 w-8 rounded-lg flex-shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                      ) : null}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {cat.name}
                        </p>
                        <p className="text-xs text-slate-400 font-mono truncate">
                          {cat.slug}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setCategoryModal({ open: true, data: cat })
                      }
                      className="btn-icon p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      title="Edit"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {cat.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                      {cat.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span
                      className={`badge ${cat.active !== false ? "badge-green" : "badge-gray"}`}
                    >
                      {cat.active !== false ? "Active" : "Inactive"}
                    </span>
                    {cat.sortOrder != null && (
                      <span className="text-xs text-slate-400">
                        Order {cat.sortOrder}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* LEARNING PATHS TAB                                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "paths" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {pathsQuery.isLoading
                ? "Loading…"
                : `${paths.length} ${paths.length === 1 ? "path" : "paths"}`}
            </p>
            <button
              onClick={() => setPathModal({ open: true, data: null })}
              className="btn-primary"
            >
              <PlusIcon className="h-4 w-4" /> New Path
            </button>
          </div>

          {pathsQuery.isLoading ? (
            <div className="table-container">
              <table className="min-w-full">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    {[
                      "Title",
                      "Category",
                      "Level",
                      "Est. Duration",
                      "Content Items",
                      "Status",
                      "Enrolments",
                      "Actions",
                    ].map((h) => (
                      <th key={h} className="table-header-cell">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <TableSkeleton cols={8} rows={5} />
              </table>
            </div>
          ) : pathsQuery.isError ? (
            <div className="card">
              <EmptyState
                icon={MapIcon}
                title="Failed to load learning paths"
                message={
                  pathsQuery.error?.response?.data?.message ||
                  pathsQuery.error?.message
                }
              />
            </div>
          ) : paths.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={MapIcon}
                title="No learning paths yet"
                message="Create structured paths to guide users through their financial education journey."
                action={
                  <button
                    onClick={() => setPathModal({ open: true, data: null })}
                    className="btn-primary"
                  >
                    <PlusIcon className="h-4 w-4" /> Create Learning Path
                  </button>
                }
              />
            </div>
          ) : (
            <div className="table-container">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="table-header-cell">Title</th>
                      <th className="table-header-cell">Category</th>
                      <th className="table-header-cell">Level</th>
                      <th className="table-header-cell">Est. Duration</th>
                      <th className="table-header-cell">Content Items</th>
                      <th className="table-header-cell">Status</th>
                      <th className="table-header-cell">Enrolments</th>
                      <th className="table-header-cell">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paths.map((path) => {
                      const id = path.$id || path.id;
                      return (
                        <tr
                          key={id}
                          className="table-row border-b border-slate-50"
                        >
                          <td className="table-cell max-w-xs">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {path.title}
                                </p>
                                {path.featured && (
                                  <StarSolid
                                    className="h-3.5 w-3.5 text-amber-400 flex-shrink-0"
                                    title="Featured"
                                  />
                                )}
                                {path.isPremium && (
                                  <LockClosedIcon
                                    className="h-3.5 w-3.5 text-violet-500 flex-shrink-0"
                                    title="Premium"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 mt-0.5">
                                <span className="text-xs text-slate-400 font-mono truncate max-w-[130px]">
                                  {id}
                                </span>
                                <CopyButton text={id} />
                              </div>
                            </div>
                          </td>
                          <td className="table-cell text-sm text-slate-600">
                            {path.categorySlug || "—"}
                          </td>
                          <td className="table-cell">
                            <span
                              className={`badge ${LEVEL_BADGE[path.level] || "badge-gray"}`}
                            >
                              {path.level?.replace("_", " ") || "—"}
                            </span>
                          </td>
                          <td className="table-cell text-sm text-slate-600">
                            {path.estimatedWeeks
                              ? `${path.estimatedWeeks}w`
                              : "—"}
                          </td>
                          <td className="table-cell tabular text-sm text-slate-600">
                            {Array.isArray(path.contentIds)
                              ? path.contentIds.length
                              : 0}
                          </td>
                          <td className="table-cell">
                            <span
                              className={`badge ${STATUS_BADGE[path.status] || "badge-yellow"}`}
                            >
                              {path.status || "draft"}
                            </span>
                          </td>
                          <td className="table-cell tabular text-sm text-slate-600">
                            {path.enrolmentCount ?? 0}
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() =>
                                  setPathModal({ open: true, data: path })
                                }
                                className="btn-icon"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteModal({
                                    open: true,
                                    target: { id, title: path.title },
                                    type: "path",
                                  })
                                }
                                className="btn-icon text-red-500 hover:bg-red-50"
                                title="Archive"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <ContentModal
        isOpen={contentModal.open}
        onClose={() => setContentModal({ open: false, data: null })}
        onSave={handleContentSave}
        initialData={contentModal.data}
        categories={categories}
        isSaving={createContentM.isLoading || updateContentM.isLoading}
      />
      <CategoryModal
        isOpen={categoryModal.open}
        onClose={() => setCategoryModal({ open: false, data: null })}
        onSave={handleCategorySave}
        initialData={categoryModal.data}
        isSaving={createCategoryM.isLoading || updateCategoryM.isLoading}
      />
      <PathModal
        isOpen={pathModal.open}
        onClose={() => setPathModal({ open: false, data: null })}
        onSave={handlePathSave}
        initialData={pathModal.data}
        categories={categories}
        isSaving={createPathM.isLoading || updatePathM.isLoading}
      />
      <DeleteModal
        isOpen={deleteModal.open}
        onClose={() =>
          setDeleteModal({ open: false, target: null, type: null })
        }
        onConfirm={handleDeleteConfirm}
        target={deleteModal.target}
        isDeleting={deleteContentM.isLoading || deletePathM.isLoading}
      />
    </div>
  );
}
