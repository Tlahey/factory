export default function ToolsPage() {
    return (
        <div className="min-h-screen bg-black text-white p-8 font-sans">
            <h1 className="text-3xl font-bold mb-8">Factory Tools</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <a
                    href="/tools/skill-tree-editor"
                    className="block p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-indigo-500 hover:bg-gray-800 transition-all group"
                >
                    <h2 className="text-xl font-bold mb-2 group-hover:text-indigo-400">Skill Tree Editor</h2>
                    <p className="text-gray-400">Visually edit the skill tree layout and copy the config JSON.</p>
                </a>
            </div>
        </div>
    );
}
