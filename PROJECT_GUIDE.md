# AI Fitness Coach — Project Guide

A living guide to understanding how the AI Fitness Coach is being built. This document explains the product, architecture, and key decisions made during development.

**For:** Developers learning full-stack development  
**Updated:** Phase 1B Complete

---

## 1. Product Overview

### What is AI Fitness Coach?

AI Fitness Coach is a web application that helps users create personalized fitness routines. Users sign up, answer questions about their fitness level and goals, and the app generates workout plans tailored to their experience and available time.

### Long-Term Features (Vision)

- **Personalized Workouts**: Generate custom workout plans based on fitness level, goals, and available training days
- **Habit Tracking**: Track daily exercise habits and consistency
- **Progress Monitoring**: Visualize fitness progress with charts and statistics
- **User Settings**: Customize app preferences and fitness profile
- **AI Integration**: Use AI to adapt workouts based on user feedback and progress

### Current Phase (Phase 1B) Scope

**Completed:**
- User authentication (signup/login/logout)
- Onboarding questionnaire after signup
- Protected application routes
- User profile storage in database
- Smart routing (direct to onboarding or dashboard based on profile completion)

**In Progress / Next (Phase 1C):**
- Replace mock data with real workout management
- Workout creation, editing, and persistence
- Habit tracking
- Progress tracking and visualization
- User settings management

---

## 2. Current Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16.3.4 | React framework with App Router for pages and API routes |
| **TypeScript** | 5.x | Type safety and better developer experience |
| **React** | 19.2.8 | UI components and state management |
| **Tailwind CSS** | 4.x | Utility-first CSS styling |
| **Supabase** | 2.116.0 | Authentication and PostgreSQL database |
| **@supabase/ssr** | 0.12.6 | Handles session management with Next.js cookies |
| **Recharts** | 3.10.1 | Chart library for progress visualization |
| **Lucide React** | 1.42.0 | Icon library for UI components |

---

## 3. Current Architecture

### Overview

The application is built in layers: browser (frontend), authentication server (Supabase Auth), application server (Next.js), and database (Supabase PostgreSQL).

```
User Browser
    ↓
Next.js Frontend + Server Components
    ↓
Supabase Auth (Email/Password)
    ↓
Supabase Database (PostgreSQL)
```

### Frontend Layer (`app/` and `components/`)

- **"use client"** pages: Handle user interactions (forms, button clicks)
- **Server components**: Protect routes and fetch initial data
- **Navigation**: Sidebar (components/app-shell.tsx) for authenticated users

### Supabase Auth Layer

