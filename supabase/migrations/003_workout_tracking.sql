-- Phase 1C: Workout tracking tables with validation constraints and security
-- Separates workout templates (plans) from actual workout history (sessions and sets)

-- Table 1: Workout Plans (templates/routines)
create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  estimated_duration integer check (estimated_duration > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table 2: Exercises in each plan
create table if not exists public.workout_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_plan_id uuid not null references public.workout_plans(id) on delete cascade,
  exercise_name text not null,
  target_sets integer not null check (target_sets > 0),
  target_reps text not null,
  rest_seconds integer check (rest_seconds is null or rest_seconds >= 0),
  order_index integer not null check (order_index > 0),
  created_at timestamptz not null default now()
);

-- Table 3: Individual workout sessions (history)
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_plan_id uuid references public.workout_plans(id) on delete set null,
  session_date date not null,
  actual_duration integer check (actual_duration is null or actual_duration >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table 4: Individual sets performed during a session
create table if not exists public.session_sets (
  id uuid primary key default gen_random_uuid(),
  workout_session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_name text not null,
  set_number integer not null check (set_number > 0),
  weight numeric check (weight is null or weight >= 0),
  reps_performed integer check (reps_performed is null or reps_performed >= 0),
  rpe integer check (rpe is null or (rpe >= 1 and rpe <= 10)),
  notes text,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security on all tables
alter table public.workout_plans enable row level security;
alter table public.workout_plan_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.session_sets enable row level security;

-- ============================================================================
-- RLS Policies for workout_plans
-- ============================================================================

create policy "Users can view their own workout_plans"
on public.workout_plans for select
using (auth.uid() = user_id);

create policy "Users can create workout_plans"
on public.workout_plans for insert
with check (auth.uid() = user_id);

create policy "Users can update their own workout_plans"
on public.workout_plans for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own workout_plans"
on public.workout_plans for delete
using (auth.uid() = user_id);

-- ============================================================================
-- RLS Policies for workout_plan_exercises
-- ============================================================================

create policy "Users can view exercises in their workout_plans"
on public.workout_plan_exercises for select
using (
  exists (
    select 1 from public.workout_plans
    where public.workout_plans.id = public.workout_plan_exercises.workout_plan_id
    and public.workout_plans.user_id = auth.uid()
  )
);

create policy "Users can insert exercises into their workout_plans"
on public.workout_plan_exercises for insert
with check (
  exists (
    select 1 from public.workout_plans
    where public.workout_plans.id = public.workout_plan_exercises.workout_plan_id
    and public.workout_plans.user_id = auth.uid()
  )
);

create policy "Users can update exercises in their workout_plans"
on public.workout_plan_exercises for update
using (
  exists (
    select 1 from public.workout_plans
    where public.workout_plans.id = public.workout_plan_exercises.workout_plan_id
    and public.workout_plans.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workout_plans
    where public.workout_plans.id = public.workout_plan_exercises.workout_plan_id
    and public.workout_plans.user_id = auth.uid()
  )
);

create policy "Users can delete exercises from their workout_plans"
on public.workout_plan_exercises for delete
using (
  exists (
    select 1 from public.workout_plans
    where public.workout_plans.id = public.workout_plan_exercises.workout_plan_id
    and public.workout_plans.user_id = auth.uid()
  )
);

-- ============================================================================
-- RLS Policies for workout_sessions (STRENGTHENED)
-- Prevents users from linking to other users' workout plans
-- ============================================================================

create policy "Users can view their own workout_sessions"
on public.workout_sessions for select
using (auth.uid() = user_id);

create policy "Users can create workout_sessions"
on public.workout_sessions for insert
with check (
  auth.uid() = user_id
  and (
    workout_plan_id is null
    or exists (
      select 1 from public.workout_plans
      where public.workout_plans.id = public.workout_sessions.workout_plan_id
      and public.workout_plans.user_id = auth.uid()
    )
  )
);

create policy "Users can update their own workout_sessions"
on public.workout_sessions for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (
    workout_plan_id is null
    or exists (
      select 1 from public.workout_plans
      where public.workout_plans.id = public.workout_sessions.workout_plan_id
      and public.workout_plans.user_id = auth.uid()
    )
  )
);

create policy "Users can delete their own workout_sessions"
on public.workout_sessions for delete
using (auth.uid() = user_id);

-- ============================================================================
-- RLS Policies for session_sets
-- ============================================================================

create policy "Users can view sets in their workout_sessions"
on public.session_sets for select
using (
  exists (
    select 1 from public.workout_sessions
    where public.workout_sessions.id = public.session_sets.workout_session_id
    and public.workout_sessions.user_id = auth.uid()
  )
);

create policy "Users can insert sets into their workout_sessions"
on public.session_sets for insert
with check (
  exists (
    select 1 from public.workout_sessions
    where public.workout_sessions.id = public.session_sets.workout_session_id
    and public.workout_sessions.user_id = auth.uid()
  )
);

create policy "Users can update sets in their workout_sessions"
on public.session_sets for update
using (
  exists (
    select 1 from public.workout_sessions
    where public.workout_sessions.id = public.session_sets.workout_session_id
    and public.workout_sessions.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workout_sessions
    where public.workout_sessions.id = public.session_sets.workout_session_id
    and public.workout_sessions.user_id = auth.uid()
  )
);

create policy "Users can delete sets from their workout_sessions"
on public.session_sets for delete
using (
  exists (
    select 1 from public.workout_sessions
    where public.workout_sessions.id = public.session_sets.workout_session_id
    and public.workout_sessions.user_id = auth.uid()
  )
);

-- ============================================================================
-- Triggers for automatic timestamp updates
-- ============================================================================

create or replace function public.set_updated_at_workout_plans()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workout_plans_updated_at on public.workout_plans;

create trigger workout_plans_updated_at
before update on public.workout_plans
for each row execute procedure public.set_updated_at_workout_plans();

create or replace function public.set_updated_at_workout_sessions()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists workout_sessions_updated_at on public.workout_sessions;

create trigger workout_sessions_updated_at
before update on public.workout_sessions
for each row execute procedure public.set_updated_at_workout_sessions();
