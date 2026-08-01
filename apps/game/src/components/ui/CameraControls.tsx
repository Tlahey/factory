"use client";

import { useState } from "react";
import { useGameStore } from "@/game/state/store";
import { useTranslation } from "@/hooks/useTranslation";
import {
  CAMERA_LIMITS,
  DEFAULT_CAMERA_AZIMUTH,
  DEFAULT_CAMERA_DISTANCE,
  DEFAULT_CAMERA_POLAR,
} from "@/game/camera/CameraConfig";
import type { NavigationScheme } from "@/game/camera/CameraGestures";
import {
  Crosshair,
  HelpCircle,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import CameraHelp from "./CameraHelp";

const ZOOM_STEP = 1.25;

export default function CameraControls() {
  const { t } = useTranslation();
  const cameraAzimuth = useGameStore((state) => state.cameraAzimuth);
  const cameraElevation = useGameStore((state) => state.cameraElevation);
  const cameraDistance = useGameStore((state) => state.cameraDistance);
  const cameraScheme = useGameStore((state) => state.cameraScheme);
  const setCameraAngles = useGameStore((state) => state.setCameraAngles);
  const setCameraDistance = useGameStore((state) => state.setCameraDistance);
  const setCameraScheme = useGameStore((state) => state.setCameraScheme);

  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Convert radians to degrees for the UI (10 to 90).
  const minTilt = Math.round((CAMERA_LIMITS.minPolar * 180) / Math.PI);
  const maxTilt = Math.round((CAMERA_LIMITS.maxPolar * 180) / Math.PI);
  const currentDegrees = Math.round((cameraElevation * 180) / Math.PI);

  const handleElevationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const degrees = parseFloat(e.target.value);
    setCameraAngles(cameraAzimuth, (degrees * Math.PI) / 180);
  };

  const handleRotateLeft = () =>
    setCameraAngles(cameraAzimuth - Math.PI / 4, cameraElevation);
  const handleRotateRight = () =>
    setCameraAngles(cameraAzimuth + Math.PI / 4, cameraElevation);

  const clampDistance = (distance: number) =>
    Math.min(
      CAMERA_LIMITS.maxDistance,
      Math.max(CAMERA_LIMITS.minDistance, distance),
    );

  const handleZoomIn = () =>
    setCameraDistance(clampDistance(cameraDistance / ZOOM_STEP));
  const handleZoomOut = () =>
    setCameraDistance(clampDistance(cameraDistance * ZOOM_STEP));

  const handleReset = () => {
    setCameraAngles(DEFAULT_CAMERA_AZIMUTH, DEFAULT_CAMERA_POLAR);
    setCameraDistance(DEFAULT_CAMERA_DISTANCE);
  };

  const buttonClass =
    "p-2 rounded-lg bg-white/5 hover:bg-white/20 text-white transition-all active:scale-95";

  return (
    <div className="relative flex items-end gap-3">
      {isHelpOpen && (
        <CameraHelp
          scheme={cameraScheme}
          onSchemeChange={(scheme: NavigationScheme) => setCameraScheme(scheme)}
          onClose={() => setIsHelpOpen(false)}
        />
      )}

      <div className="bg-black/60 p-3 rounded-2xl flex flex-col items-center gap-3 border border-white/10 backdrop-blur-md shadow-lg pointer-events-auto">
        {/* Rotation Controls */}
        <div className="flex gap-2">
          <button
            onClick={handleRotateLeft}
            className={buttonClass}
            title={t("camera.rotate_left")}
            aria-label={t("camera.rotate_left")}
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={handleRotateRight}
            className={buttonClass}
            title={t("camera.rotate_right")}
            aria-label={t("camera.rotate_right")}
          >
            <RotateCw size={18} />
          </button>
        </div>

        <div className="w-full h-px bg-white/10" />

        {/* Zoom Controls */}
        <div className="flex gap-2">
          <button
            onClick={handleZoomIn}
            className={buttonClass}
            title={t("camera.zoom_in")}
            aria-label={t("camera.zoom_in")}
          >
            <Plus size={18} />
          </button>
          <button
            onClick={handleZoomOut}
            className={buttonClass}
            title={t("camera.zoom_out")}
            aria-label={t("camera.zoom_out")}
          >
            <Minus size={18} />
          </button>
        </div>

        <div className="w-full h-px bg-white/10" />

        {/* Elevation Slider (Vertical) */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
            {t("camera.tilt")}
          </span>
          <div className="h-12 py-2 relative flex items-center justify-center">
            {/* Background Track */}
            <div className="absolute w-1 h-full bg-white/10 rounded-full" />

            <input
              type="range"
              min={minTilt}
              max={maxTilt}
              value={currentDegrees}
              onChange={handleElevationChange}
              className="
                            appearance-none w-12 h-4 bg-transparent outline-none cursor-pointer
                            transform -rotate-90 origin-center z-sub-content opacity-0 absolute
                        "
              title={t("camera.tilt")}
              aria-label={t("camera.tilt")}
            />

            {/* Custom Thumb / Indicator */}
            <div
              className="absolute w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] pointer-events-none transition-all duration-75"
              style={{
                bottom: `${((currentDegrees - minTilt) / (maxTilt - minTilt)) * 100}%`,
              }}
            />
          </div>
          <span className="text-[10px] text-blue-400 font-mono">
            {currentDegrees}°
          </span>
        </div>

        <div className="w-full h-px bg-white/10" />

        {/* Reset & Help */}
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className={buttonClass}
            title={t("camera.reset_view")}
            aria-label={t("camera.reset_view")}
          >
            <Crosshair size={18} />
          </button>
          <button
            onClick={() => setIsHelpOpen((open) => !open)}
            className={`${buttonClass} ${isHelpOpen ? "bg-white/20" : ""}`}
            title={t("camera.help.title")}
            aria-label={t("camera.help.title")}
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
