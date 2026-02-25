-- Migration: 001_initial_schema
-- Description: Creates the initial database schema for MobileApp
-- Created: 2026-02-25

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS "Users" (
    "Id"            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "Username"      VARCHAR(100) NOT NULL UNIQUE,
    "Email"         VARCHAR(255) NOT NULL UNIQUE,
    "PasswordHash"  VARCHAR(512) NOT NULL,
    "Role"          VARCHAR(50)  NOT NULL DEFAULT 'User',
    "CreatedAt"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "UpdatedAt"     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index on email for fast lookup during authentication
CREATE INDEX IF NOT EXISTS idx_users_email ON "Users" ("Email");
