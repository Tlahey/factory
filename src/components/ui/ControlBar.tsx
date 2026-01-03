import { useGameStore } from '@/game/state/store';
import clsx from 'clsx';
import { MousePointer2, Trash2, Package, LayoutGrid } from 'lucide-react';

export default function ControlBar() {
    const selectedBuilding = useGameStore((state) => state.selectedBuilding);
    const setSelectedBuilding = useGameStore((state) => state.setSelectedBuilding);
    const isInventoryOpen = useGameStore((state) => state.isInventoryOpen);
    const toggleInventory = useGameStore((state) => state.toggleInventory);
    const isBuildingMenuOpen = useGameStore((state) => state.isBuildingMenuOpen);
    const toggleBuildingMenu = useGameStore((state) => state.toggleBuildingMenu);

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
        {
            id: 'build',
            name: 'Build',
            icon: LayoutGrid,
            color: 'text-green-400',
            action: () => toggleBuildingMenu(),
            isActive: isBuildingMenuOpen,
            shortcut: 'B'
        },
    ];

    return (
        <div className="bg-black/80 p-1.5 rounded-xl flex gap-2 pointer-events-auto border border-white/10 backdrop-blur-md shadow-2xl">
            {controls.map((c) => {
                const Icon = c.icon;
                const isSelected = c.isActive;

                return (
                    <button
                        key={c.id}
                        onClick={c.action}
                        className={clsx(
                            'w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 relative group',
                            isSelected
                                ? 'bg-white/20 text-white ring-1 ring-white/50'
                                : 'bg-transparent text-gray-400 hover:bg-white/10 hover:text-white'
                        )}
                        title={`${c.name} (${c.shortcut})`}
                    >
                        <Icon size={18} className={clsx('transition-colors', isSelected ? 'text-white' : c.color)} />

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
