import {
  PageHeaderSkeleton,
  StatStripSkeleton,
  FilterBarSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton-blocks";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <StatStripSkeleton count={8} />
      <FilterBarSkeleton />
      <TableSkeleton rows={8} columns={6} />
    </>
  );
}
