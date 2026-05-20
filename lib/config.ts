export const config = {
  agentName: process.env.NEXT_PUBLIC_AGENT_NAME || "Setter Agent",
  apiUrl: (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, ""),
};
