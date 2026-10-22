import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeaderSkeleton,
  CardSkeleton,
} from "@/components/ui/skeleton-blocks";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-4 w-32" />
      <PageHeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <CardSkeleton lines={5} />
          <CardSkeleton lines={3} />
        </div>
        <div className="space-y-4">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={3} />
        </div>
      </div>
    </>
  );
}
