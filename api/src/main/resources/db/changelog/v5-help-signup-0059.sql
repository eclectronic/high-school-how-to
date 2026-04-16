--liquibase formatted sql

--changeset system:v5-help-signup-0059
INSERT INTO content_cards (slug, title, description, card_type, status, simple_layout, body_html, created_at, updated_at) VALUES (
    'help-signup',
    'Creating an Account',
    'How to sign up, verify your email, and troubleshoot common account issues.',
    'ARTICLE',
    'PUBLISHED',
    TRUE,
    '<h3>Creating your account</h3><ol><li>Go to the <a href="/auth/signup">Sign Up page</a></li><li>Enter your first name, last name, email address, and a password (minimum 12 characters)</li><li>Tap <strong>Create account</strong></li></ol><h3>Verifying your email</h3><p>After signing up, we''ll send a verification email to the address you provided. Click the link inside to activate your account — you won''t be able to log in until you do.</p><p>The email comes from <strong>admin@highschoolhowto.com</strong> with the subject: <strong>Verify your High School How To account</strong>.</p><p>If it doesn''t show up within a few minutes, check your junk or spam folder.</p><h3>Troubleshooting</h3><p><strong>Didn''t get the verification email?</strong></p><ul><li>Check your spam or junk folder for an email with subject <strong>Verify your High School How To account</strong></li><li>Make sure you signed up with the right email address</li><li>If it''s been more than 10 minutes and it''s not there, try signing up again</li></ul><p><strong>Can''t log in after verifying?</strong></p><ul><li>Double-check your email and password — passwords are case-sensitive</li><li>Try the <a href="/auth/forgot-password">Forgot password</a> link if you''re not sure of your password</li></ul><p><strong>Already have an account?</strong></p><ul><li>Go to the <a href="/auth/login">Login page</a> — no need to sign up again</li><li>If you''ve forgotten your password, use <a href="/auth/forgot-password">Forgot password</a> to reset it</li></ul>',
    now(), now()
);

INSERT INTO content_card_tags (card_id, tag_id, sort_order)
SELECT c.id, t.id, 0
FROM content_cards c, tags t
WHERE c.slug = 'help-signup' AND t.slug = 'help';
--rollback DELETE FROM content_card_tags WHERE card_id = (SELECT id FROM content_cards WHERE slug = 'help-signup');
--rollback DELETE FROM content_cards WHERE slug = 'help-signup';
