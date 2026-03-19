-- Расширения
create extension if not exists "uuid-ossp";

-- Функция для проверки членства в чате (security definer избегает рекурсии RLS)
create or replace function is_chat_member(p_chat_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from chat_members where chat_id = p_chat_id and user_id = auth.uid()
  )
$$;

-- Профили пользователей
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Просмотр профилей" on profiles for select using (auth.role() = 'authenticated');
create policy "Создание профиля" on profiles for insert with check (auth.uid() = id);
create policy "Обновление профиля" on profiles for update using (auth.uid() = id);

-- Чаты
create table chats (
  id uuid default uuid_generate_v4() primary key,
  name text,
  is_group boolean default false,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table chats enable row level security;
create policy "Просмотр чатов участниками" on chats
  for select using (is_chat_member(id));
create policy "Создание чата" on chats
  for insert with check (auth.role() = 'authenticated');

-- Участники чатов
create table chat_members (
  chat_id uuid references chats(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (chat_id, user_id)
);
alter table chat_members enable row level security;
create policy "Просмотр участников" on chat_members
  for select using (is_chat_member(chat_id));
create policy "Добавление участника" on chat_members
  for insert with check (auth.role() = 'authenticated');

-- Сообщения
create table messages (
  id uuid default uuid_generate_v4() primary key,
  chat_id uuid references chats(id) on delete cascade,
  sender_id uuid references profiles(id),
  content text,
  file_url text,
  file_name text,
  file_type text,
  file_size bigint,
  created_at timestamptz default now()
);
alter table messages enable row level security;
create policy "Просмотр сообщений" on messages
  for select using (is_chat_member(chat_id));
create policy "Отправка сообщений" on messages
  for insert with check (is_chat_member(chat_id));

-- Автосоздание профиля при регистрации
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Bucket для файлов и видео
insert into storage.buckets (id, name, public) values ('chat-files', 'chat-files', true)
  on conflict do nothing;

create policy "Загрузка файлов" on storage.objects
  for insert with check (bucket_id = 'chat-files' and auth.role() = 'authenticated');
create policy "Чтение файлов" on storage.objects
  for select using (bucket_id = 'chat-files');
create policy "Удаление своих файлов" on storage.objects
  for delete using (bucket_id = 'chat-files' and auth.uid()::text = (storage.foldername(name))[1]);
