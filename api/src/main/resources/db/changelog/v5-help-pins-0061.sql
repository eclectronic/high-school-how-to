--liquibase formatted sql

-- Rename help-shortcuts article to "Pins" and rewrite content
--changeset system:v5-help-pins-0061-shortcuts
UPDATE content_cards
SET
    title       = 'Pins',
    description = 'How to pin your favourite web locations (URLs) so they''re always one tap away.',
    body_html   = '<p>Pins are pinned web locations — URLs to websites you visit often, like your school portal, Google Classroom, Canvas, or anything else you need fast access to. They live right on your locker so you''re always one tap away.</p><h3>How to add a Pin</h3><ol><li>Open the 📌 Pins app from your locker</li><li>Tap <strong>+ Add Pin</strong></li><li>Paste or type the URL (e.g. <code>https://classroom.google.com</code>)</li><li>Add a name so you know what it is — or leave it blank and we''ll use the site name</li><li>Tap <strong>Add</strong></li></ol><p>Your pin will appear instantly. Tap it any time to open the site in a new tab.</p><h3>Editing or deleting a Pin</h3><p>Each pin has an edit (✏) and delete (✕) button. Tap edit to change the URL or name. Tap delete to remove it.</p><h3>Pins on your home screen</h3><p>Your pins also appear as quick-tap icons at the top of your locker home screen, so you don''t even need to open the Pins app to use them.</p><h3>Tips</h3><ul><li>Pin the sites you open every single day — saves you searching or typing</li><li>Give pins short, clear names so they''re easy to recognise at a glance</li></ul>',
    updated_at  = now()
WHERE slug = 'help-shortcuts';
--rollback UPDATE content_cards SET title = 'Shortcuts', description = 'How to add and manage quick links to your most-used websites.', body_html = '<p>Shortcuts are quick links to websites you visit a lot — your school portal, Google Classroom, Canvas, whatever you need.</p><p>They live right on your locker home screen, so you''re always one tap away.</p><h3>Adding a shortcut</h3><ol><li>Enter <a href="/content/help-edit-mode">Edit Mode</a></li><li>Find the shortcuts section</li><li>Tap <strong>+ Add Shortcut</strong></li><li>Paste the URL and give it a name</li><li>Tap <strong>Done</strong> to save</li></ol><h3>Using a shortcut</h3><p>Just tap it. It opens in a new tab.</p><h3>Editing or deleting shortcuts</h3><p>Enter Edit Mode to rename, reorder, or delete your shortcuts.</p>', updated_at = now() WHERE slug = 'help-shortcuts';

-- Update edit-mode article: "Manage shortcuts" → "Manage Pins"
--changeset system:v5-help-pins-0061-editmode
UPDATE content_cards
SET
    body_html  = REPLACE(REPLACE(body_html, 'Manage shortcuts', 'Manage Pins'), 'manage shortcuts', 'manage Pins'),
    updated_at = now()
WHERE slug = 'help-edit-mode';
--rollback UPDATE content_cards SET body_html = REPLACE(body_html, 'Manage Pins', 'Manage shortcuts'), updated_at = now() WHERE slug = 'help-edit-mode';
