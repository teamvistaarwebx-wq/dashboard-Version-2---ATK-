import { Skeleton } from "@/components/ui/skeleton";

/** Matches the centred `<main>` the order detail lays itself out in. */
export default function OrderDetailLoading() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-40" />

      <div className="mt-6 flex flex-col gap-5">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </main>
  );
}
