-- 0012_part_category_counts.sql
-- One small view to replace 8 sequential count queries on the /parts page.
--
-- rls-exempt: Part already has a permissive read_all policy (see 0008), so an
-- aggregate view over it does not expose anything new. The view returns one
-- row per (category, count) — no row-level data.

create or replace view "PartCategoryCount" as
  select category, count(*)::int as count
  from "Part"
  group by category;

grant select on "PartCategoryCount" to authenticated;
grant select on "PartCategoryCount" to anon;
