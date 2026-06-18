-- Seed: 001_seed_users
-- Description: Inserts default admin and test users
-- NOTE: PasswordHash values below are bcrypt hashes. Replace before production use.
-- Password for both: 'Admin1234!'

INSERT INTO "Users" ("Id", "Username", "Email", "PasswordHash", "Role", "CreatedAt", "UpdatedAt")
VALUES
    (
        uuid_generate_v4(),
        'admin',
        'admin@mobileapp.com',
        '$2a$11$exampleHashForAdminReplaceBeforeProduction000000000000',
        'Admin',
        NOW(),
        NOW()
    ),
    (
        uuid_generate_v4(),
        'testuser',
        'test@mobileapp.com',
        '$2a$11$exampleHashForTestUserReplaceBeforeProduction00000000',
        'User',
        NOW(),
        NOW()
    )
ON CONFLICT ("Email") DO NOTHING;
