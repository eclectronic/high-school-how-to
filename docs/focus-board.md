# The Focus Board

Logged in users are taken to their dashboard. The dashboard is a place where the user
will interact with a set of productivity apps that help with executive function.

# UI Look and Feel

The focus board should look like a bulletin board, like the home page. 

* Each list should look like it's tacked on to the board. Each pin should be
  a different color.

* list cards should be perfectly aligned with the page. 

* The board's container should be transparent, allowing for the tiled 
  corkboard background to show.

* By default, task list cards should not expand to the full width of the
  board.  

# Task Manager

The task manager is an application that lets you build a task list. The task
manager is very similar to the iOS Reminders application in that it lets you create multiple task checklists. 

* Create a tasklist card

Within each tasklist card: 

* Add task
* Remove task
* Edit task
* Mark a task as complete: checking a task's checkbox changes the task description in a lighter color that indicates it is complete
* Mark a completed task as incomplete: if unchecked, the task appears in regular font

## Marking a task

To mark a task as done, you have to press the checkbox
Clicking on the text should go into edit mode.

## Add tasks

When adding tasks, if the Add button is pressed or Enter is pressed, the task is created, and the focus must be placed back in the Add text box.
This would allow for quickly creating many items without having to reset the
focus after each item is created.

## Edit Tasks

When editing a task, the text of the task should be editable and saved when pressing Enter. No edit button is necessary, since edit mode is entered when clicking on the text of an item.

When editing a task, I would like the Escape key to exit me from Edit mode.

## Task reordering

The task list provides the user with an easy way of reording items using
drag and drop

## Implementation Details

The frontend is composed of angular components that encapsulate the application.

The backend are APIs that persist the tasklist state. The tasklist state must be
persisted to the database. Liquibase is used to create the DB tables, indexes, etc.

# Undo

Add a lightweight undo so students can reverse quick mistakes (accidental deletes/cleans or an add) without heavy UI.

* Scope: support undo for add, delete, and clean-completed on a single board. Optionally extend to color changes later; skip drag reorder/edit for v1 to keep payloads small.
* UX: add an `Undo` button near list actions and listen for `Ctrl+Z` (skip when focus is in an input/textarea). Disable when no undo stack. Show a small toast/snackbar on success/error.
* State: maintain a per-list undo stack (last N actions, e.g., 5). Store `{type, listId, tasksSnapshotOrDelta, position}` so deletes/cleans can re-create tasks and inserts know where to place them.
* API use: reuse existing endpoints. For undoing delete/clean, re-add tasks via `addTask` (or a bulk restore endpoint if we add one); for undoing add, delete the just-added task. Batch with `forkJoin` to keep UI consistent.
* Persistence: client-only stack is fine for now (clears on refresh). If we want cross-refresh undo, add backend support to stage/restore task sets with expiry.
* Guardrails: prevent repeated undo if the list was deleted; short-circuit if nothing to undo; surface errors in a toast and keep stack entries until a successful undo clears them.
