"use client";

import { useTranslation } from "@/hooks/useTranslation";
import type { NavigationScheme } from "@/game/camera/CameraGestures";
import { X } from "lucide-react";

interface CameraHelpProps {
  scheme: NavigationScheme;
  onSchemeChange: (scheme: NavigationScheme) => void;
  onClose: () => void;
}

const SCHEMES: NavigationScheme[] = ["auto", "trackpad", "mouse"];

/** Gesture rows, keyed by the scheme they belong to. */
const TRACKPAD_ROWS = [
  {
    gesture: "camera.help.two_finger_scroll",
    action: "camera.help.action_move",
  },
  { gesture: "camera.help.pinch", action: "camera.help.action_zoom" },
  { gesture: "camera.help.alt_scroll", action: "camera.help.action_zoom" },
  { gesture: "camera.help.shift_scroll", action: "camera.help.action_orbit" },
  { gesture: "camera.help.drag", action: "camera.help.action_move" },
  { gesture: "camera.help.alt_drag", action: "camera.help.action_orbit" },
  {
    gesture: "camera.help.two_finger_click",
    action: "camera.help.action_orbit",
  },
];

const MOUSE_ROWS = [
  { gesture: "camera.help.wheel", action: "camera.help.action_zoom" },
  { gesture: "camera.help.shift_wheel", action: "camera.help.action_orbit" },
  { gesture: "camera.help.drag", action: "camera.help.action_move" },
  { gesture: "camera.help.right_drag", action: "camera.help.action_orbit" },
];

const KEYBOARD_ROWS = [
  { gesture: "camera.help.wasd", action: "camera.help.action_move" },
  { gesture: "camera.help.qe", action: "camera.help.action_rotate" },
  { gesture: "camera.help.shift_arrows", action: "camera.help.action_orbit" },
  { gesture: "camera.help.plus_minus", action: "camera.help.action_zoom" },
  { gesture: "camera.help.space_drag", action: "camera.help.action_move" },
  { gesture: "camera.help.home", action: "camera.help.action_reset" },
];

export default function CameraHelp({
  scheme,
  onSchemeChange,
  onClose,
}: CameraHelpProps) {
  const { t } = useTranslation();
  const rows = scheme === "mouse" ? MOUSE_ROWS : TRACKPAD_ROWS;

  return (
    <div className="w-72 bg-black/80 border border-white/10 rounded-2xl backdrop-blur-md shadow-xl p-4 text-white pointer-events-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{t("camera.help.title")}</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          aria-label={t("camera.help.close")}
        >
          <X size={14} />
        </button>
      </div>

      {/* Scheme selector */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-lg mb-3">
        {SCHEMES.map((option) => (
          <button
            key={option}
            onClick={() => onSchemeChange(option)}
            className={`flex-1 text-[11px] py-1 rounded-md transition-colors ${
              scheme === option
                ? "bg-blue-500/80 text-white"
                : "text-gray-300 hover:bg-white/10"
            }`}
          >
            {t(`camera.scheme.${option}`)}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <HelpRow
            key={row.gesture}
            gesture={t(row.gesture)}
            action={t(row.action)}
          />
        ))}
      </ul>

      <div className="h-px bg-white/10 my-3" />

      <ul className="flex flex-col gap-1.5">
        {KEYBOARD_ROWS.map((row) => (
          <HelpRow
            key={row.gesture}
            gesture={t(row.gesture)}
            action={t(row.action)}
          />
        ))}
      </ul>
    </div>
  );
}

function HelpRow({ gesture, action }: { gesture: string; action: string }) {
  return (
    <li className="flex items-center justify-between gap-3 text-[11px]">
      <span className="font-mono text-gray-200 bg-white/10 px-1.5 py-0.5 rounded">
        {gesture}
      </span>
      <span className="text-gray-400 text-right">{action}</span>
    </li>
  );
}
