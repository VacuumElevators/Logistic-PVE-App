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
      <StatStripSkeleton count={7} />
      <FilterBarSkeleton />
      <TableSkeleton rows={8} columns={7} />
    </>
  );
}
