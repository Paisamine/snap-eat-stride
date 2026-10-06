drop policy if exists "categories public read" on public.blog_categories;
create policy "categories signed-in read" on public.blog_categories for select to authenticated using (auth.uid() is not null);
revoke select on public.blog_categories from anon;
drop policy if exists "views insert anyone" on public.blog_post_views;
revoke insert on public.blog_post_views from anon, authenticated;