'use client';

import { useGameStore } from '@/game/state/store';
import { X, Package, Truck, Box, Zap, Activity } from 'lucide-react';
import ModelPreview from './ModelPreview';
import { BUILDINGS } from '@/game/buildings/BuildingConfig';

const BUILDING_VISUALS: Record<string, { icon: any, color: string }> = {
    'hub': { icon: Activity, color: 'text-orange-500' },
    'extractor': { icon: Package, color: 'text-amber-500' },
    'conveyor': { icon: Truck, color: 'text-blue-500' },
    'chest': { icon: Box, color: 'text-yellow-700' },
    'electric_pole': { icon: Zap, color: 'text-gray-400' },
    'cable': { icon: Activity, color: 'text-white' },
};

export default function BuildingMenu() {
    const isBuildingMenuOpen = useGameStore((state) => state.isBuildingMenuOpen);
    const toggleBuildingMenu = useGameStore((state) => state.toggleBuildingMenu);
    const buildingCounts = useGameStore((state) => state.buildingCounts);
    const setSelectedBuilding = useGameStore((state) => state.setSelectedBuilding);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('buildingId', id);
    };

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${isBuildingMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
        >
            <div className={`bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl w-[800px] h-[600px] shadow-2xl flex flex-col overflow-hidden transition-transform duration-200 ${isBuildingMenuOpen ? 'scale-100' : 'scale-95'
                }`}>
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Construction Menu</h2>
                        <p className="text-gray-400 text-sm">Drag buildings to your hotbar to equip them.</p>
                    </div>
                    <button
                        onClick={toggleBuildingMenu}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Grid */}
                <div className="flex-1 p-8 overflow-y-auto">
                    <div className="grid grid-cols-4 gap-6">
                        {Object.values(BUILDINGS).map((b) => {
                            const visual = BUILDING_VISUALS[b.type] || { icon: Box, color: 'text-gray-500' };
                            const currentCount = buildingCounts[b.type] || 0;
                            const isLimitReached = b.maxCount ? currentCount >= b.maxCount : false;

                            return (
                                <div
                                    key={b.type}
                                    className={`aspect-square bg-gray-800/50 rounded-xl border transition-all group relative flex flex-col items-center justify-center gap-4
                                        ${isLimitReached
                                            ? 'border-red-500/30 opacity-70 cursor-not-allowed'
                                            : 'border-white/5 hover:border-indigo-500/50 hover:bg-gray-800 cursor-grab active:cursor-grabbing'
                                        }`}
                                    draggable={!isLimitReached}
                                    onDragStart={(e) => !isLimitReached && handleDragStart(e, b.type)}
                                    onClick={() => {
                                        if (!isLimitReached) {
                                            setSelectedBuilding(b.type);
                                            toggleBuildingMenu();
                                        }
                                    }}
                                >
                                    <div className="w-24 h-24 relative">
                                        <ModelPreview type="building" id={b.type} width={96} height={96} />
                                    </div>
                                    <div className="text-center">
                                        <span className={`font-bold text-lg transition-colors ${isLimitReached ? 'text-red-400' : 'text-gray-300 group-hover:text-white'}`}>
                                            {b.name}
                                        </span>
                                        {b.maxCount && (
                                            <div className={`text-xs mt-1 ${isLimitReached ? 'text-red-400 font-bold' : 'text-gray-500'}`}>
                                                {currentCount} / {b.maxCount}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
