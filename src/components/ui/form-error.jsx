/**
 * `role="alert"` so a screen reader announces the failure without the user
 * having to go hunting for what changed after submitting.
 */
export function FormError({ message }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-lg bg-danger/8 px-3 py-2.5 text-sm text-danger"
    >
      {message}
    </p>
  );
}
