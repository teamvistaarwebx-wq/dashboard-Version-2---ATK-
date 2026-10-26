"use client";

import { useEffect, useRef } from "react";

/**
 * Native checkbox, themed with `accent-color` so it stays a real input —
 * keyboard, form posting and screen readers all for free. `indeterminate` is
 * a DOM property, not an attribute, so it is set from an effect.
 */
export function Checkbox({ indeterminate = false, className = "", ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className={`size-4 shrink-0 cursor-pointer rounded accent-brand ${className}`}
      {...props}
    />
  );
}
