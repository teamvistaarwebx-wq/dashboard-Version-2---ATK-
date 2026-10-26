"use client";

import { Select } from "./select";

/**
 * Label + themed dropdown, matching TextField's shape so the two line up in a
 * grid and report failures the same way.
 *
 * Options are an `options` array — flat { value, label } entries, or groups
 * of { label, options } where <optgroup> used to be. They used to be
 * <option> children of a native <select>, whose open list the OS draws and
 * no theme can reach; see components/ui/select.jsx.
 *
 * `onValueChange(value)` hands back the value itself, not an event.
 */
export function SelectField({
  id,
  name,
  label,
  hint,
  error,
  required,
  className = "",
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  disabled,
}) {
  const messageId = error ? `${id}-error` : undefined;
  const labelId = `${id}-label`;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        id={labelId}
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

      <Select
        id={id}
        name={name}
        options={options}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        placeholder={placeholder}
        disabled={disabled}
        invalid={Boolean(error)}
        aria-describedby={messageId}
        aria-labelledby={labelId}
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
