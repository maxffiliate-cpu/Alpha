# Alpha Development Principles

## Core Patterns
- All data fetching and real-time subscriptions go through `@/lib/supabase`.
- Business logic for chat is handled in `ChatWindow.tsx`.
- Analytics data is derived from the `lead_analysis` tables in Supabase.

## Lessons Learned
- Ensure `session_id` format matches n8n expectations to avoid insertion errors.
- Real-time subscriptions should be cleaned up on unmount.
