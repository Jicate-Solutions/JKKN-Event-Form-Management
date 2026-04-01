# Database Schemas — Live from Supabase

> **Source:** Supabase project `oinusagylrdshrydvmpp` | **Queried:** 2026-04-01
> **Method:** Supabase Management API (`information_schema.columns`, `pg_policies`, `information_schema.routines`)

## Overview

| Metric | Count |
|--------|-------|
| Tables | 16 |
| Total columns | 159 |
| Foreign keys | 24 |
| RLS policies | 40+ |
| Database functions | 17 |

---

## Tables Referenced by MCP Tools

### `personal_forms` (17 columns) — Primary MCP target

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `banner_url` | text | YES | — |
| `slug` | text | YES | — |
| `fields` | jsonb | NO | `'[]'::jsonb` |
| `status` | text | NO | `'draft'` |
| `is_public` | boolean | YES | `false` |
| `submission_limit` | integer | YES | — |
| `created_by` | uuid | NO | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |
| `restrict_domain` | boolean | YES | `false` |
| `allowed_domains` | text[] | YES | `'{}'` |
| `enable_user_autofetch` | boolean | YES | `false` |
| `require_institutional_profile` | boolean | YES | `false` |
| `allow_manual_entry_fallback` | boolean | YES | `false` |

**FK:** `created_by` → `profiles.id`

### `personal_form_responses` (9 columns)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `personal_form_id` | uuid | NO | — |
| `submission_id` | text | NO | — |
| `response_data` | jsonb | NO | `'{}'` |
| `submitted_by` | uuid | YES | — |
| `user_email` | text | YES | — |
| `is_anonymous` | boolean | NO | `false` |
| `submitted_at` | timestamptz | NO | `now()` |
| `user_profile` | jsonb | YES | — |

**FKs:** `personal_form_id` → `personal_forms.id`, `submitted_by` → `profiles.id`

### `personal_form_collaborators` (10 columns)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `personal_form_id` | uuid | NO | — |
| `user_id` | uuid | NO | — |
| `can_edit_structure` | boolean | NO | `false` |
| `can_view_responses` | boolean | NO | `false` |
| `can_export_data` | boolean | NO | `false` |
| `can_manage_collaborators` | boolean | NO | `false` |
| `is_owner` | boolean | NO | `false` |
| `added_at` | timestamptz | NO | `now()` |
| `added_by` | uuid | YES | — |

**FKs:** `personal_form_id` → `personal_forms.id`, `user_id` → `profiles.id`, `added_by` → `profiles.id`

### `forms` (14 columns) — Institutional forms

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `uuid_generate_v4()` |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `fields` | jsonb | NO | `'[]'` |
| `is_public` | boolean | YES | `false` |
| `status` | text | NO | `'draft'` |
| `institution_id` | uuid | NO | — |
| `event_id` | uuid | YES | — |
| `created_by` | uuid | NO | — |
| `created_at` | timestamptz | YES | `now()` |
| `updated_at` | timestamptz | YES | `now()` |
| `banner_url` | text | YES | — |
| `submission_limit` | integer | YES | — |
| `slug` | varchar | YES | — |

**FKs:** `institution_id` → `institutions.id`, `event_id` → `events.id`, `created_by` → `profiles.id`

### `form_responses` (12 columns)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `form_id` | uuid | NO | — |
| `response_data` | jsonb | NO | `'{}'` |
| `submitted_by` | uuid | YES | — |
| `is_anonymous` | boolean | YES | `false` |
| `submitted_at` | timestamptz | YES | `now()` |
| `user_email` | text | YES | — |
| `submission_id` | text | YES | — |
| `payment_status` | text | YES | `'not_required'` |
| `payment_amount` | numeric | YES | — |
| `payment_id` | text | YES | — |
| `payment_updated_at` | timestamptz | YES | — |

**FK:** `form_id` → `forms.id`

### `events` (15 columns)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `uuid_generate_v4()` |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `start_time` | timestamptz | NO | — |
| `end_time` | timestamptz | NO | — |
| `place_id` | uuid | YES | — |
| `institution_id` | uuid | YES | — |
| `department_id` | uuid | YES | — |
| `coordinator_id` | uuid | YES | — |
| `created_by` | uuid | YES | — |
| `is_active` | boolean | YES | `true` |
| `created_at` | timestamptz | YES | `now()` |
| `updated_at` | timestamptz | YES | `now()` |
| `has_registration_form` | boolean | YES | `false` |
| `status` | varchar | YES | `'upcoming'` |

**FKs:** `place_id` → `places.id`, `institution_id` → `institutions.id`, `department_id` → `departments.id`, `coordinator_id` → `profiles.id`

### `profiles` (12 columns)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | — (from auth.users) |
| `email` | text | NO | — |
| `full_name` | text | YES | — |
| `bio` | text | YES | — |
| `avatar_url` | text | YES | — |
| `phone_number` | text | YES | — |
| `role` | user_role (enum) | NO | `'public'` |
| `is_active` | boolean | YES | `true` |
| `last_login` | timestamptz | YES | — |
| `profile_complete` | boolean | YES | `false` |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

