-- Prevent duplicate set rows inside the same workout session.
--
-- Example:
-- workout_session_id = abc
-- exercise_name = Dummy press
-- set_number = 1
--
-- should only exist once.

alter table public.session_sets
add constraint session_sets_unique_set
unique (
  workout_session_id,
  exercise_name,
  set_number
);