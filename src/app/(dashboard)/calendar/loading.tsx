import {
  PageHeaderSkeleton,
  CalendarGridSkeleton,
} from "@/components/ui/skeleton-blocks";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <CalendarGridSkeleton />
    </>
  );
}
