--liquibase formatted sql

--changeset system:v5-about-mission-link-0060
UPDATE content_cards
SET
    body_html  = '<p>HighSchoolHowTo serves as a busy student bulletin board, helping you stay stress-free by keeping things streamlined and convenient. You no longer have to open a million apps just to stay organized, because our web page keeps every tool a student needs to stay organized all in one convenient place. You can also pin our infographics, animated videos, and guides that cover everything from academics to fun. High school doesn''t have to be scary — we''re here to help! <a href="/auth/signup">Create an account</a> and login to lock in today!</p>',
    updated_at = now()
WHERE slug = 'about-mission';
--rollback UPDATE content_cards SET body_html = '<p>HighSchoolHowTo serves as a busy student bulletin board, helping you stay stress-free by keeping things streamlined and convenient. You no longer have to open a million apps just to stay organized, because our web page keeps every tool a student needs to stay organized all in one convenient place. You can also pin our infographics, animated videos, and guides that cover everything from academics to fun. High school doesn''t have to be scary — we''re here to help!</p>', updated_at = now() WHERE slug = 'about-mission';
