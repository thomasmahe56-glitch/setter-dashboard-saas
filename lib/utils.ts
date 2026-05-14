import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ConversationSummary, Status } from "./api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_LABELS: Record<Status, string> = {
  nouveau: "Nouveau",
  en_cours: "En cours",
  page_envoyee: "Page envoyée",
  appel_booke: "Appel booké",
  signe: "Signé",
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

export function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
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
  const displayName = cleanInstagramHandle(conversation.display_name);
  const username = cleanInstagramHandle(conversation.username);

  if (isLikelyInstagramHandle(displayName)) return displayName;
  if (isLikelyInstagramHandle(username)) return username;
  return "";
}
