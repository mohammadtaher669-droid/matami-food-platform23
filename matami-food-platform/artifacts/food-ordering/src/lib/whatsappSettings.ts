const KEY = "whatsapp_settings";

export interface BranchWhatsApp {
  number: string;
  active: boolean;
}

export interface WhatsAppSettings {
  global: string;
  branches: Record<string, BranchWhatsApp>;
}

export function getWhatsAppSettings(): WhatsAppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { global: "", branches: {} };
    return JSON.parse(raw) as WhatsAppSettings;
  } catch {
    return { global: "", branches: {} };
  }
}

export function saveWhatsAppSettings(settings: WhatsAppSettings): void {
  localStorage.setItem(KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event("whatsapp-settings-updated"));
}

export function getEffectiveBranchWhatsApp(branchId: string, branchDefaultNumber: string): string | null {
  const settings = getWhatsAppSettings();
  const branchSetting = settings.branches[branchId];

  if (branchSetting && branchSetting.active && branchSetting.number) {
    return branchSetting.number;
  }

  if (!branchSetting && branchDefaultNumber) {
    return branchDefaultNumber;
  }

  const globalNumber = settings.global;
  if (globalNumber) return globalNumber;

  return branchDefaultNumber || null;
}

export function getGlobalWhatsApp(): string {
  return getWhatsAppSettings().global || "";
}

export function validateWhatsAppNumber(num: string): boolean {
  const cleaned = num.replace(/\s/g, "");
  return /^\+?[1-9]\d{7,14}$/.test(cleaned);
}

export function formatWhatsAppNumber(num: string): string {
  return num.replace(/\s|\+|-/g, "");
}
