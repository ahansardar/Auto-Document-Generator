create table if not exists public.customfont (
  id varchar primary key,
  family varchar not null,
  original_filename varchar not null,
  font_path varchar not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_customfont_family on public.customfont(family);
