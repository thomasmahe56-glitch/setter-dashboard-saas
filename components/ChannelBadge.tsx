"use client";
import { Camera, MessageCircle } from "lucide-react";
import { ConversationSummary } from "@/lib/api";
import { getConversationChannel } from "@/lib/utils";

interface Props {
  conversation: ConversationSummary;
  size?: "sm" | "md";
}

export function ChannelBadge({ conversation, size = "md" }: Props) {
  const channel = getConversationChannel(conversation);
  const Icon = channel === "whatsapp" ? MessageCircle : Camera;
  const label = channel === "whatsapp" ? "WhatsApp" : "Instagram";
  const diameter = size === "sm" ? 18 : 20;
  const iconSize = size === "sm" ? 11 : 12;
  const colors = channel === "whatsapp"
    ? { bg: "#25D366", fg: "#fff" }
    : { bg: "#f43f5e", fg: "#fff" };

  return (
    <span
      title={label}
      aria-label={label}
      style={{
        width: diameter,
        height: diameter,
        borderRadius: "50%",
        background: colors.bg,
        color: colors.fg,
        border: "2px solid #fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    >
      <Icon size={iconSize} strokeWidth={2.5} />
    </span>
  );
}
