/**
 * Notification abstraction. WhatsApp works out of the box through wa.me deep
 * links (no vendor account). SMS / Email / Push are pluggable providers that
 * activate when vendor credentials are supplied via env.
 */

export interface NotifyPayload {
  to: string; // phone or email or push token
  title: string;
  body: string;
  url?: string;
}

export interface Channel {
  readonly name: "whatsapp" | "sms" | "email" | "push";
  readonly configured: boolean;
  send(payload: NotifyPayload): Promise<void>;
}

/** Build a wa.me link that opens WhatsApp with a prefilled message. */
export function whatsappLink(phone: string, text: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

class WhatsAppChannel implements Channel {
  readonly name = "whatsapp" as const;
  readonly configured = true;
  async send(_payload: NotifyPayload): Promise<void> {
    // Deep-link based: the client opens whatsappLink(); nothing to push server-side.
  }
}

class StubChannel implements Channel {
  constructor(readonly name: "sms" | "email" | "push") {}
  readonly configured = false;
  async send(_payload: NotifyPayload): Promise<void> {
    // No vendor configured — intentionally a no-op until credentials are provided.
  }
}

export const channels: Channel[] = [
  new WhatsAppChannel(),
  new StubChannel("sms"),
  new StubChannel("email"),
  new StubChannel("push"),
];
