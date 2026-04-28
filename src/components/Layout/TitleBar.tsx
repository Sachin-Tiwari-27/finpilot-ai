import { useState, useEffect } from "react";

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const checkMax = async () => {
      const m = await window.api?.window?.isMaximized?.();
      setMaximized(!!m);
    };
    checkMax();
  }, []);

  return (
    <div className="titlebar-drag flex items-center justify-between h-9 bg-fp-bg border-b border-fp-border/30 px-4 flex-shrink-0 z-50">
      {/* Left: App name */}
      <div className="flex items-center gap-2 titlebar-no-drag">
        <div className="w-5 h-5 rounded bg-fp-primary/20 flex items-center justify-center text-xs">
          📊
        </div>
        <span className="text-xs font-semibold text-fp-text-2 tracking-wide">
          FinPilot AI
        </span>
      </div>

      {/* Center drag zone */}
      <div className="flex-1" />

      {/* Right: Window controls */}
      <div className="flex items-center titlebar-no-drag">
        <button
          onClick={() => window.api?.window?.minimize?.()}
          className="w-8 h-8 flex items-center justify-center hover:bg-fp-muted rounded transition-colors text-fp-text-3 hover:text-fp-text"
          title="Minimize"
        >
          <svg width="10" height="2" viewBox="0 0 10 2" fill="currentColor">
            <rect width="10" height="2" rx="1" />
          </svg>
        </button>
        <button
          onClick={async () => {
            await window.api?.window?.maximize?.();
            const m = await window.api?.window?.isMaximized?.();
            setMaximized(!!m);
          }}
          className="w-8 h-8 flex items-center justify-center hover:bg-fp-muted rounded transition-colors text-fp-text-3 hover:text-fp-text"
          title={maximized ? "Restore" : "Maximize"}
        >
          {maximized ? (
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="2" y="0" width="8" height="8" rx="1" />
              <rect x="0" y="2" width="8" height="8" rx="1" />
            </svg>
          ) : (
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="1" y="1" width="8" height="8" rx="1" />
            </svg>
          )}
        </button>
        <button
          onClick={() => window.api?.window?.close?.()}
          className="w-8 h-8 flex items-center justify-center hover:bg-red-500/20 rounded transition-colors text-fp-text-3 hover:text-red-400"
          title="Close"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <line x1="1" y1="1" x2="9" y2="9" />
            <line x1="9" y1="1" x2="1" y2="9" />
          </svg>
        </button>
      </div>
    </div>
  );
}
