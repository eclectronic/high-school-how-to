--liquibase formatted sql

--changeset system:v5-content-seed-0054-tags
INSERT INTO tags (slug, name, description, sort_order)
VALUES
    ('help',  'Help',  'Help documentation and guides for using the site', 98),
    ('about', 'About', 'About High School How To',                         99)
ON CONFLICT (slug) DO NOTHING;
--rollback DELETE FROM tags WHERE slug IN ('help', 'about');

--changeset system:v5-content-seed-0054-about
INSERT INTO content_cards (slug, title, description, card_type, status, simple_layout, body_html, created_at, updated_at) VALUES (
    'about-mission',
    'About High School How To',
    'High School How To is an educational platform helping students navigate, organize, and thrive in high school.',
    'ARTICLE',
    'PUBLISHED',
    TRUE,
    '<h2>What is High School How To?</h2><p>High School How To is a free educational platform built for high school students. We make guides, videos, and infographics that cover the things school doesn''t always teach you — from calculating your GPA to styling your look to building better study habits.</p><h2>Your Locker</h2><p>Once you sign up, you get your own personal locker — a customizable space with to-do lists, notes, timers, shortcuts, and a daily quote to keep you going. Think of it as your school command center.</p><h2>How To content</h2><p>Browse our library of How To guides on the <a href="/how-to">How To page</a>. Find a checklist you want to follow? Add it straight to your locker with one tap.</p><h2>It''s free</h2><p>Everything on High School How To is free. No subscriptions, no paywalls. <a href="/auth/signup">Sign up</a> and get started today.</p>',
    now(), now()
);

INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'about-mission' AND t.slug = 'about';
--rollback DELETE FROM content_card_tags WHERE card_id = (SELECT id FROM content_cards WHERE slug = 'about-mission');
--rollback DELETE FROM content_cards WHERE slug = 'about-mission';

--changeset system:v5-content-seed-0054-help-welcome
INSERT INTO content_cards (slug, title, description, card_type, status, simple_layout, body_html, created_at, updated_at) VALUES (
    'help-welcome',
    'Welcome to Your Locker',
    'An overview of your locker and everything in it.',
    'ARTICLE',
    'PUBLISHED',
    TRUE,
    '<p>Your locker is your personal space on High School How To. Think of it like your phone''s home screen — you''ve got apps, shortcuts, and a daily quote to keep you going.</p><p>Here''s what you''ll find:</p><ul><li><strong>Apps</strong> — To-do lists, notes, and timers to help you stay on top of things</li><li><strong>Shortcuts</strong> — quick links to sites you use all the time</li><li><strong>A daily quote</strong> — because sometimes you just need a little motivation</li><li><strong>Stickers</strong> — decorate your locker and make it yours</li></ul><p>Everything is set up and ready to go when you first sign in. No setup required. Just open your locker and start using it.</p><p><strong>On your phone?</strong> Your locker works just like swiping between app pages. Swipe left and right to switch between your active apps.</p><p><strong>On a computer?</strong> You''ll see your home screen with app icons. Your active apps open side by side so you can multitask.</p>',
    now(), now()
);

INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'help-welcome' AND t.slug = 'help';
--rollback DELETE FROM content_card_tags WHERE card_id = (SELECT id FROM content_cards WHERE slug = 'help-welcome');
--rollback DELETE FROM content_cards WHERE slug = 'help-welcome';

--changeset system:v5-content-seed-0054-help-apps
INSERT INTO content_cards (slug, title, description, card_type, status, simple_layout, body_html, created_at, updated_at) VALUES (
    'help-apps',
    'Your Apps',
    'Overview of the three locker apps: To-do, Notes, and Timer.',
    'ARTICLE',
    'PUBLISHED',
    TRUE,
    '<p>You have three apps in your locker:</p><table><thead><tr><th>App</th><th>What it does</th></tr></thead><tbody><tr><td>📋 <strong>To-do</strong></td><td>Make lists, check things off, stay organized</td></tr><tr><td>📝 <strong>Notes</strong></td><td>Jot down anything — study notes, reminders, ideas</td></tr><tr><td>⏱ <strong>Timer</strong></td><td>Set a basic countdown or use Pomodoro mode for focused study sessions</td></tr></tbody></table><h3>Opening an app</h3><p>Tap an app icon on your home screen. That''s it.</p><p>If you have more than one app active, they''ll show up side by side on a computer, or as swipeable pages on your phone.</p><h3>Active vs. inactive</h3><p>You can have up to <strong>3 apps active</strong> at the same time. Active apps are the ones that show up when you''re working. Inactive apps are still there — they''re just tucked away until you need them.</p><p>To change which apps are active, check out <a href="/content/help-edit-mode">Edit Mode</a>.</p><h3>Inside an app</h3><p>Most apps hold multiple items. For example, the To-do app can hold up to 20 different lists.</p><p>When you open an app, you''ll see all your items listed. Tap one to open it. Hit the back arrow to go back to the list.</p><p>Your place is saved — if you switch to another app and come back, you''ll be right where you left off.</p>',
    now(), now()
);

INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'help-apps' AND t.slug = 'help';
--rollback DELETE FROM content_card_tags WHERE card_id = (SELECT id FROM content_cards WHERE slug = 'help-apps');
--rollback DELETE FROM content_cards WHERE slug = 'help-apps';

--changeset system:v5-content-seed-0054-help-todo
INSERT INTO content_cards (slug, title, description, card_type, status, simple_layout, body_html, created_at, updated_at) VALUES (
    'help-todo',
    'To-do Lists',
    'How to use the To-do app: creating lists, adding tasks, and importing How To checklists.',
    'ARTICLE',
    'PUBLISHED',
    TRUE,
    '<p>The To-do app is where you keep track of everything you need to get done.</p><h3>Creating a list</h3><ol><li>Open the 📋 To-do app</li><li>Tap <strong>+ New List</strong></li><li>Give it a name (or keep the default — you can rename it later)</li><li>Start adding tasks</li></ol><h3>Adding tasks</h3><p>Tap the <strong>+</strong> button at the bottom of your list. Type what you need to do, hit enter. Done.</p><h3>Checking things off</h3><p>Tap the checkbox next to a task. It feels good, trust us.</p><h3>Other things you can do</h3><ul><li><strong>Rename a list</strong> — tap the list title to edit it</li><li><strong>Reorder tasks</strong> — drag tasks up or down to prioritize</li><li><strong>Delete a task</strong> — swipe left on a task, or use the delete button</li><li><strong>Delete a list</strong> — look for the delete option in the list view (don''t worry, we''ll ask you to confirm first)</li><li><strong>Change the list color</strong> — pick a color to tell your lists apart at a glance</li></ul><h3>Importing a How To list</h3><p>Some How To articles come with a ready-made to-do list. When you see one, tap <strong>"Add to My Locker"</strong> and it''ll show up in your To-do app as a personal copy you can edit however you want.</p><h3>Limits</h3><p>You can have up to <strong>20 lists</strong>. If you hit the limit, try finishing or deleting one you don''t need anymore.</p>',
    now(), now()
);

INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'help-todo' AND t.slug = 'help';
--rollback DELETE FROM content_card_tags WHERE card_id = (SELECT id FROM content_cards WHERE slug = 'help-todo');
--rollback DELETE FROM content_cards WHERE slug = 'help-todo';

--changeset system:v5-content-seed-0054-help-notes
INSERT INTO content_cards (slug, title, description, card_type, status, simple_layout, body_html, created_at, updated_at) VALUES (
    'help-notes',
    'Notes',
    'How to use the Notes app to jot down ideas, reminders, and study summaries.',
    'ARTICLE',
    'PUBLISHED',
    TRUE,
    '<p>Need to write something down fast? That''s what Notes is for.</p><h3>Creating a note</h3><ol><li>Open the 📝 Notes app</li><li>Tap <strong>+ New Note</strong></li><li>Start typing</li></ol><h3>What you can do with notes</h3><ul><li><strong>Pick a color</strong> — color-code your notes so they''re easy to spot</li><li><strong>Rename</strong> — tap the title to change it</li><li><strong>Delete</strong> — done with a note? Delete it from the list view</li></ul><h3>Tips</h3><ul><li>Use notes for quick reminders, study summaries, or brain dumps before a test</li><li>Keep it short — if your note is turning into an essay, maybe it''s time to open a doc instead</li></ul><h3>Limits</h3><p>You can have up to <strong>20 notes</strong>.</p>',
    now(), now()
);

INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'help-notes' AND t.slug = 'help';
--rollback DELETE FROM content_card_tags WHERE card_id = (SELECT id FROM content_cards WHERE slug = 'help-notes');
--rollback DELETE FROM content_cards WHERE slug = 'help-notes';

