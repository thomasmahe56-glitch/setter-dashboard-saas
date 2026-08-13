import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ConversationSummary, Status } from "./api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_LABELS: Record<Status, string> = {
  nouveau: "New",
  en_cours: "In progress",
  page_envoyee: "Page sent",
  appel_booke: "Call booked",
  signe: "Signed",
};

export const STATUS_STYLE: Record<Status, { color: string; bg: string; border: string }> = {
  nouveau:      { color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  en_cours:     { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  page_envoyee: { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  appel_booke:  { color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
  signe:        { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
};

export const STATUS_BAR_COLOR: Record<Status, string> = {
  nouveau: "#3b82f6",
  en_cours: "#f59e0b",
  page_envoyee: "#7c3aed",
  appel_booke: "#06b6d4",
  signe: "#22c55e",
};

export const FALLBACK_STATUS_STYLE = { color: "#4b5563", bg: "#f3f4f6", border: "#e5e7eb" };

export function getStatusLabel(status?: string | null, t?: (key: string, fallback: string) => string): string {
  if (status && status in STATUS_LABELS) return t ? t(`status.${status}`, STATUS_LABELS[status as Status]) : STATUS_LABELS[status as Status];
  if (status === "pending_delivery") return t ? t("status.pending_delivery", "Pending delivery") : "Pending delivery";
  return status ? status.replace(/_/g, " ") : (t ? t("status.unknown", "Unknown") : "Unknown");
}

export function getStatusStyle(status?: string | null) {
  if (status && status in STATUS_STYLE) return STATUS_STYLE[status as Status];
  return FALLBACK_STATUS_STYLE;
}

export function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}j`;
}

const AVATAR_BG = [
  "#ec4899","#f97316","#8b5cf6","#06b6d4","#22c55e","#3b82f6","#f43f5e","#6366f1"
];
export function avatarBg(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_BG[Math.abs(h) % AVATAR_BG.length];
}

const PLACEHOLDER_RE = /\{\{[^}]*\}\}/;
// ManyChat subscriber IDs are pure numeric strings (typically 7–10 digits).
const NUMERIC_ID_RE = /^\d{6,}$/;

export function isPlaceholderName(value?: string | null): boolean {
  if (!value) return false;
  const v = value.trim();
  return PLACEHOLDER_RE.test(v) || NUMERIC_ID_RE.test(v);
}

export function safeDisplayName(value?: string | null, fallback = "Instagram prospect"): string {
  if (!value || isPlaceholderName(value)) return fallback;
  return value.trim();
}

function cleanInstagramHandle(value?: string | null): string {
  if (!value) return "";
  return value
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .split(/[/?#\s]/)[0]
    .trim();
}

function isLikelyInstagramHandle(value: string): boolean {
  return /^[A-Za-z0-9._]{1,30}$/.test(value) && !/^\d{8,}$/.test(value);
}

export function getInstagramHandle(conversation: ConversationSummary): string {
  const rawDisplay = isPlaceholderName(conversation.display_name) ? "" : conversation.display_name;
  const displayName = cleanInstagramHandle(rawDisplay);
  const username = cleanInstagramHandle(conversation.username);

  if (isLikelyInstagramHandle(displayName)) return displayName;
  if (isLikelyInstagramHandle(username)) return username;
  return "";
}

export function getConversationChannel(conversation: ConversationSummary): "instagram" | "whatsapp" {
  return conversation.channel === "whatsapp" ? "whatsapp" : "instagram";
}

export function getWhatsappNumber(conversation: ConversationSummary): string {
  const value = conversation.phone_e164 || conversation.external_contact_id || conversation.username || "";
  const digits = value.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

export function getContactLabel(conversation: ConversationSummary): string {
  if (getConversationChannel(conversation) === "whatsapp") {
    const phone = getWhatsappNumber(conversation);
    return phone ? `WhatsApp · ${phone}` : "WhatsApp";
  }

  const handle = getInstagramHandle(conversation);
  return handle ? `@${handle}` : conversation.username;
}

export function getContactUrl(conversation: ConversationSummary, intent: "profile" | "message" = "profile"): string {
  if (getConversationChannel(conversation) === "whatsapp") {
    const digits = getWhatsappNumber(conversation).replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}` : "";
  }

  const handle = getInstagramHandle(conversation);
  if (!handle) return "";
  return intent === "message" ? `https://ig.me/m/${handle}` : `https://instagram.com/${handle}`;
}
