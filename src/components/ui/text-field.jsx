/**
 * Label + input, wired together by id so clicking the label focuses the
 * field. Everything else is forwarded, which keeps `type`, `required`,
 * `autoComplete` and friends at the call site where they read as HTML.
 *
 * `error` turns the border red and replaces the hint with the message, so a
 * failure is answered where it happened. `prefix` / `suffix` sit inside the
 * box ("₹", "days"); `counter` shows "42 / 70" under it.
 */
export const INPUT_BASE =
  "h-9 w-full min-w-0 rounded-lg border bg-surface px-3 text-sm text-foreground outline-none transition placeholder:text-subtle focus-visible:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted";
export const INPUT_NEUTRAL = "border-border-strong focus:border-brand focus:ring-brand/15";
export const INPUT_INVALID = "border-critical focus:border-critical focus:ring-critical/15";

export function FieldLabel({ htmlFor, required, children, className = "" }) {
  return (
    <label htmlFor={htmlFor} className={`text-13 font-medium text-foreground ${className}`}>
      {children}
      {required ? (
        <span className="text-critical" aria-hidden="true">
          {" "}
          *
        </span>
      ) : null}
    </label>
  );
}

export function FieldMessage({ id, error, hint, counter }) {
  if (!error && !hint && !counter) return null;

  return (
    <div className="flex items-start justify-between gap-3">
      {error ? (
        <p id={id} role="alert" className="text-13 text-critical">
          {error}
        </p>
      ) : hint ? (
        <p id={id} className="text-13 text-muted">
          {hint}
        </p>
      ) : (
        <span />
      )}
      {counter ? <p className="shrink-0 font-mono text-xs text-muted">{counter}</p> : null}
    </div>
  );
}

export function TextField({
  id,
  label,
  hint,
  error,
  required,
  prefix,
  suffix,
  counter,
  labelHidden = false,
  className = "",
  inputClassName = "",
  ...props
}) {
  const messageId = error || hint ? `${id}-message` : undefined;

  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <FieldLabel htmlFor={id} required={required} className={labelHidden ? "sr-only" : ""}>
        {label}
      </FieldLabel>

      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          className={`${INPUT_BASE} ${error ? INPUT_INVALID : INPUT_NEUTRAL} ${prefix ? "pl-7" : ""} ${
            suffix ? "pr-14" : ""
          } ${inputClassName}`}
          {...props}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">
            {suffix}
          </span>
        ) : null}
      </div>

      <FieldMessage id={messageId} error={error} hint={hint} counter={counter} />
    </div>
  );
}