--changeset system:v5-content-seed-0054-help-timer
INSERT INTO content_cards (slug, title, description, card_type, status, simple_layout, body_html, created_at, updated_at) VALUES (
    'help-timer',
    'Timer',
    'How to use Basic and Pomodoro timer modes for focused study sessions.',
    'ARTICLE',
    'PUBLISHED',
    TRUE,
    '<p>One timer, two modes. Open the ⏱ Timer app and pick the mode that fits what you''re doing.</p><h3>Basic Mode</h3><p>A simple countdown. Set the time, hit start, and you''ll get a notification when it''s done. Great for:</p><ul><li>Timed assignments</li><li>Quick breaks</li><li>"I''ll study for 30 more minutes" situations</li></ul><h3>Pomodoro Mode</h3><p>The Pomodoro technique breaks your work into focused chunks:</p><ol><li><strong>Work for 25 minutes</strong> (one "pomodoro")</li><li><strong>Take a 5-minute break</strong></li><li><strong>Repeat</strong></li><li>After 4 pomodoros, take a longer 15-30 minute break</li></ol><p>The timer handles all of this automatically. Just hit start and follow along.</p><p><strong>Why it works:</strong> Your brain stays fresher when you take regular breaks. It''s not about studying longer — it''s about studying smarter.</p><h3>Switching modes</h3><p>Tap the mode toggle at the top of the timer to switch between Basic and Pomodoro. You can switch anytime you''re not mid-countdown.</p>',
    now(), now()
);

INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'help-timer' AND t.slug = 'help';
--rollback DELETE FROM content_card_tags WHERE card_id = (SELECT id FROM content_cards WHERE slug = 'help-timer');
--rollback DELETE FROM content_cards WHERE slug = 'help-timer';

--changeset system:v5-content-seed-0054-help-shortcuts
INSERT INTO content_cards (slug, title, description, card_type, status, simple_layout, body_html, created_at, updated_at) VALUES (
    'help-shortcuts',
    'Shortcuts',
    'How to add and manage quick links to your most-used websites.',
    'ARTICLE',
    'PUBLISHED',
    TRUE,
    '<p>Shortcuts are quick links to websites you visit a lot — your school portal, Google Classroom, Canvas, whatever you need.</p><p>They live right on your locker home screen, so you''re always one tap away.</p><h3>Adding a shortcut</h3><ol><li>Enter <a href="/content/help-edit-mode">Edit Mode</a></li><li>Find the shortcuts section</li><li>Tap <strong>+ Add Shortcut</strong></li><li>Paste the URL and give it a name</li><li>Tap <strong>Done</strong> to save</li></ol><h3>Using a shortcut</h3><p>Just tap it. It opens in a new tab.</p><h3>Editing or deleting shortcuts</h3><p>Enter Edit Mode to rename, reorder, or delete your shortcuts.</p>',
    now(), now()
);

INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'help-shortcuts' AND t.slug = 'help';
--rollback DELETE FROM content_card_tags WHERE card_id = (SELECT id FROM content_cards WHERE slug = 'help-shortcuts');
--rollback DELETE FROM content_cards WHERE slug = 'help-shortcuts';

--changeset system:v5-content-seed-0054-help-edit-mode
INSERT INTO content_cards (slug, title, description, card_type, status, simple_layout, body_html, created_at, updated_at) VALUES (
    'help-edit-mode',
    'Edit Mode',
    'How to customize your locker: toggle apps, rearrange layout, pick a palette, and manage stickers.',
    'ARTICLE',
    'PUBLISHED',
    TRUE,
    '<p>Edit Mode is where you customize your locker. One place for everything.</p><h3>How to enter Edit Mode</h3><p>Tap the <strong>Customize</strong> button (pencil icon) on your home screen.</p><p>You''ll know you''re in Edit Mode because your app icons will start wiggling (yeah, like on an iPhone).</p><h3>What you can do in Edit Mode</h3><p><strong>Choose your active apps</strong></p><ul><li>Tap an app icon to toggle it on or off</li><li>A checkmark means it''s active</li><li>You can have up to 3 active at a time</li><li>Try to activate a 4th? It''ll give you a nudge to turn one off first</li></ul><p><strong>Rearrange your layout</strong></p><ul><li>Drag app panes to swap their positions</li><li>The layout auto-adjusts based on how many apps are active</li></ul><p><strong>Pick a color palette</strong></p><ul><li>Choose a theme that changes the look of all your apps at once</li><li>Options like Ocean, Sunset, Forest, and more</li><li>Each app gets its own color from the palette — coordinated but distinct</li></ul><p><strong>Manage stickers</strong></p><ul><li>Add new stickers to decorate your home screen</li><li>Drag them around to reposition</li><li>Tap to delete ones you don''t want</li></ul><p><strong>Manage shortcuts</strong></p><ul><li>Add, edit, reorder, or delete your quick links</li></ul><h3>Saving</h3><p>When you''re done, tap <strong>Done</strong>. Your changes save automatically.</p>',
    now(), now()
);

INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'help-edit-mode' AND t.slug = 'help';
--rollback DELETE FROM content_card_tags WHERE card_id = (SELECT id FROM content_cards WHERE slug = 'help-edit-mode');
--rollback DELETE FROM content_cards WHERE slug = 'help-edit-mode';

--changeset system:v5-content-seed-0054-help-stickers
INSERT INTO content_cards (slug, title, description, card_type, status, simple_layout, body_html, created_at, updated_at) VALUES (
    'help-stickers',
    'Stickers',
    'How to add and manage emoji stickers on your locker home screen.',
    'ARTICLE',
    'PUBLISHED',
    TRUE,
    '<p>Stickers are emoji decorations for your locker home screen. They don''t do anything functional — they''re just for fun.</p><h3>Adding stickers</h3><ol><li>Enter <a href="/content/help-edit-mode">Edit Mode</a></li><li>Pick a sticker from the sticker picker</li><li>It''ll appear on your home screen</li><li>Drag it wherever you want</li></ol><h3>Moving or deleting stickers</h3><p>Enter Edit Mode, then drag stickers to reposition or tap to remove them.</p><p>Stickers show up on your home screen on desktop and tablet. On mobile, they''re not visible since you go straight to your apps.</p>',
    now(), now()
);

INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'help-stickers' AND t.slug = 'help';
--rollback DELETE FROM content_card_tags WHERE card_id = (SELECT id FROM content_cards WHERE slug = 'help-stickers');
--rollback DELETE FROM content_cards WHERE slug = 'help-stickers';

--changeset system:v5-content-seed-0054-help-palettes
INSERT INTO content_cards (slug, title, description, card_type, status, simple_layout, body_html, created_at, updated_at) VALUES (
    'help-palettes',
    'Color Palettes',
    'How to change your locker color palette to customize the look of all your apps.',
    'ARTICLE',
    'PUBLISHED',
    TRUE,
    '<p>Palettes let you change the vibe of your whole locker with one choice.</p><h3>How it works</h3><p>Pick a palette, and each app automatically gets a color from that set. You don''t pick colors one by one — the palette handles it.</p><h3>Available palettes</h3><ul><li><strong>Ocean</strong> — cool blues and greens</li><li><strong>Sunset</strong> — warm corals and ambers</li><li><strong>Forest</strong> — earthy greens and browns</li><li><strong>Minimal</strong> — clean grays and neutrals</li></ul><h3>Changing your palette</h3><ol><li>Enter <a href="/content/help-edit-mode">Edit Mode</a></li><li>Look for the palette picker</li><li>Tap a palette to preview it</li><li>Tap <strong>Done</strong> to save</li></ol>',
    now(), now()
);

INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'help-palettes' AND t.slug = 'help';
--rollback DELETE FROM content_card_tags WHERE card_id = (SELECT id FROM content_cards WHERE slug = 'help-palettes');
--rollback DELETE FROM content_cards WHERE slug = 'help-palettes';

--changeset system:v5-content-seed-0054-help-mobile
INSERT INTO content_cards (slug, title, description, card_type, status, simple_layout, body_html, created_at, updated_at) VALUES (
    'help-mobile',
    'Using Your Locker on Mobile',
    'How the locker works on your phone: swipe navigation, app drawer, and what''s different from desktop.',
    'ARTICLE',
    'PUBLISHED',
    TRUE,
    '<p>Your locker is designed to work great on your phone.</p><h3>How it''s different from desktop</h3><ul><li><strong>No home screen</strong> — you go straight to your apps</li><li><strong>Swipe to switch</strong> — swipe left and right to move between your active apps</li><li><strong>Page dots</strong> — the dots at the bottom show which app you''re on and how many you have</li><li><strong>Shortcuts and quote</strong> — your shortcuts and daily quote show at the top of your first app page</li><li><strong>Stickers</strong> — not visible on mobile (they''re a desktop/tablet thing)</li></ul><h3>Adding or removing apps on mobile</h3><p>Swipe past your last active app to find the <strong>app drawer</strong>. From there, you can tap apps to activate them.</p><p>To deactivate an app, use the settings icon in the app header or the app drawer.</p><h3>Everything else works the same</h3><p>Creating lists, writing notes, setting timers — it all works exactly like it does on a computer. The screen is just smaller, so you see one app at a time instead of side by side.</p>',
    now(), now()
);

INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'help-mobile' AND t.slug = 'help';
--rollback DELETE FROM content_card_tags WHERE card_id = (SELECT id FROM content_cards WHERE slug = 'help-mobile');
--rollback DELETE FROM content_cards WHERE slug = 'help-mobile';

--changeset system:v5-content-seed-0054-help-content-import
INSERT INTO content_cards (slug, title, description, card_type, status, simple_layout, body_html, created_at, updated_at) VALUES (
    'help-content-import',
    'Getting Content into Your Locker',
    'How to import How To checklists directly into your To-do app.',
    'ARTICLE',
    'PUBLISHED',
    TRUE,
    '<p>Some articles on the How To page come with a ready-made to-do list — like "How to Study for Your Driver''s Test" with all the steps already laid out.</p><h3>How to add it</h3><ol><li>Find a How To article with a to-do list</li><li>Tap <strong>"Add to My Locker"</strong></li><li>A personal copy of that list shows up in your 📋 To-do app</li></ol><h3>What happens next</h3><p>The list is yours now. You can:</p><ul><li>Check off tasks as you go</li><li>Add your own tasks</li><li>Rename it</li><li>Delete tasks you don''t need</li></ul><p>The original How To article stays the same — your copy is independent.</p><h3>Already added it?</h3><p>If you''ve already added a list, you''ll see a <strong>"View in My Locker"</strong> link instead of the add button.</p>',
    now(), now()
);

INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'help-content-import' AND t.slug = 'help';
--rollback DELETE FROM content_card_tags WHERE card_id = (SELECT id FROM content_cards WHERE slug = 'help-content-import');
--rollback DELETE FROM content_cards WHERE slug = 'help-content-import';

--changeset system:v5-content-seed-0054-help-keyboard
INSERT INTO content_cards (slug, title, description, card_type, status, simple_layout, body_html, created_at, updated_at) VALUES (
    'help-keyboard',
    'Keyboard Shortcuts',
    'Desktop keyboard shortcuts for navigating and using your locker faster.',
    'ARTICLE',
    'PUBLISHED',
    TRUE,
    '<p>If you''re on a computer, these shortcuts can speed things up:</p><table><thead><tr><th>Shortcut</th><th>What it does</th></tr></thead><tbody><tr><td><code>E</code></td><td>Enter/exit Edit Mode</td></tr><tr><td><code>1</code> / <code>2</code> / <code>3</code></td><td>Switch to app pane 1, 2, or 3</td></tr><tr><td><code>H</code></td><td>Go back to home screen</td></tr><tr><td><code>N</code></td><td>Create new item in current app</td></tr><tr><td><code>Esc</code></td><td>Close current view / go back</td></tr></tbody></table><p><em>These shortcuts only work when you''re in the locker and not typing in a text field.</em></p>',
    now(), now()
);

INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'help-keyboard' AND t.slug = 'help';
--rollback DELETE FROM content_card_tags WHERE card_id = (SELECT id FROM content_cards WHERE slug = 'help-keyboard');
--rollback DELETE FROM content_cards WHERE slug = 'help-keyboard';

--changeset system:v5-content-seed-0054-help-support
INSERT INTO content_cards (slug, title, description, card_type, status, simple_layout, body_html, created_at, updated_at) VALUES (
    'help-support',
    'Need More Help?',
    'Troubleshooting tips and how to contact us if something isn''t working.',
    'ARTICLE',
    'PUBLISHED',
    TRUE,
    '<p>If something''s not working right or you have a question that''s not covered here:</p><ul><li><strong>Check for updates</strong> — we''re always adding new features and fixing things</li><li><strong>Clear your browser cache</strong> — sounds boring, but it fixes a surprising number of problems</li><li><strong>Try a different browser</strong> — we work best on Chrome, Firefox, Safari, and Edge</li><li><strong>Contact us</strong> — reach out and let us know what''s going on. We want to help.</li></ul><p>Your locker data is saved to your account, so you won''t lose anything by refreshing or switching devices. Sign in on any device and your stuff is right where you left it.</p>',
    now(), now()
);

INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'help-support' AND t.slug = 'help';
--rollback DELETE FROM content_card_tags WHERE card_id = (SELECT id FROM content_cards WHERE slug = 'help-support');
--rollback DELETE FROM content_cards WHERE slug = 'help-support';
