# Sbay E-Commerce Platform - Project Instructions

## Project Overview
Sbay is an eBay-like marketplace platform specifically designed for Syria. It's a full-stack monorepo application with web, mobile, and API components.

## Tech Stack
- **Frontend Web**: Next.js 14+, React, TypeScript, Tailwind CSS
- **Backend API**: Node.js, Express, TypeScript, PostgreSQL
- **Mobile App**: React Native, Expo
- **Monorepo**: npm workspaces
- **Database**: PostgreSQL
- **Authentication**: JWT tokens
- **Languages**: Arabic (RTL) & English

## Project Structure
- `apps/web` - Next.js web application
- `apps/api` - Express backend API
- `apps/mobile` - React Native mobile app
- `packages/shared` - Shared types, utilities, and components

## Development Guidelines
- Use TypeScript for all code
- Follow ESLint and Prettier rules
- Write secure code (input validation, JWT, rate limiting)
- Support RTL for Arabic language
- Use environment variables for configuration
- Write clear commit messages
- Add JSDoc comments for public APIs
