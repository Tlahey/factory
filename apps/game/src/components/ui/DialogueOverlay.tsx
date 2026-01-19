"use client";

import { useGameStore } from "@/game/state/store";
import { DIALOGUES } from "@/game/data/Dialogues";
import { useLocalization } from "@/hooks/useLocalization";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Image from "next/image";

export default function DialogueOverlay() {
  const activeDialogueId = useGameStore((state) => state.activeDialogueId);
  const hideDialogue = useGameStore((state) => state.hideDialogue);
  const { t } = useLocalization();
  const [isTyping, setIsTyping] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const textRef = useRef<HTMLParagraphElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const config = useMemo(
    () => (activeDialogueId ? DIALOGUES[activeDialogueId] : null),
    [activeDialogueId],
  );

  // Config Change Reset
  useEffect(() => {
    setPageIndex(0);
  }, [activeDialogueId]);

  const textKeys = useMemo(() => {
    if (!config) return [];
    return Array.isArray(config.textKey) ? config.textKey : [config.textKey];
  }, [config]);

  const currentTextKey = textKeys[pageIndex];
  const fullText = currentTextKey ? t(currentTextKey) : "";

  useEffect(() => {
    // Sync Focus Element
    let focusId: string | null = null;

    if (config?.focusElement) {
      if (Array.isArray(config.focusElement)) {
        focusId = config.focusElement[pageIndex] || null;
      } else {
        focusId = config.focusElement;
      }
    }

    useGameStore.getState().setFocusedElement(focusId);

    return () => {
      useGameStore.getState().setFocusedElement(null);
    };
  }, [config, pageIndex]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (activeDialogueId && fullText) {
      // Reset text immediately
      if (textRef.current) textRef.current.innerText = "";
      setIsTyping(true);

      let charIndex = 0;
      intervalRef.current = setInterval(() => {
        charIndex++;
        if (textRef.current) {
          textRef.current.innerText = fullText.slice(0, charIndex);
        }
        if (charIndex >= fullText.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsTyping(false);
        }
      }, 20);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeDialogueId, fullText, pageIndex]); // Added pageIndex dependency

  const handleSkipOrClose = useCallback(
    (force = false) => {
      if (isTyping && !force) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (textRef.current) textRef.current.innerText = fullText;
        setIsTyping(false);
      } else {
        // If typing done, check for next page or close
        if (pageIndex < textKeys.length - 1) {
          setPageIndex((prev) => prev + 1);
        } else {
          hideDialogue();
        }
      }
    },
    [isTyping, fullText, pageIndex, textKeys.length, hideDialogue],
  );

  // Global Click Listener for Spotlight
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onClick = (e: MouseEvent) => {
      const focusedId = useGameStore.getState().focusedElement;
      if (!focusedId) return;

      const target = e.target as HTMLElement;
      if (target.closest(`#${focusedId}`)) {
        handleSkipOrClose(true); // Force advance on interaction
      }
    };

    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [handleSkipOrClose]);

  if (!config) return null;

  const isLastPage = pageIndex >= textKeys.length - 1;

  const isBlocking = config.blocking !== false;

  return (
    <>
      {/* Blocker Layer (Transparent) - Blocks all game interactions if blocking is true */}
      {isBlocking && (
        <div className="fixed inset-0 z-dialog-blocker cursor-default bg-transparent"></div>
      )}

      <div className="fixed bottom-6 left-6 w-[500px] z-dialog pointer-events-auto">
        <div
          className={`
            bg-slate-900/95 border border-amber-400/50 rounded-xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] 
            flex gap-6 items-start backdrop-blur-md relative overflow-hidden
            animate-in fade-in slide-in-from-left-10 duration-300
        `}
        >
          {/* Background Tech Details */}
          <div className="absolute top-0 right-0 p-2 opacity-20 pointer-events-none">
            <div className="w-16 h-16 border-t-2 border-r-2 border-amber-400 rounded-tr-xl"></div>
          </div>
          <div className="absolute bottom-0 left-0 p-2 opacity-20 pointer-events-none">
            <div className="w-16 h-16 border-b-2 border-l-2 border-amber-400 rounded-bl-xl"></div>
          </div>

          {/* Avatar */}
          <div className="w-24 h-24 shrink-0 rounded-xl border-2 border-amber-400/30 overflow-hidden bg-black/50 shadow-[0_0_15px_rgba(251,191,36,0.2)] relative group">
            <div className="absolute inset-0 bg-amber-400/10 animate-pulse z-sub-content hidden group-hover:block"></div>
            {/* Using standard img tag for external or public assets not optimized by Next Image loader if needed, but Image is better */}
            <Image
              src={config.image || "/assets/robot_avatar.png"}
              alt="Assistant"
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-amber-400 font-bold text-lg tracking-widest uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                {t(config.titleKey)}
              </h3>
              {/* Pagination Bubbles */}
              {textKeys.length > 1 && (
                <div className="flex gap-1">
                  {textKeys.map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${i === pageIndex ? "bg-amber-400" : "bg-white/20"}`}
                    ></div>
                  ))}
                </div>
              )}
            </div>

            <p
              ref={textRef}
              className="text-white/90 leading-relaxed font-mono text-sm md:text-base shadow-black drop-shadow-md min-h-[4.5rem]"
            >
              {/* Text injected via Ref */}
            </p>
            {isTyping && (
              <span className="animate-pulse text-amber-400">_</span>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => handleSkipOrClose(false)}
                className="px-6 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold tracking-wider uppercase transition-all rounded clip-path-slant hover:shadow-[0_0_15px_rgba(251,191,36,0.6)] active:scale-95 text-xs"
                style={{
                  clipPath:
                    "polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)",
                }}
              >
                {isTyping
                  ? t("common.skip")
                  : isLastPage
                    ? t("common.acknowledge")
                    : t("common.next")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
