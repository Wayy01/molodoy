import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus } from "@/db/schema";

const TONE = { booked: "accent", completed: "success", no_show: "warning", cancelled: "neutral" } as const;

export function StatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  const t = useTranslations("common.status");
  return (
    <Badge tone={TONE[status]} className={className}>
      {t(status)}
    </Badge>
  );
}
