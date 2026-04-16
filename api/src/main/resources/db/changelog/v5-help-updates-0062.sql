--liquibase formatted sql

-- Rewrite help-palettes to reflect the current Locker Color feature (preset palette picker was replaced)
--changeset system:v5-help-updates-0062-palettes
UPDATE content_cards
SET
    title       = 'Locker Color',
    description = 'How to customize your locker''s color scheme using the Locker Color picker.',
    body_html   = '<p>You can change the color of your locker and all its apps in one step using the <strong>Locker Color</strong> picker.</p><h3>How to change your locker color</h3><ol><li>Tap the <strong>Customize</strong> button (pencil icon ✏) on your locker home screen</li><li>Under <strong>Locker Color</strong>, pick any color from the swatch picker</li><li>Tap <strong>Done</strong> to save</li></ol><p>When you pick a color, your locker background updates to that color and each app pane automatically gets a coordinated accent color — no manual tweaking needed.</p><h3>Resetting to the default</h3><p>If you want to go back to the original look, tap <strong>Reset to default</strong> below the color picker. This restores the warm parchment default color.</p><h3>Tips</h3><ul><li>Cooler colors (blues, greens) give a calm, focused feel</li><li>Warmer colors (pinks, oranges) feel energetic and fun</li><li>Try something that matches your vibe — you can always reset it</li></ul>',
    updated_at  = now()
WHERE slug = 'help-palettes';
--rollback UPDATE content_cards SET title = 'Color Palettes', description = 'How to change your locker color palette to customize the look of all your apps.', body_html = '<p>Palettes let you change the vibe of your whole locker with one choice.</p>', updated_at = now() WHERE slug = 'help-palettes';

-- Rewrite help-shortcuts (Pins) to accurately reflect the current Pins app UI
--changeset system:v5-help-updates-0062-pins
UPDATE content_cards
SET
    title       = 'Pins',
    description = 'How to pin your favourite web locations (URLs) so they''re always one tap away.',
    body_html   = '<p>Pins are pinned web locations — URLs to websites you visit often, like your school portal, Google Classroom, Canvas, or anything else you need quick access to. They live in the 📌 Pins app <em>and</em> appear as quick-tap icons across the top of your locker home screen.</p><h3>How to add a Pin</h3><ol><li>Open the 📌 <strong>Pins</strong> app from your locker</li><li>Tap <strong>+ Add Pin</strong> at the bottom</li><li>Enter the URL (e.g. <code>https://classroom.google.com</code>)</li><li>Optionally enter a name so you know what it is at a glance</li><li>Tap <strong>Add</strong></li></ol><p>Your pin appears instantly in the list and on your home screen.</p><h3>Editing or deleting a Pin</h3><p>Each pin in the list has two action buttons:</p><ul><li><strong>✏ Edit</strong> — tap to update the URL or name</li><li><strong>✕ Delete</strong> — tap to remove the pin</li></ul><h3>Quick-adding from the home screen</h3><p>You can also tap the <strong>+</strong> button in the pins row on your home screen to add a new pin without opening the Pins app.</p><h3>Tips</h3><ul><li>Pin the sites you open every single day — saves searching or typing the URL</li><li>Give pins short, clear names so they''re easy to recognise at a glance</li></ul>',
    updated_at  = now()
WHERE slug = 'help-shortcuts';
--rollback UPDATE content_cards SET title = 'Shortcuts', description = 'How to add and manage quick links to your most-used websites.', updated_at = now() WHERE slug = 'help-shortcuts';
