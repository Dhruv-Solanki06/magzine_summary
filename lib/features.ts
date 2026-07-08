// lib/features.ts — build-time feature flags.

// AI record chat ("DeepSeek guide") is disabled for now: the /api/record-chat
// route is unauthenticated and calls a paid model, so leaving it open risks
// abuse and cost. Flip this to `true` to re-enable — but before doing so, gate
// it behind auth (see pages/api/uploadthing.ts for the Bearer-token pattern and
// components/auth/AuthGate.tsx for the client requireAuth() pattern).
export const AI_CHAT_ENABLED: boolean = false;
