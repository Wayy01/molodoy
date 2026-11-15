import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus } from "@/db/schema";

const TONE = { booked: "info", completed: "success", no_show: "danger", cancelled: "neutral" } as const;

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const t = useTranslations("common.status");
  return <Badge tone={TONE[status]}>{t(status)}</Badge>;
}
