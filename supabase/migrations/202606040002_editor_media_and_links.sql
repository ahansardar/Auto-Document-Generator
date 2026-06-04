alter table if exists public.templatetextelement
  add column if not exists element_type varchar not null default 'text',
  add column if not exists image_src text,
  add column if not exists image_alt varchar,
  add column if not exists hyperlink_url text;
