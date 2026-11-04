# Starting the product safely

**Look for the recipe first** in `product/operations.md`. If there is none, inspect the real setup
(scripts, config, env examples) rather than guessing commands or searching old sessions.

**Before starting anything**, find where data will go: the actual database or API, ignored local
config, credentials, recipients and side effects. Use the project's fixtures and test configuration.
Unknown live credentials never authorize data writes, notifications or admin actions during a
preview. Recheck endpoints and config before each real use: an earlier safe run is not new permission.
Never install global software, use live credentials or switch suppliers just to get a preview working.

**A process that starts is not a working page.** Open the real route and check it. A passing startup
step never rescues a failed test.

**Keep what worked.** After a safe route has actually run, add a short recipe to
`product/operations.md`: shell invocation, setup, a non-secret readiness check, the resources the task
owns, cleanup, and any host quirks with the recovery that worked. Keep helpers in durable project
paths, never in a temporary session folder. Keep task-specific fixture data with the task's tests.
Never write down a route that hasn't run, or any secret. Revalidate a recipe only when its wrapper or
config changed.

**Timeouts prove nothing either way.** After a navigation or download timeout, inspect the route, the
process you own and the artifact. Identify a download by its request and time, not by a file with the
same name. Never repeat a state-changing action whose outcome is unknown. Use a bounded state check
instead of a longer sleep.

**Clean up only what this task started**, and keep the preview running until the person has reviewed
it.
