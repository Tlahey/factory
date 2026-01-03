'use client';

import { useGameStore } from '@/game/state/store';
import clsx from 'clsx';
import ModelPreview from './ModelPreview';

export default function BuildingSidebar() {
    const selectedBuilding = useGameStore((state) => state.selectedBuilding);
    const setSelectedBuilding = useGameStore((state) => state.setSelectedBuilding);
    const hotbar = useGameStore((state) => state.hotbar);
    const setHotbarSlot = useGameStore((state) => state.setHotbarSlot);

    const handleDrop = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        const buildingId = e.dataTransfer.getData('buildingId');
        if (buildingId) {
            setHotbarSlot(index, buildingId);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div className="flex flex-row gap-2 pointer-events-auto items-end bg-black/40 backdrop-blur-sm p-2 rounded-xl border border-white/10">
            {hotbar.map((buildingId, index) => {
                const isSelected = !!buildingId && selectedBuilding === buildingId;

                return (
                    <div
                        key={index}
                        className="relative group"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                    >
                        {/* Slot Number */}
                        <span className="absolute left-1 top-1 text-[10px] text-gray-500 font-mono z-10">{index + 1}</span>

                        <button
                            onClick={() => buildingId && setSelectedBuilding(isSelected ? null : buildingId)}
                            disabled={!buildingId}
                            className={clsx(
                                'w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-200 border-2 relative overflow-hidden',
                                isSelected
                                    ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                    : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                            )}
                            title={buildingId || 'Empty Slot'}
                        >
                            {buildingId ? (
                                <div className="p-2">
                                    <ModelPreview type="building" id={buildingId} width={48} height={48} />
                                </div>
                            ) : (
                                <div className="text-white/10 text-xs">+</div>
                            )}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
