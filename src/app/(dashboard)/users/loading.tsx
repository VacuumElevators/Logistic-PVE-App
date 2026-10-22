import {
  PageHeaderSkeleton,
  FilterBarSkeleton,
  TableSkeleton,
} from "@/components/ui/skeleton-blocks";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <FilterBarSkeleton />
      <TableSkeleton rows={8} columns={5} />
    </>
  );
}
