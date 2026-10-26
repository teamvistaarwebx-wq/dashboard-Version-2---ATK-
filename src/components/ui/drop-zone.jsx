"use client";

import { useId, useRef, useState } from "react";
import { Upload } from "lucide-react";

/**
 * Drag-and-drop target backed by a real file input, so it works from the
 * keyboard (the button opens the picker) and with assistive tech as well as
 * with a mouse drag.
 */
export function DropZone({ label, hint, accept, multiple = false, onFiles, compact = false, children }) {
  const inputRef = useRef(null);
  const inputId = useId();
  const [over, setOver] = useState(false);

  function take(list) {
    const files = [...(list ?? [])];
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        take(event.dataTransfer.files);
      }}
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-center transition-colors ${
        compact ? "px-4 py-5" : "px-4 py-8"
      } ${over ? "border-brand bg-brand-tint/50" : "border-border-strong bg-surface-muted"}`}
    >
      {children ?? (
        <>
          <Upload className="size-5 text-muted" aria-hidden="true" />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-13 font-medium shadow-card hover:bg-surface-muted"
          >
            {label}
          </button>
          {hint ? <p className="text-xs text-muted">{hint}</p> : null}
        </>
      )}
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          take(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
