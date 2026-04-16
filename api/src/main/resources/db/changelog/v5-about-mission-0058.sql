--liquibase formatted sql

--changeset system:v5-about-mission-0058
UPDATE content_cards
SET
    description = 'HighSchoolHowTo serves as a busy student bulletin board, helping you stay stress-free by keeping things streamlined and convenient.',
    body_html   = '<p>HighSchoolHowTo serves as a busy student bulletin board, helping you stay stress-free by keeping things streamlined and convenient. You no longer have to open a million apps just to stay organized, because our web page keeps every tool a student needs to stay organized all in one convenient place. You can also pin our infographics, animated videos, and guides that cover everything from academics to fun. High school doesn''t have to be scary — we''re here to help! <a href="/auth/signup">Create an account</a> and login to lock in today!</p>',
    updated_at  = now()
WHERE slug = 'about-mission';
--rollback UPDATE content_cards SET description = 'High School How To is an educational platform helping students navigate, organize, and thrive in high school.', body_html = '<h2>What is High School How To?</h2><p>High School How To is a free educational platform built for high school students. We make guides, videos, and infographics that cover the things school doesn''t always teach you — from calculating your GPA to styling your look to building better study habits.</p><h2>Your Locker</h2><p>Once you sign up, you get your own personal locker — a customizable space with to-do lists, notes, timers, shortcuts, and a daily quote to keep you going. Think of it as your school command center.</p><h2>How To content</h2><p>Browse our library of How To guides on the <a href="/how-to">How To page</a>. Find a checklist you want to follow? Add it straight to your locker with one tap.</p><h2>It''s free</h2><p>Everything on High School How To is free. No subscriptions, no paywalls. <a href="/auth/signup">Sign up</a> and get started today.</p>', updated_at = now() WHERE slug = 'about-mission';
