import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <h1 className="font-newsreader text-3xl font-semibold text-brand">
        Not allowed
      </h1>
      <p className="max-w-sm text-sm text-muted">
        Your account does not have permission to do that.
      </p>
      <Link href="/" className="text-sm font-semibold text-brand">
        Back to dashboard
      </Link>
    </div>
  );
}
