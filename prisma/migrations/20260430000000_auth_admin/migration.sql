-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'VIP', 'ADMIN');

-- CreateEnum
CREATE TYPE "RegistrationMode" AS ENUM ('OPEN', 'INVITE', 'CLOSED');

-- CreateEnum
CREATE TYPE "ProviderScope" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('DAILY_ROAST', 'DAILY_TASK');

-- AlterTable
ALTER TABLE "CheckIn" ADD COLUMN "userId" TEXT;

-- AlterTable
ALTER TABLE "AiReflection" ADD COLUMN "userId" TEXT;

-- DropIndex
DROP INDEX IF EXISTS "CheckIn_dateKey_key";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderConfig" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "scope" "ProviderScope" NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "chatUrl" TEXT NOT NULL,
    "modelsUrl" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT,
    "apiKeyHint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrotherPersona" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mbti" TEXT,
    "description" TEXT NOT NULL,
    "catchphrase" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrotherPersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "content" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderConfig_configKey_key" ON "ProviderConfig"("configKey");

-- CreateIndex
CREATE INDEX "ProviderConfig_scope_idx" ON "ProviderConfig"("scope");

-- CreateIndex
CREATE INDEX "ProviderConfig_userId_idx" ON "ProviderConfig"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");

-- CreateIndex
CREATE INDEX "ContentItem_type_enabled_idx" ON "ContentItem"("type", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_userId_dateKey_key" ON "CheckIn"("userId", "dateKey");

-- CreateIndex
CREATE INDEX "CheckIn_dateKey_idx" ON "CheckIn"("dateKey");

-- CreateIndex
CREATE INDEX "AiReflection_userId_idx" ON "AiReflection"("userId");

-- CreateIndex
CREATE INDEX "AiReflection_createdAt_idx" ON "AiReflection"("createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderConfig" ADD CONSTRAINT "ProviderConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiReflection" ADD CONSTRAINT "AiReflection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
