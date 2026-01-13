import { Clock, Loader2, CheckCircle2, XCircle } from "lucide-react";

export const STATUS_CONFIG = {
    PENDING: {
        icon: Clock,
        text: "Pending Analysis",
        color: "text-gray-500",
        bg: "bg-gray-100",
        // Additional variants for flexibility
        badgeClass: "bg-white/15",
    },
    ANALYZING: {
        icon: Loader2,
        text: "Analyzing...",
        color: "text-[#05dc7f]",
        bg: "bg-[#05dc7f]/10",
        badgeClass: "bg-white/25",
    },
    DONE: {
        icon: CheckCircle2,
        text: "Analysis Complete",
        color: "text-[#047857]",
        bg: "bg-[#a7f3d0]/30",
        badgeClass: "bg-white/30",
    },
    ERROR: {
        icon: XCircle,
        text: "Analysis Failed",
        color: "text-red-500",
        bg: "bg-red-100",
        badgeClass: "bg-[rgba(255,100,100,0.3)]",
    },
} as const;

export type AnalysisStatus = keyof typeof STATUS_CONFIG;

export function getStatusConfig(status: string | undefined) {
    return STATUS_CONFIG[status as AnalysisStatus] ?? STATUS_CONFIG.PENDING;
}
