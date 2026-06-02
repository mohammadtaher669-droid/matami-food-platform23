import { useLanguage } from "@/contexts/LanguageContext";
import { Clock } from "lucide-react";

interface Branch {
  open: string;
  close: string;
}

export function isBranchOpen(branch: Branch): boolean {
  const now = new Date();
  const [openH, openM] = branch.open.split(":").map(Number);
  const [closeH, closeM] = branch.close.split(":").map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openH * 60 + openM;
  let closeMinutes = closeH * 60 + closeM;
  if (closeMinutes < openMinutes) closeMinutes += 24 * 60;
  const adjustedNow = nowMinutes < openMinutes ? nowMinutes + 24 * 60 : nowMinutes;
  return adjustedNow >= openMinutes && adjustedNow <= closeMinutes;
}

export default function WorkingHoursStatus({ branch }: { branch: Branch }) {
  const { t } = useLanguage();
  const open = isBranchOpen(branch);

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${open ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
      <Clock size={11} />
      <span>{open ? t("Open Now", "مفتوح الآن") : t("Closed Now", "مغلق حالياً")}</span>
      <span className="opacity-60">· {branch.open} – {branch.close}</span>
    </div>
  );
}
