import { Skeleton } from "@/components/ui/skeleton";
import {
  PageHeaderSkeleton,
  CardSkeleton,
} from "@/components/ui/skeleton-blocks";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-4 w-32" />
      <PageHeaderSkeleton withActions={false} />
      <CardSkeleton lines={4} />
      <CardSkeleton lines={3} />
    </>
  );
}