**`user_role` enum values:** `super_admin`, `administrator`, `institution_coordinator`, `event_coordinator`, `staff`, `student`, `public`

---

## Supporting Tables

### `form_templates` (10 columns)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `title` | text | NO | — |
| `description` | text | YES | — |
| `category` | text | NO | — |
| `fields` | jsonb | NO | `'[]'` |
| `is_public` | boolean | NO | `true` |
| `created_by` | uuid | NO | — |
| `created_at` | timestamptz | YES | `now()` |
| `updated_at` | timestamptz | YES | `now()` |
| `banner_url` | text | YES | — |

### `institutions` (7 columns)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `uuid_generate_v4()` |
| `name` | varchar | NO | — |
| `is_active` | boolean | YES | `true` |
| `created_by` | uuid | YES | — |
| `created_at` | timestamptz | YES | `now()` |
| `updated_at` | timestamptz | YES | `now()` |
| `coordinator_id` | uuid | YES | — |

### `departments` (7 columns)

`id`, `name`, `institution_id` (FK → institutions), `is_active`, `created_by`, `created_at`, `updated_at`

### `places` (9 columns)

`id`, `name`, `description`, `capacity` (int), `location`, `is_active`, `created_by`, `created_at`, `updated_at`

### Junction Tables

| Table | Columns | Purpose |
|-------|---------|---------|
| `event_coordinators` (7) | event_id, user_id, role, assigned_by, ... | Multi-coordinator per event |
| `form_collaborators` (7) | form_id, user_id, permission_level, assigned_by, ... | Institutional form sharing |
| `institution_coordinators` (5) | institution_id, user_id, ... | Institution-level coordination |
| `department_coordinators` (5) | department_id, user_id, ... | Department-level coordination |

### Cache Table

| Table | Columns | Purpose |
|-------|---------|---------|
| `user_profile_cache` (14) | email (unique), user_type, full_name, institution_name, department_name, raw_data (jsonb), ... | Caches MyJKKN API user data (24h TTL) |

---

## Database Functions (RPC)

| Function | Returns | Used By MCP? |
|----------|---------|-------------|
| `create_form_response` | jsonb | No (web form submissions only) |
| `create_personal_form_response` | record | No (web form submissions only) |
| `can_accept_submission` | boolean | No (checked by web form) |
| `can_accept_personal_form_submission` | boolean | No (checked by web form) |
| `get_form_submission_stats` | record | Yes — via `get_personal_form_stats` tool |
| `get_personal_form_stats` | record | Yes — via `get_personal_form_stats` tool |
| `get_form_submission_count` | integer | No (internal helper) |
| `is_institution_admin` | boolean | No (RLS policy helper) |
| `handle_new_user` | trigger | Auto — creates profile on auth signup |
| `handle_updated_at` | trigger | Auto — updates timestamp columns |
| `check_place_availability` | trigger | Auto — validates event place bookings |
| `create_event_owner` | trigger | Auto — adds creator as event coordinator |
| `sync_department_coordinator` | trigger | Auto — syncs dept coordinator changes |

---

## RLS Policy Summary

All tables have RLS enabled. Key patterns:

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `personal_forms` | Owner + collaborators | Authenticated | Owner + edit collaborators | Owner only |
| `personal_form_responses` | Owner + view collaborators | Public (form submissions) | — | Owner only |
| `personal_form_collaborators` | Owner + collaborators | Owner + manage collaborators | Owner + manage collaborators | Owner + manage collaborators |
| `forms` | Super admin + institution/event coordinators | Authenticated | Creator + coordinators | Creator only |
| `form_responses` | Form creator + coordinators + super admin | Authenticated | — | — |
| `events` | Super admin + institution/event coordinators | Authenticated | Creator + coordinators + super admin | Creator only |
| `profiles` | Authenticated | Via trigger | Own profile | — |

**Important for MCP:** The MCP server creates a Supabase client with the user's JWT token, so all queries respect these RLS policies automatically. No application-layer permission bypass is needed — RLS does the heavy lifting.

---

## Foreign Key Relationship Map

```
profiles ←──── personal_forms.created_by
    │
    ├──── personal_form_collaborators.user_id
    ├──── personal_form_collaborators.added_by
    ├──── personal_form_responses.submitted_by
    │
    ├──── forms.created_by
    ├──── form_collaborators.user_id
    │
    ├──── events.coordinator_id
    ├──── event_coordinators.user_id
    ├──── event_coordinators.assigned_by
    │
    ├──── institution_coordinators.user_id
    └──── department_coordinators.user_id

institutions ←── departments.institution_id
    │            ├── events.institution_id
    │            └── forms.institution_id
    └──── institution_coordinators.institution_id

events ←── forms.event_id
    │      └── event_coordinators.event_id
    └──── places (via place_id)

personal_forms ←── personal_form_responses.personal_form_id
               └── personal_form_collaborators.personal_form_id
```

---

*Queried from live Supabase (project: `oinusagylrdshrydvmpp`) on 2026-04-01*
