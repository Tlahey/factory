'use client';

import { useGameStore } from '@/game/state/store';
import { useState, useEffect } from 'react';
import { X, ArrowUpCircle, Box, Zap } from 'lucide-react';
import { Chest } from '@/game/buildings/chest/Chest';
import { Extractor } from '@/game/buildings/extractor/Extractor';
import ModelPreview from './ModelPreview';

export default function BuildingInfoPanel() {
    const openedEntityKey = useGameStore((state) => state.openedEntityKey);
    const setOpenedEntityKey = useGameStore((state) => state.setOpenedEntityKey);
    const inventory = useGameStore((state) => state.inventory);
    const removeItem = useGameStore((state) => state.removeItem);

    const [building, setBuilding] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'upgrade'>('overview');
    const [ignored, forceUpdate] = useState(0);

    // Poll for building updates
    useEffect(() => {
        if (!openedEntityKey) return;

        const interval = setInterval(() => {
            const [x, y] = openedEntityKey.split(',').map(Number);
            const b = (window as any).game?.world.getBuilding(x, y);
            setBuilding(b);
            forceUpdate(n => n + 1);
        }, 33);

        return () => clearInterval(interval);
    }, [openedEntityKey]);

    // Event Listener for Drops on HUD (Chest -> HUD)
    useEffect(() => {
        const handleInventoryDrop = (e: any) => {
            if (!building || !(building instanceof Chest)) return;

            const { source, sourceIndex, targetIndex, type } = e.detail;

            // Only handle if this panel is open for the source chest?
            // Actually, if we drag from THIS panel, 'source' is 'chest'. 
            // We assume single open container model for now.
            if (source === 'chest') {
                // The event details come from HUD drop handler
                const chestSlot = building.slots[sourceIndex];
                if (!chestSlot) return; // Sync issue?

                // 1. Add to Player Inventory (Handle Stack Merging)
                const currentInv = useGameStore.getState().inventory;
                const existingSlot = currentInv[targetIndex];

                let finalCount = chestSlot.count;
                if (existingSlot && existingSlot.type === type) {
                    finalCount += existingSlot.count;
                }

                useGameStore.getState().updateInventorySlot(targetIndex, { type, count: finalCount });

                // 2. Remove from Chest
                if (building.removeSlot) {
                    building.removeSlot(sourceIndex);
                } else {
                    building.slots.splice(sourceIndex, 1);
                }
                setBuilding(building); // Force re-render
                forceUpdate(n => n + 1);
            }
        };

        window.addEventListener('GAME_INVENTORY_DROP', handleInventoryDrop);
        return () => window.removeEventListener('GAME_INVENTORY_DROP', handleInventoryDrop);
    }, [building]);

    if (!openedEntityKey || !building) return null;

    const config = building.getConfig();
    if (!config) return null;

    const handleClose = () => {
        setOpenedEntityKey(null);
        setActiveTab('overview');
    };

    const isChest = building instanceof Chest;
    const upgrades = config.upgrades || [];

    // Helper to calc total items for upgrade check
    const getInventoryItemCount = (type: string) => {
        return inventory.reduce((total, slot) => slot.type === type ? total + slot.count : total, 0);
    };

    const handleUpgrade = (upgrade: any) => {
        const currentCost = Math.floor(upgrade.baseCost);
        if (getInventoryItemCount('stone') >= currentCost) {
            removeItem('stone', currentCost);
            upgrade.onUpgrade(building);
        }
    };

    const handleDragStart = (e: React.DragEvent, source: 'chest' | 'inventory', index: number, slot: any) => {
        if (!slot || !slot.type) {
            e.preventDefault();
            return;
        }
        e.dataTransfer.setData('source', source);
        e.dataTransfer.setData('index', index.toString());
        e.dataTransfer.setData('type', slot.type);
        e.dataTransfer.setData('count', slot.count.toString());
    };



    const handleDrop = (e: React.DragEvent, target: 'chest' | 'inventory', targetIndex: number) => {
        e.preventDefault();
        const source = e.dataTransfer.getData('source') as 'chest' | 'inventory';
        const sourceIndex = parseInt(e.dataTransfer.getData('index'));

        if (source === target) return;

        if (source === 'chest' && target === 'inventory') {
            // Logic handled by HUD if target is 'inventory'?
            // Wait, if we drop on the InfoPanel's Inventory UI (which we are deleting), this would run.
            // But we are deleting it.
            // So this block is likely dead code if we remove the UI target.
            // BUT: We kept it in case we re-add it? Or we should clean it up?
            // User asked "enlever la partie Player Inventory".
            // So we define drop targets only for Chest.
        } else if (source === 'inventory' && target === 'chest') {
            // Move Inventory (HUD) -> Chest
            const invSlot = inventory[sourceIndex];
            if (!invSlot.type) return;

            const success = building.addItem(invSlot.type, invSlot.count);

            if (success) {
                useGameStore.getState().updateInventorySlot(sourceIndex, { type: null, count: 0 });
                setBuilding(building);
                forceUpdate(n => n + 1);
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div className="fixed right-6 top-24 w-80 bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl text-white overflow-hidden z-40 animate-in slide-in-from-right-10 fade-in duration-200">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/5 rounded-lg overflow-hidden border border-white/10">
                        <ModelPreview type="building" id={building.getType()} width={48} height={48} static />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg leading-none capitalize">{config.displayName}</h3>
                        <p className="text-xs text-gray-400 mt-1">
                            {isChest ? `Lv. ${building.maxSlots - 4}` : 'Building'}
                        </p>
                    </div>
                </div>
                <button onClick={handleClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                    <X size={18} />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 p-3 text-sm font-medium transition-colors relative ${activeTab === 'overview' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Overview
                    {activeTab === 'overview' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500" />}
                </button>
                {upgrades.length > 0 && (
                    <button
                        onClick={() => setActiveTab('upgrade')}
                        className={`flex-1 p-3 text-sm font-medium transition-colors relative ${activeTab === 'upgrade' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Upgrades
                        {activeTab === 'upgrade' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500" />}
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="p-4 min-h-[200px]">
                {activeTab === 'overview' && (
                    <div className="space-y-4">
                        {isChest && (
                            <>
                                {/* Container Storage */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase">Container Storage</h4>
                                        <span className="text-xs font-mono text-gray-500">{building.slots.length}/{building.maxSlots} Slots</span>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2">
                                        {Array.from({ length: building.maxSlots }).map((_, i) => {
                                            const slot = building.slots[i];
                                            return (
                                                <div
                                                    key={`chest-slot-${i}`}
                                                    className="aspect-square bg-black/40 rounded border border-white/10 flex items-center justify-center relative group cursor-grab active:cursor-grabbing"
                                                    draggable={!!slot}
                                                    onDragStart={(e) => handleDragStart(e, 'chest', i, slot)}
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, 'chest', i)}
                                                >
                                                    {slot ? (
                                                        <>
                                                            <ModelPreview type="item" id={slot.type} width={40} height={40} static seed={i * 100} />
                                                            <span className="absolute bottom-0.5 right-1 text-[10px] font-mono font-bold bg-black/60 px-0.5 rounded shadow-sm">{slot.count}</span>
                                                        </>
                                                    ) : (
                                                        <div className="text-white/5">+</div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                        {!isChest && building instanceof Extractor && (
                            <div className="space-y-6 py-2">
                                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                                    <div className="flex items-center gap-3 mb-4">
                                        {(() => {
                                            let status = 'IDLE';
                                            let color = 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]'; // Orange/Yellow

                                            // 1. Not Linked
                                            if (!building.hasPowerSource) {
                                                status = 'NO POWER SOURCE';
                                                color = 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
                                            }
                                            // 2. Active
                                            else if (building.active) {
                                                status = 'OPERATIONAL';
                                                color = 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]';
                                            }
                                            // 3. Linked but Warn OR Idle
                                            else {
                                                // Could distinguish Low Power vs Idle text if desired, but User grouped them as Orange.
                                                status = building.powerStatus === 'warn' ? 'LOW POWER' : 'IDLE';
                                                color = 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]';
                                            }

                                            return (
                                                <>
                                                    <div className={`w-3 h-3 rounded-full animate-pulse ${color}`} />
                                                    <span className="text-sm font-bold tracking-tight text-white/90">
                                                        {status}
                                                    </span>
                                                </>
                                            );
                                        })()}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                <Zap size={10} className="text-yellow-500" /> Rate
                                            </div>
                                            <div className="text-lg font-mono font-bold text-white">
                                                {(building.speedMultiplier * 60).toFixed(0)} <span className="text-[10px] text-gray-500">/min</span>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                <Box size={10} className="text-blue-500" /> Output
                                            </div>
                                            <div className="text-lg font-mono font-bold text-white capitalize">Stone</div>
                                        </div>
                                        <div className="col-span-2 p-3 bg-black/20 rounded-lg border border-white/5 flex justify-between items-center">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                <Zap size={10} className="text-red-500" /> Energy Consumption
                                            </div>
                                            <div className="text-lg font-mono font-bold text-red-400">
                                                {parseFloat(String(building.powerConfig?.rate || 0)).toFixed(2)} <span className="text-[10px] text-gray-500">kW</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] px-1">Performance Details</div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs p-2 rounded hover:bg-white/5 transition-colors">
                                            <span className="text-gray-400">Baseline Rate</span>
                                            <span className="text-white font-mono">60/min</span>
                                        </div>
                                        <div className="flex justify-between text-xs p-2 rounded hover:bg-white/5 transition-colors">
                                            <span className="text-gray-400">Efficiency</span>
                                            <span className="text-green-400 font-mono">100%</span>
                                        </div>
                                        <div className="flex justify-between text-xs p-2 rounded hover:bg-white/5 transition-colors">
                                            <span className="text-gray-400">Overclock Multiplier</span>
                                            <span className="text-indigo-400 font-mono">x{building.speedMultiplier.toFixed(1)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isChest && building.getType() === 'hub' && (
                            <div className="space-y-6 py-2">
                                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse" />
                                        <span className="text-sm font-bold tracking-tight text-white/90">
                                            MAIN GENERATOR
                                        </span>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                <Zap size={10} className="text-green-500" /> Production
                                            </div>
                                            <div className="text-lg font-mono font-bold text-green-400">
                                                {(building.statsHistory && building.statsHistory.length > 0)
                                                    ? building.statsHistory[building.statsHistory.length - 1].production.toFixed(2)
                                                    : (building.powerConfig.rate).toFixed(2)}
                                                <span className="text-[10px] text-gray-500 ml-1">kW</span>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                <Zap size={10} className="text-red-500" /> Consumption
                                            </div>
                                            <div className="text-lg font-mono font-bold text-red-400">
                                                {(building.statsHistory && building.statsHistory.length > 0)
                                                    ? building.statsHistory[building.statsHistory.length - 1].consumption.toFixed(2)
                                                    : (0).toFixed(2)}
                                                <span className="text-[10px] text-gray-500 ml-1">kW</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Graph */}
                                    <div className="h-32 bg-black/40 rounded border border-white/10 relative overflow-hidden">
                                        {/* Grid lines */}
                                        <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none p-2">
                                            <div className="w-full h-px bg-white"></div>
                                            <div className="w-full h-px bg-white"></div>
                                            <div className="w-full h-px bg-white"></div>
                                        </div>

                                        {(() => {
                                            const history = building.statsHistory || [];
                                            if (history.length < 2) return <div className="text-xs text-gray-600 flex items-center justify-center h-full">Gathering Data...</div>;

                                            const maxVal = Math.max(
                                                10, // Minimum scale
                                                ...history.map((h: any) => Math.max(h.production, h.consumption))
                                            ) * 1.1;

                                            const width = 100; // Use percentage for width coords to simplify
                                            const height = 100;

                                            // Create points
                                            const createPoints = (key: 'production' | 'consumption') => {
                                                return history.map((pt: any, i: number) => {
                                                    const x = (i / (history.length - 1)) * width;
                                                    const y = height - (pt[key] / maxVal) * height;
                                                    return `${x},${y}`;
                                                }).join(' ');
                                            };

                                            return (
                                                <>
                                                    <svg className="w-full h-full p-2" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                        {/* Consumption Line (Red) */}
                                                        <polyline
                                                            points={createPoints('consumption')}
                                                            fill="none"
                                                            stroke="rgba(239, 68, 68, 0.8)"
                                                            strokeWidth="2"
                                                            vectorEffect="non-scaling-stroke"
                                                        />
                                                        {/* Production Line (Green) */}
                                                        <polyline
                                                            points={createPoints('production')}
                                                            fill="none"
                                                            stroke="rgba(74, 222, 128, 0.8)"
                                                            strokeWidth="2"
                                                            vectorEffect="non-scaling-stroke"
                                                        />
                                                    </svg>
                                                    {/* Y-Axis Labels */}
                                                    <div className="absolute top-1 left-1 text-[9px] font-mono text-gray-500 bg-black/50 px-1 rounded">
                                                        {maxVal.toFixed(2)} kW
                                                    </div>
                                                    <div className="absolute top-1/2 left-1 text-[9px] font-mono text-gray-500 bg-black/50 px-1 rounded -translate-y-1/2">
                                                        {(maxVal / 2).toFixed(2)} kW
                                                    </div>
                                                    <div className="absolute bottom-1 left-1 text-[9px] font-mono text-gray-500 bg-black/50 px-1 rounded">
                                                        0.00 kW
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <div className="flex justify-between px-1 mt-1">
                                        <span className="text-[9px] text-gray-600 font-mono">60s ago</span>
                                        <span className="text-[9px] text-gray-600 font-mono">Now</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isChest && !(building instanceof Extractor) && building.getType() !== 'hub' && (
                            <div className="flex items-center justify-center h-full text-gray-500 text-sm italic py-8 text-center uppercase tracking-widest opacity-50">
                                No statistics available
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'upgrade' && (
                    <div className="space-y-4">
                        {upgrades.map((upgrade: any) => {
                            const currentCost = upgrade.baseCost;
                            const currentStone = getInventoryItemCount('stone');
                            const canAfford = currentStone >= currentCost;

                            return (
                                <div key={upgrade.id} className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-indigo-300">{upgrade.name}</h4>
                                        <span className="text-xs font-mono text-indigo-400 opacity-80">{upgrade.getValue(building)}</span>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-4">{upgrade.description}</p>

                                    <button
                                        onClick={() => handleUpgrade(upgrade)}
                                        disabled={!canAfford}
                                        className={`
                                            w-full py-2 px-4 rounded-lg font-bold flex items-center justify-center gap-2
                                            transition-all
                                            ${canAfford
                                                ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
                                        `}
                                    >
                                        <ArrowUpCircle size={16} />
                                        Upgrade ({currentCost} Stone)
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
