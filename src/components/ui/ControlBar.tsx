import { useGameStore } from '@/game/state/store';
import clsx from 'clsx';
import { MousePointer2, Trash2, Package } from 'lucide-react';

export default function ControlBar() {
    const selectedBuilding = useGameStore((state) => state.selectedBuilding);
    const setSelectedBuilding = useGameStore((state) => state.setSelectedBuilding);
    const isInventoryOpen = useGameStore((state) => state.isInventoryOpen);
    const toggleInventory = useGameStore((state) => state.toggleInventory);

    const controls = [
        {
            id: 'select',
            name: 'Select',
            icon: MousePointer2,
            color: 'text-blue-400',
            action: () => setSelectedBuilding(selectedBuilding === 'select' ? null : 'select'),
            isActive: selectedBuilding === 'select',
            shortcut: 'S'
        },
        {
            id: 'delete',
            name: 'Delete',
            icon: Trash2,
            color: 'text-red-500',
            action: () => setSelectedBuilding(selectedBuilding === 'delete' ? null : 'delete'),
            isActive: selectedBuilding === 'delete',
            shortcut: 'Del'
        },
        {
            id: 'inventory',
            name: 'Inventory',
            icon: Package,
            color: 'text-amber-400',
            action: () => toggleInventory(),
            isActive: isInventoryOpen,
            shortcut: 'I'
        },
    ];

    return (
        <div className="bg-black/80 p-2 rounded-2xl flex gap-4 pointer-events-auto border border-white/10 backdrop-blur-md shadow-2xl">
            {controls.map((c) => {
                const Icon = c.icon;
                const isSelected = c.isActive;

                return (
                    <button
                        key={c.id}
                        onClick={c.action}
                        className={clsx(
                            'w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all duration-200 relative group',
                            isSelected
                                ? 'bg-white/20 text-white ring-2 ring-white/50'
                                : 'bg-transparent text-gray-400 hover:bg-white/10 hover:text-white'
                        )}
                        title={`${c.name} (${c.shortcut})`}
                    >
                        <Icon size={20} className={clsx('transition-colors mb-0.5', isSelected ? 'text-white' : c.color)} />

                        <span className="text-[10px] font-mono opacity-50 font-bold uppercase tracking-wider">{c.shortcut}</span>

                        {/* Active Indicator Dot */}
                        {isSelected && (
                            <span className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"></span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
