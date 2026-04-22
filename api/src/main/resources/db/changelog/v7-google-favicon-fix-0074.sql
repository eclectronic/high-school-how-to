--liquibase formatted sql

--changeset ron:0074-v7-google-favicon-fix
-- Fix Google product favicons. The favicon service returns the generic G icon for Google-owned domains;
-- use ssl.gstatic.com product icons for known Google apps, local assets for Classroom/Scholar.
UPDATE recommended_shortcuts SET favicon_url = '/assets/favicons/google-classroom.png'                                                    WHERE url = 'https://classroom.google.com';
UPDATE recommended_shortcuts SET favicon_url = 'https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png'    WHERE url = 'https://drive.google.com';
UPDATE recommended_shortcuts SET favicon_url = 'https://ssl.gstatic.com/images/branding/product/2x/docs_2020q4_48dp.png'     WHERE url = 'https://docs.google.com';
UPDATE recommended_shortcuts SET favicon_url = 'https://ssl.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png'    WHERE url = 'https://mail.google.com';
UPDATE recommended_shortcuts SET favicon_url = 'https://ssl.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png' WHERE url = 'https://calendar.google.com';
UPDATE recommended_shortcuts SET favicon_url = '/assets/favicons/google-scholar.png'                                                       WHERE url = 'https://scholar.google.com';

-- Fix any user shortcuts that were added from Browse Pins with the same bad URLs
UPDATE shortcuts SET favicon_url = '/assets/favicons/google-classroom.png'                                                    WHERE favicon_url = 'https://www.google.com/s2/favicons?domain=classroom.google.com&sz=64';
UPDATE shortcuts SET favicon_url = 'https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png'    WHERE favicon_url = 'https://www.google.com/s2/favicons?domain=drive.google.com&sz=64';
UPDATE shortcuts SET favicon_url = 'https://ssl.gstatic.com/images/branding/product/2x/docs_2020q4_48dp.png'     WHERE favicon_url = 'https://www.google.com/s2/favicons?domain=docs.google.com&sz=64';
UPDATE shortcuts SET favicon_url = 'https://ssl.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png'    WHERE favicon_url = 'https://www.google.com/s2/favicons?domain=mail.google.com&sz=64';
UPDATE shortcuts SET favicon_url = 'https://ssl.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png' WHERE favicon_url = 'https://www.google.com/s2/favicons?domain=calendar.google.com&sz=64';
UPDATE shortcuts SET favicon_url = '/assets/favicons/google-scholar.png'                                                       WHERE favicon_url = 'https://www.google.com/s2/favicons?domain=scholar.google.com&sz=64';

--rollback UPDATE recommended_shortcuts SET favicon_url = 'https://www.google.com/s2/favicons?domain=classroom.google.com&sz=64' WHERE url = 'https://classroom.google.com';
--rollback UPDATE recommended_shortcuts SET favicon_url = 'https://www.google.com/s2/favicons?domain=drive.google.com&sz=64'     WHERE url = 'https://drive.google.com';
--rollback UPDATE recommended_shortcuts SET favicon_url = 'https://www.google.com/s2/favicons?domain=docs.google.com&sz=64'      WHERE url = 'https://docs.google.com';
--rollback UPDATE recommended_shortcuts SET favicon_url = 'https://www.google.com/s2/favicons?domain=mail.google.com&sz=64'      WHERE url = 'https://mail.google.com';
--rollback UPDATE recommended_shortcuts SET favicon_url = 'https://www.google.com/s2/favicons?domain=calendar.google.com&sz=64'  WHERE url = 'https://calendar.google.com';
--rollback UPDATE recommended_shortcuts SET favicon_url = 'https://www.google.com/s2/favicons?domain=scholar.google.com&sz=64'   WHERE url = 'https://scholar.google.com';
--rollback UPDATE shortcuts SET favicon_url = 'https://www.google.com/s2/favicons?domain=classroom.google.com&sz=64' WHERE favicon_url = '/assets/favicons/google-classroom.png'                                                    AND url LIKE '%classroom.google.com%';
--rollback UPDATE shortcuts SET favicon_url = 'https://www.google.com/s2/favicons?domain=drive.google.com&sz=64'     WHERE favicon_url = 'https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png'    AND url LIKE '%drive.google.com%';
--rollback UPDATE shortcuts SET favicon_url = 'https://www.google.com/s2/favicons?domain=docs.google.com&sz=64'      WHERE favicon_url = 'https://ssl.gstatic.com/images/branding/product/2x/docs_2020q4_48dp.png'     AND url LIKE '%docs.google.com%';
--rollback UPDATE shortcuts SET favicon_url = 'https://www.google.com/s2/favicons?domain=mail.google.com&sz=64'      WHERE favicon_url = 'https://ssl.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png'    AND url LIKE '%mail.google.com%';
--rollback UPDATE shortcuts SET favicon_url = 'https://www.google.com/s2/favicons?domain=calendar.google.com&sz=64'  WHERE favicon_url = 'https://ssl.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png' AND url LIKE '%calendar.google.com%';
--rollback UPDATE shortcuts SET favicon_url = 'https://www.google.com/s2/favicons?domain=scholar.google.com&sz=64'   WHERE favicon_url = '/assets/favicons/google-scholar.png'                                                       AND url LIKE '%scholar.google.com%';
