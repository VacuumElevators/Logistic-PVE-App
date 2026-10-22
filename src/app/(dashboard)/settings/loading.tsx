import {
  PageHeaderSkeleton,
  CardSkeleton,
} from "@/components/ui/skeleton-blocks";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton withActions={false} />
      <CardSkeleton lines={4} />
      <CardSkeleton lines={3} />
    </>
  );
}
