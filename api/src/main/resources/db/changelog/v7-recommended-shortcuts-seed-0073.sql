--liquibase formatted sql

--changeset ron:0073-v7-recommended-shortcuts-seed
INSERT INTO recommended_shortcuts (name, url, emoji, favicon_url, category, sort_order) VALUES
    -- Google
    ('Google Classroom', 'https://classroom.google.com', '🎓', 'https://www.google.com/s2/favicons?domain=classroom.google.com&sz=64', 'Google', 10),
    ('Google Drive',     'https://drive.google.com',     '📁', 'https://www.google.com/s2/favicons?domain=drive.google.com&sz=64',     'Google', 20),
    ('Google Docs',      'https://docs.google.com',      '📄', 'https://www.google.com/s2/favicons?domain=docs.google.com&sz=64',      'Google', 30),
    ('Gmail',            'https://mail.google.com',      '✉️', 'https://www.google.com/s2/favicons?domain=mail.google.com&sz=64',      'Google', 40),
    ('Google Calendar',  'https://calendar.google.com',  '📅', 'https://www.google.com/s2/favicons?domain=calendar.google.com&sz=64',  'Google', 50),
    ('Google Scholar',   'https://scholar.google.com',   '🔬', 'https://www.google.com/s2/favicons?domain=scholar.google.com&sz=64',   'Google', 60),

    -- Learning
    ('Khan Academy', 'https://www.khanacademy.org', '📚', 'https://www.google.com/s2/favicons?domain=khanacademy.org&sz=64', 'Learning', 10),
    ('Quizlet',      'https://quizlet.com',         '🗂️', 'https://www.google.com/s2/favicons?domain=quizlet.com&sz=64',     'Learning', 20),

    -- Math & Science
    ('Desmos',            'https://www.desmos.com',       '📈', 'https://www.google.com/s2/favicons?domain=desmos.com&sz=64',         'Math & Science', 10),
    ('Wolfram Alpha',     'https://www.wolframalpha.com', '🧮', 'https://www.google.com/s2/favicons?domain=wolframalpha.com&sz=64',   'Math & Science', 20),
    ('PhET Simulations',  'https://phet.colorado.edu',    '🧪', 'https://www.google.com/s2/favicons?domain=phet.colorado.edu&sz=64',  'Math & Science', 30),
    ('Symbolab',          'https://www.symbolab.com',     '➗', 'https://www.google.com/s2/favicons?domain=symbolab.com&sz=64',       'Math & Science', 40),

    -- Writing & Citations
    ('Grammarly',        'https://www.grammarly.com',       '✍️', 'https://www.google.com/s2/favicons?domain=grammarly.com&sz=64',       'Writing & Citations', 10),
    ('Purdue OWL',       'https://owl.purdue.edu',          '🦉', 'https://www.google.com/s2/favicons?domain=owl.purdue.edu&sz=64',      'Writing & Citations', 20),
    ('EasyBib',          'https://www.easybib.com',         '📖', 'https://www.google.com/s2/favicons?domain=easybib.com&sz=64',         'Writing & Citations', 30),
    ('Citation Machine', 'https://www.citationmachine.net', '📝', 'https://www.google.com/s2/favicons?domain=citationmachine.net&sz=64', 'Writing & Citations', 40),

    -- College & Career
    ('College Board',         'https://www.collegeboard.org',    '🏛️', 'https://www.google.com/s2/favicons?domain=collegeboard.org&sz=64',  'College & Career', 10),
    ('Common App',            'https://www.commonapp.org',       '🏫', 'https://www.google.com/s2/favicons?domain=commonapp.org&sz=64',     'College & Career', 20),
    ('Khan Academy SAT Prep', 'https://www.khanacademy.org/sat', '✏️', 'https://www.google.com/s2/favicons?domain=khanacademy.org&sz=64',   'College & Career', 30),
    ('Naviance',              'https://student.naviance.com',    '🧭', 'https://www.google.com/s2/favicons?domain=naviance.com&sz=64',      'College & Career', 40),
    ('FAFSA',                 'https://studentaid.gov',          '💰', 'https://www.google.com/s2/favicons?domain=studentaid.gov&sz=64',    'College & Career', 50),

    -- Coding & STEM
    ('Code.org',   'https://code.org',           '💻', 'https://www.google.com/s2/favicons?domain=code.org&sz=64',         'Coding & STEM', 10),
    ('Scratch',    'https://scratch.mit.edu',    '🐱', 'https://www.google.com/s2/favicons?domain=scratch.mit.edu&sz=64',  'Coding & STEM', 20),
    ('Codecademy', 'https://www.codecademy.com', '👨‍💻', 'https://www.google.com/s2/favicons?domain=codecademy.com&sz=64',   'Coding & STEM', 30),
    ('GitHub',     'https://github.com',         '🐙', 'https://www.google.com/s2/favicons?domain=github.com&sz=64',       'Coding & STEM', 40),

    -- Productivity
    ('Notion',        'https://www.notion.so', '📓', 'https://www.google.com/s2/favicons?domain=notion.so&sz=64',  'Productivity', 10),
    ('Canva',         'https://www.canva.com', '🎨', 'https://www.google.com/s2/favicons?domain=canva.com&sz=64',  'Productivity', 20),
    ('Microsoft 365', 'https://www.office.com', '💼', 'https://www.google.com/s2/favicons?domain=office.com&sz=64', 'Productivity', 30);

--rollback DELETE FROM recommended_shortcuts WHERE url IN (
--rollback     'https://classroom.google.com','https://drive.google.com','https://docs.google.com',
--rollback     'https://mail.google.com','https://calendar.google.com','https://scholar.google.com',
--rollback     'https://www.khanacademy.org','https://quizlet.com',
--rollback     'https://www.desmos.com','https://www.wolframalpha.com','https://phet.colorado.edu','https://www.symbolab.com',
--rollback     'https://www.grammarly.com','https://owl.purdue.edu','https://www.easybib.com','https://www.citationmachine.net',
--rollback     'https://www.collegeboard.org','https://www.commonapp.org','https://www.khanacademy.org/sat',
--rollback     'https://student.naviance.com','https://studentaid.gov',
--rollback     'https://code.org','https://scratch.mit.edu','https://www.codecademy.com','https://github.com',
--rollback     'https://www.notion.so','https://www.canva.com','https://www.office.com'
--rollback );