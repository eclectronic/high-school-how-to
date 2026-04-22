--liquibase formatted sql

--changeset ron:0075-v7-recommended-shortcuts-manual
-- Manual additions and removals to the recommended_shortcuts list.
-- Columns: name, url, emoji, favicon_url, category, sort_order
-- Categories currently in use: Google, Learning, Math & Science,
--   Writing & Citations, College & Career, Coding & STEM, Productivity

-- ── ADD ────────────────────────────────────────────────────────────────────
INSERT INTO recommended_shortcuts (name, url, emoji, favicon_url, category, sort_order) VALUES
    ('Outlook',          'https://outlook.cloud.microsoft/mail/',     '✉️', 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://outlook.cloud.microsoft/mail/&size=64',  'Microsoft', 10),
    ('Outlook Calendar', 'https://outlook.cloud.microsoft/calendar',  '📅', 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://outlook.cloud.microsoft/calendar&size=64', 'Microsoft', 20),
    ('Word',             'https://word.cloud.microsoft/',             '📝', 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://word.cloud.microsoft/&size=64',         'Microsoft', 30),
    ('Excel',            'https://excel.cloud.microsoft/',            '📊', 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://excel.cloud.microsoft/&size=64',        'Microsoft', 40),
    ('PowerPoint',       'https://powerpoint.cloud.microsoft/',       '📽️', 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://powerpoint.cloud.microsoft/&size=64',  'Microsoft', 45),
    ('OneNote',              'https://onenote.cloud.microsoft/',          '📓', 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://onenote.cloud.microsoft/&size=64',     'Microsoft', 47),
    ('OneDrive',             'https://onedrive.live.com',                 '☁️', 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://onedrive.live.com/&size=64',          'Microsoft', 50),
    ('GSheets',              'https://sheets.google.com',                 '📊', 'https://ssl.gstatic.com/images/branding/product/2x/sheets_2020q4_48dp.png',                                                                'Google',    35),
    ('GSlides',              'https://slides.google.com',                 '🎞️', 'https://ssl.gstatic.com/images/branding/product/2x/slides_2020q4_48dp.png',                                                                'Google',    37),
    ('GMeet',                'https://meet.google.com/',                  '📹', 'https://ssl.gstatic.com/images/branding/product/2x/meet_2020q4_48dp.png',                                                                  'Google',    45),
    ('Gemini',               'https://gemini.google.com/app',             '✨', 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://gemini.google.com/app&size=64',     'Google',    5),
    ('Copilot',              'https://copilot.microsoft.com/',            '🤖', 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://copilot.microsoft.com/&size=64',   'Microsoft', 5),
    ('Slack',                'https://slack.com/',                        '💬', 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://slack.com/&size=64',              'Communication', 10),
    ('Microsoft Teams',      'https://teams.microsoft.com/',              '👥', 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://teams.microsoft.com/&size=64',     'Communication', 20),
    ('Discord',              'https://discord.com/app',                   '🎮', 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://discord.com/app&size=64',          'Communication', 30),
    ('Zoom',                 'https://zoom.us/',                          '🎥', 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://zoom.us/&size=64',                  'Communication', 40),
    ('PowerSchool',          'https://www.powerschool.com/',              '🎒', 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.powerschool.com/&size=64',      'School',        10),
    ('Schoology',            'https://app.schoology.com/login',           '📘', 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://app.schoology.com/login&size=64',   'School',        20),
    ('iCloud',               'https://www.icloud.com/',                   '☁️', 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.icloud.com/&size=64',            'Apple',         10);

-- ── RENAME (seed 0073 entries: use short / G-prefix nicknames) ────────────
UPDATE recommended_shortcuts SET name = 'Classroom' WHERE name = 'Google Classroom';
UPDATE recommended_shortcuts SET name = 'GDrive'    WHERE name = 'Google Drive';
UPDATE recommended_shortcuts SET name = 'GDocs'     WHERE name = 'Google Docs';
UPDATE recommended_shortcuts SET name = 'GCal'      WHERE name = 'Google Calendar';
UPDATE recommended_shortcuts SET name = 'Scholar'   WHERE name = 'Google Scholar';

-- ── REMOVE ─────────────────────────────────────────────────────────────────
DELETE FROM recommended_shortcuts WHERE url IN (
    'https://www.khanacademy.org',
    'https://www.notion.so',
    'https://owl.purdue.edu',
    'https://www.desmos.com',
    'https://www.wolframalpha.com',
    'https://phet.colorado.edu',
    'https://www.symbolab.com',
    'https://code.org',
    'https://scratch.mit.edu',
    'https://www.codecademy.com',
    'https://github.com',
    'https://www.collegeboard.org',
    'https://www.commonapp.org',
    'https://www.khanacademy.org/sat',
    'https://student.naviance.com',
    'https://studentaid.gov'
);

--rollback DELETE FROM recommended_shortcuts WHERE url IN (
--rollback     'https://outlook.cloud.microsoft/mail/',
--rollback     'https://outlook.cloud.microsoft/calendar',
--rollback     'https://word.cloud.microsoft/',
--rollback     'https://excel.cloud.microsoft/',
--rollback     'https://powerpoint.cloud.microsoft/',
--rollback     'https://onenote.cloud.microsoft/',
--rollback     'https://onedrive.live.com',
--rollback     'https://sheets.google.com',
--rollback     'https://slides.google.com',
--rollback     'https://gemini.google.com/app',
--rollback     'https://copilot.microsoft.com/',
--rollback     'https://meet.google.com/',
--rollback     'https://slack.com/',
--rollback     'https://teams.microsoft.com/',
--rollback     'https://discord.com/app',
--rollback     'https://zoom.us/',
--rollback     'https://www.powerschool.com/',
--rollback     'https://app.schoology.com/login',
--rollback     'https://www.icloud.com/'
--rollback );
--rollback UPDATE recommended_shortcuts SET name = 'Google Classroom' WHERE name = 'Classroom';
--rollback UPDATE recommended_shortcuts SET name = 'Google Drive'     WHERE name = 'GDrive';
--rollback UPDATE recommended_shortcuts SET name = 'Google Docs'      WHERE name = 'GDocs';
--rollback UPDATE recommended_shortcuts SET name = 'Google Calendar'  WHERE name = 'GCal';
--rollback UPDATE recommended_shortcuts SET name = 'Google Scholar'   WHERE name = 'Scholar';
--rollback INSERT INTO recommended_shortcuts (name, url, emoji, favicon_url, category, sort_order) VALUES
--rollback     ('Khan Academy',          'https://www.khanacademy.org',     '📚',  'https://www.google.com/s2/favicons?domain=khanacademy.org&sz=64',     'Learning',            10),
--rollback     ('Notion',                'https://www.notion.so',           '📓',  'https://www.google.com/s2/favicons?domain=notion.so&sz=64',           'Productivity',        10),
--rollback     ('Purdue OWL',            'https://owl.purdue.edu',          '🦉',  'https://www.google.com/s2/favicons?domain=owl.purdue.edu&sz=64',      'Writing & Citations', 20),
--rollback     ('Desmos',                'https://www.desmos.com',          '📈',  'https://www.google.com/s2/favicons?domain=desmos.com&sz=64',          'Math & Science',      10),
--rollback     ('Wolfram Alpha',         'https://www.wolframalpha.com',    '🧮',  'https://www.google.com/s2/favicons?domain=wolframalpha.com&sz=64',    'Math & Science',      20),
--rollback     ('PhET Simulations',      'https://phet.colorado.edu',       '🧪',  'https://www.google.com/s2/favicons?domain=phet.colorado.edu&sz=64',   'Math & Science',      30),
--rollback     ('Symbolab',              'https://www.symbolab.com',        '➗',  'https://www.google.com/s2/favicons?domain=symbolab.com&sz=64',        'Math & Science',      40),
--rollback     ('Code.org',              'https://code.org',                '💻',  'https://www.google.com/s2/favicons?domain=code.org&sz=64',            'Coding & STEM',       10),
--rollback     ('Scratch',               'https://scratch.mit.edu',         '🐱',  'https://www.google.com/s2/favicons?domain=scratch.mit.edu&sz=64',     'Coding & STEM',       20),
--rollback     ('Codecademy',            'https://www.codecademy.com',      '👨‍💻', 'https://www.google.com/s2/favicons?domain=codecademy.com&sz=64',      'Coding & STEM',       30),
--rollback     ('GitHub',                'https://github.com',              '🐙',  'https://www.google.com/s2/favicons?domain=github.com&sz=64',          'Coding & STEM',       40),
--rollback     ('College Board',         'https://www.collegeboard.org',    '🏛️',  'https://www.google.com/s2/favicons?domain=collegeboard.org&sz=64',    'College & Career',    10),
--rollback     ('Common App',            'https://www.commonapp.org',       '🏫',  'https://www.google.com/s2/favicons?domain=commonapp.org&sz=64',       'College & Career',    20),
--rollback     ('Khan Academy SAT Prep', 'https://www.khanacademy.org/sat', '✏️',   'https://www.google.com/s2/favicons?domain=khanacademy.org&sz=64',     'College & Career',    30),
--rollback     ('Naviance',              'https://student.naviance.com',    '🧭',  'https://www.google.com/s2/favicons?domain=naviance.com&sz=64',        'College & Career',    40),
--rollback     ('FAFSA',                 'https://studentaid.gov',          '💰',  'https://www.google.com/s2/favicons?domain=studentaid.gov&sz=64',      'College & Career',    50);
