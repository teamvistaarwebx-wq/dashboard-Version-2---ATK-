/** Label + textarea. TextField's twin, for the fields that need room. */
const BASE =
  "w-full resize-y rounded-lg border bg-surface px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-subtle focus-visible:outline-none focus:ring-2 disabled:bg-surface-muted";
const NEUTRAL = "border-border-strong focus:border-brand focus:ring-brand/15";
const INVALID = "border-critical focus:border-critical focus:ring-critical/15";

export function TextareaField({
  id,
  label,
  hint,
  error,
  required,
  rows = 4,
  className = "",
  ...props
}) {
  const messageId = error ? `${id}-error` : undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={id}
        className="text-13 font-medium text-foreground"
      >
        {label}
        {required ? (
          <span className="text-danger" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </label>

      <textarea
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        className={`${BASE} ${error ? INVALID : NEUTRAL}`}
        {...props}
      />

      {error ? (
        <p id={messageId} role="alert" className="text-13 text-critical">
          {error}
        </p>
      ) : hint ? (
        <p className="text-13 text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
