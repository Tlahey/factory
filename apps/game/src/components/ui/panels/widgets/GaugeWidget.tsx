import { LucideIcon } from "lucide-react";

interface GaugeWidgetProps {
    /** Current value (0 to 100) */
    value: number;
    label: string;
    icon: LucideIcon;
    /** Color theme */
    color?: "orange" | "green" | "blue" | "red" | "yellow";
    /** Optional suffix for the value text (e.g. "%") */
    valueSuffix?: string;
}

const colorStyles = {
    orange: {
        bar: "from-orange-600 to-orange-400",
        text: "text-orange-400",
        icon: "text-orange-500",
    },
    green: {
        bar: "from-green-600 to-green-400",
        text: "text-green-400",
        icon: "text-green-500",
    },
    blue: {
        bar: "from-blue-600 to-blue-400",
        text: "text-blue-400",
        icon: "text-blue-500",
    },
    red: {
        bar: "from-red-600 to-red-400",
        text: "text-red-400",
        icon: "text-red-500",
    },
    yellow: {
        bar: "from-yellow-600 to-yellow-400",
        text: "text-yellow-400",
        icon: "text-yellow-500",
    },
};

export function GaugeWidget({
    value,
    label,
    icon: Icon,
    color = "blue",
    valueSuffix = "%",
}: GaugeWidgetProps) {
    const styles = colorStyles[color];
    const clampedValue = Math.min(100, Math.max(0, value));

    return (
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <Icon size={14} className={styles.icon} />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {label}
                    </span>
                </div>
                <span className={`text-sm font-mono font-bold ${styles.text}`}>
                    {Math.round(clampedValue)}
                    {valueSuffix}
                </span>
            </div>
            <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div
                    className={`h-full bg-gradient-to-r ${styles.bar} transition-all duration-300`}
                    style={{ width: `${clampedValue}%` }}
                />
            </div>
        </div>
    );
}
