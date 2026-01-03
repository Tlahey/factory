'use client';

import { useGameStore } from '@/game/state/store';
import { RotateCcw, RotateCw, ChevronUp, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export default function CameraControls() {
    const cameraAzimuth = useGameStore((state) => state.cameraAzimuth);
    const cameraElevation = useGameStore((state) => state.cameraElevation);
    const setCameraAngles = useGameStore((state) => state.setCameraAngles);

    // Convert Radians to Degrees for UI (0 to 90)
    const currentDegrees = Math.round((cameraElevation * 180) / Math.PI);

    const handleElevationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const degrees = parseFloat(e.target.value);
        const radians = (degrees * Math.PI) / 180;
        setCameraAngles(cameraAzimuth, radians);
    };

    const handleRotateLeft = () => setCameraAngles(cameraAzimuth - Math.PI / 4, cameraElevation);
    const handleRotateRight = () => setCameraAngles(cameraAzimuth + Math.PI / 4, cameraElevation);

    return (
        <div className="bg-black/60 p-3 rounded-2xl flex flex-col items-center gap-4 border border-white/10 backdrop-blur-md shadow-lg pointer-events-auto">
            {/* Rotation Controls */}
            <div className="flex gap-2">
                <button
                    onClick={handleRotateLeft}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/20 text-white transition-all active:scale-95"
                    title="Rotate Left"
                >
                    <RotateCw size={18} />
                </button>
                <button
                    onClick={handleRotateRight}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/20 text-white transition-all active:scale-95"
                    title="Rotate Right"
                >
                    <RotateCcw size={18} />
                </button>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-white/10" />

            {/* Elevation Slider (Vertical) */}
            <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Tilt</span>
                <div className="h-12 py-2 relative flex items-center justify-center">
                    {/* Background Track */}
                    <div className="absolute w-1 h-full bg-white/10 rounded-full" />

                    <input
                        type="range"
                        min="10"
                        max="90"
                        value={currentDegrees}
                        onChange={handleElevationChange}
                        className="
                            appearance-none w-12 h-4 bg-transparent outline-none cursor-pointer 
                            transform -rotate-90 origin-center z-10 opacity-0 absolute
                        "
                        title="Adjust Camera Angle"
                    />

                    {/* Custom Thumb / Indicator */}
                    <div
                        className="absolute w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] pointer-events-none transition-all duration-75"
                        style={{
                            bottom: `${((currentDegrees - 10) / (90 - 10)) * 100}%`
                        }}
                    />
                </div>
                <span className="text-[10px] text-blue-400 font-mono">{currentDegrees}°</span>
            </div>
        </div>
    );
}
