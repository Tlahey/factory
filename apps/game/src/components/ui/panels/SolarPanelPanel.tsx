import { SolarPanel } from "@/game/buildings/solar-panel/SolarPanel";
import { PowerProducerWidget } from "./widgets/PowerProducerWidget";
import { StatusIndicatorWidget } from "./widgets/StatusIndicatorWidget";
import { GaugeWidget } from "./widgets/GaugeWidget";
import { Sun } from "lucide-react";

interface SolarPanelPanelProps {
    building: SolarPanel;
}

export function SolarPanelPanel({ building }: SolarPanelPanelProps) {
    // Use sunlight intensity from building logic
    // Since UI re-renders on tick (GameProvider triggers re-renders or we force update), 
    // we can read directly. 
    // Ideally components should subscribe or use selectors, but for now props are refreshed.

    const efficiency = Math.round(building.sunlightIntensity * 100);

    return (
        <div className="space-y-4 py-2">
            <StatusIndicatorWidget status={building.operationStatus} />

            {/* Sunlight Indicator */}
            <GaugeWidget
                value={efficiency}
                label="Sunlight Efficiency"
                icon={Sun}
                color="yellow"
            />

            <PowerProducerWidget building={building} />
        </div>
    );
}
