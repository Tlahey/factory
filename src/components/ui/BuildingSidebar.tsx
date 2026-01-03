'use client';

import { useState } from 'react';
import { useGameStore } from '@/game/state/store';
import clsx from 'clsx';
import { Package, Truck, Box } from 'lucide-react';
import ModelPreview from './ModelPreview';

const BUILDINGS = [
    { id: 'extractor', name: 'Extractor', icon: Package, color: 'text-amber-500' },
    { id: 'conveyor', name: 'Conveyor', icon: Truck, color: 'text-blue-500' },
    { id: 'chest', name: 'Chest', icon: Box, color: 'text-yellow-700' },
];

export default function BuildingSidebar() {
    const selectedBuilding = useGameStore((state) => state.selectedBuilding);
    const setSelectedBuilding = useGameStore((state) => state.setSelectedBuilding);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    return (
        <div className="flex flex-col gap-6 pointer-events-auto items-end">
            {BUILDINGS.map((b) => {
                const isSelected = selectedBuilding === b.id;
                const isHovered = hoveredId === b.id;

                return (
                    <button
                        key={b.id}
                        onClick={() => setSelectedBuilding(isSelected ? null : b.id)}
                        onMouseEnter={() => setHoveredId(b.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={clsx(
                            'w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 relative group border-2',
                            isSelected
                                ? 'bg-black/60 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] scale-110'
                                : 'bg-black/40 border-white/10 hover:bg-black/60 hover:border-white/30 hover:scale-105'
                        )}
                        title={b.name}
                    >
                        {/* 3D Preview */}
                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl">
                            <ModelPreview type="building" id={b.id} width={80} height={80} isHovered={isHovered} />
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