- Manages user login and session state
- Stores email and password (in `auth.users` table — **not our application's code**)
- Returns user `id` (UUID) after authentication
- Maintains session via browser cookies

### Supabase Database Layer (`public.profiles` table)

- Stores user profile data (full_name, fitness_goal, experience_level, training_days, session_length)
- Linked to `auth.users` via UUID foreign key
- Row-Level Security (RLS) ensures users can only access their own data
- Automatically creates profile row when user signs up

### Server-Side Code

- **lib/supabase/server.ts**: Creates server-side database client with cookie handling
- **lib/auth.ts**: Shared authentication check for protected routes
- **app/[route]/layout.tsx**: Server components that verify auth before rendering pages
- **app/api/**: Route handlers for backend logic

---

## 4. Authentication Flow

### Signup

1. User visits `/signup` page
2. Enters email, password, and full name
3. Form calls `supabase.auth.signUp()`:
   - Supabase stores email/password in `auth.users` table
   - Full name is passed in metadata
   - Database trigger automatically creates a row in `public.profiles`
4. New profile row has only `id` (UUID from auth.users) and `full_name`
5. Other fields (fitness_goal, experience_level, training_days, session_length) remain `null`
6. App redirects to `/onboarding`

### UUID Creation

Every Supabase Auth user is assigned a **UUID** (Universally Unique Identifier) at signup. This UUID:
- Uniquely identifies the user forever
- Is the primary key in `public.profiles` table
- Cannot be changed
- Is used to link authentication to user data

### auth.users Table

**Important:** This table is managed by Supabase Auth, not our application.
- Stores email and password (hashed)
- Stores user ID (UUID)
- Stores metadata (full_name, other custom data)
- We only **read** from this table; we never modify it directly

### profiles Table

Our application's table. Links to `auth.users` by UUID.

**Columns:**
- `id` — UUID (links to auth.users)
- `full_name` — User's name (text)
- `fitness_goal` — Fitness goal description (text, nullable)
- `experience_level` — Fitness experience level (text, nullable)
- `training_days` — Number of days per week to train (integer, nullable)
- `session_length` — Preferred workout duration (text, nullable)
- `created_at` — When profile was created
- `updated_at` — When profile was last updated

---

### Login

1. User visits `/login` page
2. Enters email and password
3. Form calls `supabase.auth.signInWithPassword()`
4. Supabase verifies credentials and returns user session
5. Session is stored in browser cookies (handled by @supabase/ssr)
6. App checks if user has completed onboarding:
   - If fitness_goal, experience_level, training_days, and session_length are all non-null → redirect to `/dashboard`
   - If any are null → redirect to `/onboarding`

### Session

A session represents a logged-in user. It's maintained by:
1. **Browser cookies**: Supabase stores a session token in the browser
2. **Server-side validation**: Server components call `supabase.auth.getUser()` which reads the cookie to verify the user is still logged in
3. **Automatic expiry**: Sessions expire after a period of inactivity (Supabase default: 1 hour)

### Logout

1. User clicks logout button in sidebar
2. App calls `supabase.auth.signOut()`:
   - Supabase clears the session cookie
   - Server no longer recognizes the user
3. User is redirected to `/login`

### Protected Routes

Every authenticated page (dashboard, workouts, habits, progress, settings, onboarding) has a `layout.tsx` file that:

```typescript
// Example: app/dashboard/layout.tsx
import { requireAuth } from "@/lib/auth";

export default async function DashboardLayout({ children }) {
  await requireAuth();  // Verify user is logged in
  return children;      // If logged in, render the page
}
```

If no session exists, `requireAuth()` calls `redirect("/login")`.

**Note:** This is a **Server Component**, so the redirect happens on the server before the page HTML is sent to the browser. Users never see protected content without authentication.

### Onboarding Routing

After signup or login, the app checks if onboarding is complete:

1. `getUser()` gets the authenticated user's UUID
2. Query `profiles` table for that UUID
3. Check if fitness_goal, experience_level, training_days, and session_length are all set
4. Route accordingly:
   - **All fields set** → `/dashboard`
   - **Any field null** → `/onboarding`

This ensures users complete onboarding before accessing the dashboard.

---

## 5. Database

### profiles Table Structure

**Table Name:** `public.profiles`

**Columns:**

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| `id` | UUID | NO | User's unique ID (from auth.users). Primary key. Auto-deleted if auth user is deleted. |
| `full_name` | Text | NO | User's full name. Set at signup from form. |
| `fitness_goal` | Text | YES | User's fitness goal (e.g., "lose weight", "build muscle"). Set during onboarding. |
| `experience_level` | Text | YES | User's fitness experience (e.g., "beginner", "intermediate"). Set during onboarding. |
| `training_days` | Integer | YES | Days per week user wants to train. Set during onboarding. |
| `session_length` | Text | YES | Preferred workout length (e.g., "30 min", "60 min"). Set during onboarding. |
| `created_at` | Timestamp | NO | When the profile was created. Auto-set to now(). |
| `updated_at` | Timestamp | NO | When the profile was last updated. Auto-updated by trigger. |

### Relationship to auth.users

```
auth.users (Supabase Auth table)
    ↓ (UUID link)
public.profiles (Our application table)
```

- Each profile must have a corresponding auth user
- If auth user is deleted, their profile is automatically deleted (CASCADE delete)
- We trust Supabase to manage the auth.users side

### Row-Level Security (RLS)

RLS is a database-level security feature. It enforces that users can only access their own data.

**Policies:**

1. **SELECT policy**: `auth.uid() = id`
   - Users can only view their own profile
   - Prevents users from seeing other users' fitness goals

2. **UPDATE policy**: `auth.uid() = id`
   - Users can only update their own profile
   - Additional check (`with check`) ensures they can't change another user's data

### Triggers

**Trigger 1: `on_auth_user_created`**

When a new user is created in `auth.users`:
- Automatically inserts a row into `public.profiles`
- Sets `id` to the new user's UUID
- Sets `full_name` from signup metadata
- All other fields remain null

This means developers **never** have to manually create a profile row.

**Trigger 2: `profiles_updated_at`**

Before every profile update:
- Automatically sets `updated_at` to the current timestamp
- Keeps track of when data was last changed

This means developers don't need to manually update the timestamp.

### Phase 1C: Workout Tracking Tables (Migration Created, Not Yet Deployed)

**Status:** Database schema designed and migration file created at `supabase/migrations/003_workout_tracking.sql`. Migration has NOT been run against Supabase. Frontend is NOT yet connected.

#### Purpose: Separating Templates from History

Workout templates (plans) are reusable routines. Workout history (sessions and sets) records actual workouts performed with real performance data.

#### Table 1: `public.workout_plans` (Workout Templates)

Stores repeatable workout routines.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | UUID | PRIMARY KEY | Unique workout plan ID |
| `user_id` | UUID | NOT NULL, FK to auth.users | Owner of this plan (RLS) |
| `name` | TEXT | NOT NULL | E.g., "Push Day", "Leg Day" |
| `description` | TEXT | Optional | E.g., "Upper body push focus" |
| `estimated_duration` | INTEGER | `> 0` if provided | Planned workout minutes |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() | When created |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default now(), auto-updated | When last modified |

**Design Note:** No `day_of_week`. Plans are reusable templates, not tied to specific weekdays. Users can log the same plan multiple times per week.

#### Table 2: `public.workout_plan_exercises` (Exercises in a Plan)

Links exercises to a plan in sequential order.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | UUID | PRIMARY KEY | Unique exercise ID |
| `workout_plan_id` | UUID | FK to workout_plans, ON DELETE CASCADE | Parent plan (RLS inherited) |
| `exercise_name` | TEXT | NOT NULL | E.g., "Bench Press", "Squat" |
| `target_sets` | INTEGER | NOT NULL, `> 0` | Number of sets planned (e.g., 3) |
| `target_reps` | TEXT | NOT NULL | Rep range (e.g., "6-8") |
| `rest_seconds` | INTEGER | `>= 0` if provided | Seconds between sets |
| `order_index` | INTEGER | NOT NULL, `> 0` | Position in workout (1, 2, 3...) |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() | When created |

**Inherits user access** through FK to workout_plans. Users can only edit exercises in their own plans.

#### Table 3: `public.workout_sessions` (Actual Workouts Performed)

Records each time a user completes a workout.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | UUID | PRIMARY KEY | Unique session ID |
| `user_id` | UUID | NOT NULL, FK to auth.users | Owner (RLS) |
| `workout_plan_id` | UUID | Optional FK to workout_plans, ON DELETE SET NULL | Which plan this session followed (can be null) |
| `session_date` | DATE | NOT NULL | When the workout occurred |
| `actual_duration` | INTEGER | `>= 0` if provided | Minutes actually spent |
| `notes` | TEXT | Optional | User comments: "Felt strong", "Wrist pain", etc. |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() | When record created |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default now(), auto-updated | When record last modified |

**Flexible design:** `workout_plan_id` is nullable, allowing users to log ad-hoc sessions without a plan.

**Critical security:** Users can ONLY link sessions to their own workout plans (enforced by RLS with EXISTS check).

#### Table 4: `public.session_sets` (Individual Set Records)

Detailed performance data for each set in a session.

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | UUID | PRIMARY KEY | Unique set ID |
| `workout_session_id` | UUID | FK to workout_sessions, ON DELETE CASCADE | Parent session (RLS inherited) |
| `exercise_name` | TEXT | NOT NULL | E.g., "Bench Press" |
| `set_number` | INTEGER | NOT NULL, `> 0` | Which set (1, 2, 3...) |
| `weight` | NUMERIC | `>= 0` if provided | Weight lifted in kg/lbs |
| `reps_performed` | INTEGER | `>= 0` if provided | Actual reps completed |
| `rpe` | INTEGER | `1-10` if provided | Rate of Perceived Exertion (1=easy, 10=max effort) |
| `notes` | TEXT | Optional | E.g., "Could do 2 more", "Felt stalled" |
| `completed` | BOOLEAN | NOT NULL, default false | Whether user marked it complete |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() | When record created |

**Inherits user access** through FK to workout_sessions. All performance fields are optional for Phase 1 flexibility.

#### Row-Level Security for Workout Tables

All four tables have RLS policies ensuring:

**workout_plans:**
- Users can only view, edit, or delete their own plans
- `auth.uid() = user_id` check on all operations

**workout_plan_exercises:**
- Users can only view/edit exercises in their own plans
- Inheritance: FK to workout_plans verifies ownership

**workout_sessions (STRENGTHENED):**
- Users can only view, edit, or delete their own sessions
- **CRITICAL:** When creating or updating a session with a `workout_plan_id`, the plan MUST belong to `auth.uid()`
- Prevents users from linking their sessions to other users' plans
- Enforced by EXISTS check that verifies `workout_plans.user_id = auth.uid()`

**session_sets:**
- Users can only view/edit sets in their own sessions
- Inheritance: FK to workout_sessions verifies ownership
- UPDATE operations have WITH CHECK to prevent moving sets to other users' sessions

#### Validation Constraints (Database Level)

All numeric fields are validated at the database layer:

| Field | Constraint | Reason |
|-------|-----------|--------|
| `estimated_duration` | `> 0` | Workouts must be positive duration |
| `target_sets` | `> 0` | At least 1 set required |
| `rest_seconds` | `>= 0` or NULL | No negative rest periods |
| `order_index` | `> 0` | Positions start at 1 |
| `actual_duration` | `>= 0` or NULL | Non-negative duration |
| `set_number` | `> 0` | Sets numbered 1, 2, 3... |
| `weight` | `>= 0` or NULL | No negative weights |
| `reps_performed` | `>= 0` or NULL | No negative reps |
| `rpe` | `1-10` or NULL | Valid perception scale |

**Why database validation:** Database constraints apply regardless of how data is submitted (frontend, API, direct SQL). More secure than frontend-only validation.

#### Migration File

**Location:** `supabase/migrations/003_workout_tracking.sql`

**Status:** 
- ✅ File created locally
- ✅ All tables, indexes, and policies included
- ✅ Validation constraints and RLS policies implemented
- ❌ NOT YET RUN against Supabase (pending deployment approval)

---

## 6. Current Routes

| Route | Protection | Purpose | Data |
|-------|-----------|---------|------|
| `/login` | Public | User login | — |
| `/signup` | Public | New user registration | Writes to auth.users + triggers profile creation |
| `/onboarding` | Protected | Fitness profile setup questionnaire | Writes to profiles table |
| `/dashboard` | Protected | Main app home page | Mock data only |
| `/workouts` | Protected | View and manage workouts | Mock data only |
| `/habits` | Protected | View and manage daily habits | Mock data only |
| `/progress` | Protected | View fitness progress charts | Mock data only |
| `/settings` | Protected | Manage user preferences | Mock data only |
| `/api/supabase-health` | Public | Health check endpoint | Queries auth session |

**Protected routes** use the `requireAuth()` helper in their `layout.tsx` files to verify authentication before rendering.

---

## 7. Mock Data vs Real Data

### Real Data (Connected to Supabase)

✅ **User Authentication**
- Email/password signup and login
- Session management
- Logout

✅ **User Profile**
- Full name (stored at signup)
- Fitness goal, experience level, training days, session length (stored during onboarding)
- Profile data persists in Supabase database

✅ **Onboarding Questionnaire**
- User answers → saved to `public.profiles`
- Smart routing based on profile completion

### Mock Data (Placeholder)

🚫 **Workouts**
- Currently loaded from `lib/mock-data.ts`
- No persistence to database
- Will be replaced with real Supabase storage in Phase 1C

🚫 **Habits**
- Currently loaded from `lib/mock-data.ts`
- No persistence to database
- Will be replaced with real Supabase storage in Phase 1C

🚫 **Progress**
- Currently calculated from mock data
- Charts display dummy statistics
- Will be calculated from real workout/habit data in Phase 1C

### What's Next (Phase 1C Migration)

1. Create `public.workouts` table in Supabase
2. Create `public.habits` table in Supabase
3. Replace mock data imports with Supabase queries
4. Implement workout creation, editing, and deletion
5. Implement habit tracking
6. Recalculate progress based on real data

---

## 8. Completed Work (Phase 1B)

This is a checklist of work completed during authentication and onboarding setup:

- ✅ Install @supabase/supabase-js and @supabase/ssr packages
- ✅ Set up .env.local with Supabase credentials
- ✅ Create lib/supabase/client.ts (browser-side Supabase client)
- ✅ Create lib/supabase/server.ts (server-side Supabase client with cookie handling)
- ✅ Create lib/auth.ts (reusable requireAuth() helper)
- ✅ Build app/signup/page.tsx with email/password registration and full_name metadata
- ✅ Create Supabase Auth trigger to auto-create profiles on signup
- ✅ Build app/login/page.tsx with conditional routing (onboarding vs dashboard)
- ✅ Build app/onboarding/page.tsx with 4-question questionnaire
- ✅ Connect onboarding form to update profiles table in Supabase
- ✅ Build logout functionality in components/app-shell.tsx
- ✅ Update components/app-shell.tsx to fetch authenticated user's full_name from Supabase
- ✅ Create app/dashboard/layout.tsx with route protection
- ✅ Create protected route layouts for /workouts, /habits, /progress, /settings, /onboarding
- ✅ Create supabase/migrations/001_profiles.sql (database schema and triggers)
- ✅ Validate all routes and auth flows with npm run build

---

## 9. Current Task

**Phase 1C: Workouts**

**Status:** Database schema designed and migration file created. Frontend integration pending.

The workout tracking system uses 4 linked tables (see Phase 1C schema above):
1. `workout_plans` — User's reusable workout templates
2. `workout_plan_exercises` — Exercises within each plan
3. `workout_sessions` — History of completed workouts
4. `session_sets` — Performance data per set (weight, reps, RPE)

**Completed in this phase:**
- ✅ Designed Phase 1C workout schema (4 tables, normalized)
- ✅ Added database-level validation constraints
- ✅ Implemented comprehensive RLS policies
- ✅ Strengthened security to prevent cross-user data access
- ✅ Created migration file: `supabase/migrations/003_workout_tracking.sql`

**Next steps (after schema deployment):**
1. Run the migration in Supabase SQL Editor
2. Create TypeScript types for the new tables (WorkoutPlan, WorkoutSession, SessionSet)
3. Build Supabase query functions for CRUD operations
4. Replace mock workout data in `/app/workouts/page.tsx` with real Supabase queries
5. Connect `/app/workouts/new/page.tsx` to persist new plans to database
6. Connect `/app/workouts/session/[id]/page.tsx` to record session performance data
7. Update `/app/dashboard/page.tsx` to display user's actual workout history

After workouts, the same pattern will be applied to habits and progress tracking.

---

## 10. Important Concepts Learned

### Authentication

**Definition:** The process of verifying that someone is who they claim to be.

**In this project:** When a user signs up with email/password, Supabase Auth verifies their credentials and issues them a session token. The browser stores this token in a cookie. On each request, the token is included so the server knows which user is making the request.

**Example:** Login form sends email + password → Supabase Auth checks if they match → Returns session token → Browser stores token → Future requests include token automatically.

### Authorization

**Definition:** The process of determining what an authenticated user is allowed to do.

**In this project:** Row-Level Security (RLS) policies in the database. Even if a user is authenticated, the database only returns rows they're authorized to see. A user can only access their own profile, not other users' profiles.

**Example:** User A is logged in and authenticated. They try to query User B's fitness goal. The database's RLS policy blocks this because `auth.uid() != User B's id`.

### UUID

**Definition:** Universally Unique Identifier — a 128-bit number used to identify something uniquely across the entire world.

**Format:** `f47ac10b-58cc-4372-a567-0e02b2c3d479`

**In this project:** Every Supabase Auth user is assigned a UUID. This UUID is used as the primary key in the `public.profiles` table. It links the user's authentication record to their profile data.

**Why UUID instead of integer ID?** UUIDs are randomly generated and can't be guessed, so they're more secure. They also work well in distributed systems.

### Session

**Definition:** A record of a user's login state. It proves the user is who they claim to be.

**In this project:** When a user logs in, Supabase creates a session and stores it in the browser as a cookie. The server checks this cookie on every request. If the cookie is valid and not expired, the user stays logged in. If the cookie is missing or expired, the user is logged out.

**Lifetime:** Sessions expire after a period of inactivity (default: 1 hour in Supabase). Users can also manually log out, which clears the session immediately.

### Environment Variables

**Definition:** Configuration values that change between environments (development, staging, production).

**In this project:** `.env.local` contains sensitive values like Supabase URL and API keys.

**Important:** Environment variables starting with `NEXT_PUBLIC_` are visible in the browser (safe for public API keys). Variables without `NEXT_PUBLIC_` are server-only (safe for secrets).

**Our project:**
- `NEXT_PUBLIC_SUPABASE_URL` — Public Supabase API endpoint
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Public API key for browser clients

Both are public by design; they can't access sensitive data without the user's session.

### Row-Level Security (RLS)

**Definition:** Database-level access control. The database itself decides which rows each user can see or modify, independent of application logic.

**In this project:** The `public.profiles` table has RLS policies:
- Users can only SELECT their own profile
- Users can only UPDATE their own profile
- The database enforces this, not the application code

**Why it matters:** Even if an attacker bypasses the application code, the database still protects user data.

### Database Migration

**Definition:** A versioned SQL script that modifies the database schema (tables, columns, policies, etc.).

**In this project:** `supabase/migrations/001_profiles.sql` creates the profiles table and its security policies. Migrations are numbered so they run in order.

**Important:** Migrations must be **idempotent** (safe to run multiple times). We use `create table if not exists` and `drop trigger if exists` to prevent errors if a migration is run twice.

### Persistent State vs Frontend State

**Persistent State:** Data that must be saved to the database and survive page refreshes or app restarts.

**Frontend State:** Temporary data used while the app is running (e.g., form input, currently selected tab).

**In this project:**
- **Persistent:** User's full name, fitness goal, experience level, training days, session length (stored in `public.profiles`)
- **Frontend:** Current form input, loading spinner visibility, error messages (stored in React useState)

When saving data, we send it to Supabase. When retrieving data, we query Supabase. The database is the "source of truth."

---

## 11. Development Decisions

### Email Remains in auth.users (Not Duplicated)

**Decision:** User email is stored only in Supabase's `auth.users` table. It is NOT duplicated in the `public.profiles` table.

**Rationale:**
- Email is managed by Supabase Auth; we shouldn't duplicate it
- Email is sensitive and should be centralized for security
- `auth.users.id` (UUID) is sufficient to link profiles to auth users
- If email changes, it updates in one place

### Profiles Are Created Automatically via Trigger

**Decision:** When a user signs up, a database trigger automatically creates a profile row. Developers don't manually insert profiles.

**Rationale:**
- Prevents bugs where a user is created but their profile isn't
- Keeps auth and profile data in sync
- Simpler code; developers only call `supabase.auth.signUp()`
- Trigger runs atomically with auth user creation

### Authenticated Routes Use a Shared requireAuth Helper

**Decision:** All protected routes use the same `requireAuth()` function instead of duplicating auth checks in every layout.

**Rationale:**
- Single source of truth for authentication logic
- Easy to update auth behavior (e.g., add logging, new requirements)
- Reduces code duplication
- Clear intent: any file calling `requireAuth()` is a protected route

### Onboarding Completion Determines Initial Route

**Decision:** After login, the app checks if onboarding is complete. If not, users are sent to `/onboarding`. If yes, they go to `/dashboard`.

**Rationale:**
- Ensures users complete their fitness profile before accessing the app
- Prevents incomplete or default data in profiles
- Better user experience; users don't see broken features due to missing data
- Onboarding questions are necessary for personalization

### Phase 1C: Separate Workout Templates from Session History

**Decision:** Two separate tables: `workout_plans` (templates) and `workout_sessions` (history).

**Rationale:**
- Plans are repeatable and rarely change
- Sessions are historical records that accumulate over time
- Users can reuse the same plan multiple times per week
- Separates concerns and simplifies queries
- Plans are not locked to specific weekdays

### Phase 1C: No day_of_week in Workout Plans

**Decision:** `workout_plans` table has no `day_of_week` column.

**Rationale:**
- Plans are templates, not calendar events
- Users might train Mon/Wed/Fri one week, then Mon/Tue/Thu the next
- Locking a plan to a day inflexible and violates single responsibility
- The date is recorded in `workout_sessions.session_date` instead

### Phase 1C: Database-Level Validation Constraints

**Decision:** All numeric fields validated with CHECK constraints in the database schema.

**Rationale:**
- Frontend validation can be bypassed or disabled
- Database constraints apply to ALL data modifications (frontend, API, direct SQL)
- Prevents accidental data corruption
- Simpler application code (trust the database)

**Examples:**
- `estimated_duration > 0`: Can't have negative workout times
- `target_sets > 0`: Must have at least 1 set per exercise
- `rpe BETWEEN 1 AND 10`: Perception scale is 1-10
- `weight >= 0 or null`: No negative weights

### Phase 1C: Strengthened Cross-User Data Protection

**Decision:** RLS policies prevent users from linking their sessions to other users' plans.

**Rationale:**
- Prevents accidental mistakes (User A accidentally selects User B's plan)
- Prevents malicious attacks (User A tries to access User B's data)
- Enforced at the database level with EXISTS checks, not frontend logic
- More secure than relying on application code

**Implementation:** When a user creates or updates a `workout_session` with a `workout_plan_id`, the plan MUST belong to `auth.uid()`. The database enforces this with:

```sql
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
```

### Phase 1C: Optional Performance Fields in session_sets

**Decision:** `weight`, `reps_performed`, and `rpe` are all nullable in `session_sets`.

**Rationale:**
- Phase 1 needs flexibility; users might not fill in all metrics
- Some exercises are bodyweight (no weight to record)
- Some users might track only weight, not RPE
- Nullable fields allow partial data entry
- Users can fill in details later or skip them entirely

---

## 12. Update Log

### Phase 1B — Authentication & Onboarding (Completed)

**2026-09-09**
- ✅ Installed Supabase packages and configured .env.local
- ✅ Created reusable Supabase client factories (browser and server)
- ✅ Built signup flow with email/password registration
- ✅ Built login flow with smart onboarding routing
- ✅ Built onboarding questionnaire with form validation
- ✅ Created public.profiles table with RLS policies
- ✅ Implemented Auth triggers for auto-profile creation
- ✅ Built logout functionality with session clearing
- ✅ Protected all authenticated routes (/dashboard, /workouts, /habits, /progress, /settings, /onboarding)
- ✅ Created reusable requireAuth() helper for route protection
- ✅ Validated all builds and auth flows with TypeScript checking

### Phase 1C — Workouts (Schema & Migration Created)

**2026-09-09 — Database Design Phase**
- ✅ Analyzed current workout data structure (frontend and mock data)
- ✅ Designed Phase 1C schema: 4 tables (workout_plans, workout_plan_exercises, workout_sessions, session_sets)
- ✅ Added validation constraints (numeric ranges, non-negative values, RPE scale 1-10)
- ✅ Implemented comprehensive RLS policies with cross-user protection
- ✅ Created migration file: `supabase/migrations/003_workout_tracking.sql`
- ✅ Updated PROJECT_GUIDE.md with schema, decisions, and status

**Planned Frontend Integration Tasks:**
- Run the migration in Supabase SQL Editor (deployment pending approval)
- Create TypeScript types for new tables
- Build Supabase query functions for CRUD operations
- Replace mock data in /app/workouts with real database queries
- Connect session tracking UI to record performance data

**Expected Timeline for Frontend Integration:** 1-2 weeks (after schema deployment approval)

---

## Contributing to This Guide

When completing new features or making architectural decisions, please update this guide:

1. **New features:** Add to the "Completed Work" section with checkmarks
2. **New tables:** Document in the "Database" section
3. **New routes:** Add to the "Current Routes" table
4. **New concepts:** Explain in "Important Concepts Learned"
5. **New decisions:** Document in "Development Decisions"
6. **Data migration:** Update "Mock Data vs Real Data"

Keep explanations beginner-friendly and practical.

---

## Quick Reference

### Key Files

| File | Purpose |
|------|---------|
| `lib/auth.ts` | Reusable authentication check for protected routes |
| `lib/supabase/server.ts` | Server-side Supabase client (Next.js server components) |
| `lib/supabase/client.ts` | Browser-side Supabase client (React components) |
| `app/*/layout.tsx` | Route protection (calls requireAuth) |
| `app/signup/page.tsx` | User registration form |
| `app/login/page.tsx` | User login form with smart routing |
| `app/onboarding/page.tsx` | Fitness profile setup questionnaire |
| `components/app-shell.tsx` | Sidebar and header for authenticated pages |
| `supabase/migrations/001_profiles.sql` | Database schema creation |

### Useful Commands

```bash
npm run dev       # Start development server (localhost:3000)
npm run build     # Compile TypeScript and optimize for production
npm run start     # Start production server
npm run lint      # Check code quality
```

### Important URLs

- **App:** http://localhost:3000
- **Supabase Project:** https://app.supabase.com (login required)
- **Database:** Accessible via Supabase SQL Editor

---

**Questions or updates?** Edit this file and commit the changes. This guide is a living document that grows with the project.
