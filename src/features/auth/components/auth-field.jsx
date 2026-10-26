/**
 * Fields and button for the sign-in and invite screens: larger than the
 * admin's compact controls, pill-shaped, as drawn in the Figma frame.
 */
export function AuthField({ id, label, hint, className = "", ...props }) {
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-[0.9375rem] font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hintId}
        className="h-12 w-full rounded-full border border-border-strong bg-surface px-5 text-base text-foreground outline-none transition placeholder:text-subtle focus-visible:outline-none focus:border-brand focus:ring-4 focus:ring-brand/12 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
        {...props}
      />
      {hint ? (
        <p id={hintId} className="px-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function AuthButton({ children, ...props }) {
  return (
    <button
      type="submit"
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand text-base font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-70 [&_svg]:size-4"
      {...props}
    >
      {children}
    </button>
  );
}

export function AuthError({ message }) {
  if (!message) return null;

  return (
    <p role="alert" className="rounded-2xl bg-critical-bg px-4 py-3 text-sm text-critical">
      {message}
    </p>
  );
}
