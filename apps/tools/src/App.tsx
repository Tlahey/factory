import { useEffect, useState } from "react";
import { SKILL_TREE, SkillNode } from "@/game/buildings/hub/skill-tree/SkillTreeConfig";
import { ChevronLeft, Copy } from "lucide-react";

// Use same grid constants
const GRID_CELL_SIZE = 140;
const GRID_PADDING = 60;

export default function App() {
    const [nodes, setNodes] = useState<SkillNode[]>([]);
    const [draggingNode, setDraggingNode] = useState<string | null>(null);

    useEffect(() => {
        // Deep copy initial config
        setNodes(JSON.parse(JSON.stringify(SKILL_TREE)));
    }, []);

    const moveNode = (nodeId: string, dx: number, dy: number) => {
        setNodes(prev => prev.map(n => {
            if (n.id !== nodeId) return n;
            return {
                ...n,
                position: {
                    x: Math.max(0, n.position.x + dx),
                    y: Math.max(0, n.position.y + dy)
                }
            };
        }));
    };

    const handleExport = () => {
        const json = JSON.stringify(nodes, null, 2);
        const exportString = `export const SKILL_TREE: SkillNode[] = ${json};`;
        navigator.clipboard.writeText(exportString);
        alert("Copied config to clipboard!");
        console.log(exportString);
    };

    // Canvas calculations
    const maxX = Math.max(...nodes.map((n) => n.position.x), 5) + 2;
    const maxY = Math.max(...nodes.map((n) => n.position.y), 5) + 2;
    const canvasWidth = maxX * GRID_CELL_SIZE + GRID_PADDING * 2;
    const canvasHeight = maxY * GRID_CELL_SIZE + GRID_PADDING * 2;

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans">
            {/* Header */}
            <div className="h-16 border-b border-gray-800 bg-gray-900 px-6 flex items-center justify-between z-10 relative shadow-md">
                <div className="flex items-center gap-4">
                    <h1 className="font-bold text-lg">Factory Skill Tree Editor</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Copy size={16} />
                        Copy Config
                    </button>
                </div>
            </div>

            {/* Editor Canvas */}
            <div className="flex-1 overflow-auto bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:20px_20px] relative p-8">
                <div
                    className="relative bg-gray-900/50 border border-gray-800 rounded-xl shadow-2xl"
                    style={{ width: canvasWidth, height: canvasHeight }}
                >
                    {/* Grid Helper Lines */}
                    {Array.from({ length: maxX }).map((_, i) => (
                        <div key={`v-${i}`} className="absolute top-0 bottom-0 w-px bg-gray-800/30 pointer-events-none" style={{ left: i * GRID_CELL_SIZE + GRID_PADDING }} />
                    ))}
                    {Array.from({ length: maxY }).map((_, i) => (
                        <div key={`h-${i}`} className="absolute left-0 right-0 h-px bg-gray-800/30 pointer-events-none" style={{ top: i * GRID_CELL_SIZE + GRID_PADDING }} />
                    ))}

                    {/* Nodes */}
                    {nodes.map(node => (
                        <div
                            key={node.id}
                            className={`absolute w-32 h-32 flex flex-col items-center justify-center p-2 rounded-xl border-2 cursor-move transition-shadow z-10 box-border
                        ${node.type === 'tech' ? 'rounded-full border-green-500/50 bg-green-500/10' : 'bg-gray-800 border-gray-600'}
                        hover:ring-2 hover:ring-indigo-500 hover:shadow-xl
                    `}
                            style={{
                                left: node.position.x * GRID_CELL_SIZE + GRID_PADDING - 6, // Centering tweaked
                                top: node.position.y * GRID_CELL_SIZE + GRID_PADDING - 6,
                            }}
                        >
                            <div className="flex gap-1 mb-2 absolute -top-8 bg-gray-900 p-1 rounded-lg border border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                {/* Controls */}
                                <button onClick={() => moveNode(node.id, 0, -1)} className="p-1 hover:bg-gray-700 rounded">⬆️</button>
                                <button onClick={() => moveNode(node.id, 0, 1)} className="p-1 hover:bg-gray-700 rounded">⬇️</button>
                                <button onClick={() => moveNode(node.id, -1, 0)} className="p-1 hover:bg-gray-700 rounded">⬅️</button>
                                <button onClick={() => moveNode(node.id, 1, 0)} className="p-1 hover:bg-gray-700 rounded">➡️</button>
                            </div>

                            <span className="text-xs font-bold text-center px-1 break-words w-full overflow-hidden text-ellipsis">{node.id}</span>
                            <span className="text-[10px] text-gray-500 uppercase mt-1">{node.type}</span>
                            {node.level > 0 && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1 rounded mt-1">Lv.{node.level}</span>}
                        </div>
                    ))}

                    {/* Connections */}
                    <svg className="absolute inset-0 pointer-events-none" width={canvasWidth} height={canvasHeight}>
                        {nodes.map(node => node.requires.map(reqId => {
                            const req = nodes.find(n => n.id === reqId);
                            if (!req) return null;

                            const x1 = req.position.x * GRID_CELL_SIZE + GRID_PADDING + 64; // + half size approx
                            const y1 = req.position.y * GRID_CELL_SIZE + GRID_PADDING + 64;
                            const x2 = node.position.x * GRID_CELL_SIZE + GRID_PADDING + 64;
                            const y2 = node.position.y * GRID_CELL_SIZE + GRID_PADDING + 64;

                            return (
                                <line
                                    key={`${req.id}-${node.id}`}
                                    x1={x1} y1={y1} x2={x2} y2={y2}
                                    stroke="#4b5563" strokeWidth="2" strokeDasharray="5,5"
                                />
                            );
                        }))}
                    </svg>
                </div>
            </div>
        </div>
    );
}
