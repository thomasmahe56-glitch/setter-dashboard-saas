const configuredAgentName = process.env.NEXT_PUBLIC_AGENT_NAME?.trim();

export const config = {
  agentName: !configuredAgentName || configuredAgentName === "TestBot" ? "Angelos" : configuredAgentName,
  apiUrl: (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, ""),
};
