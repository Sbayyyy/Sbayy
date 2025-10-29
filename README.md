# 🛍️ Sbay - سباي

> منصة تجارة إلكترونية مثل eBay مصممة خصيصاً لسوريا
> 
> An eBay-like marketplace platform specifically designed for Syria

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)

## 📋 المحتويات | Contents

- [نظرة عامة](#نظرة-عامة--overview)
- [التقنيات المستخدمة](#التقنيات-المستخدمة--tech-stack)
- [البنية المعمارية](#البنية-المعمارية--architecture)
- [البدء السريع](#البدء-السريع--quick-start)
- [التطوير](#التطوير--development)
- [النشر](#النشر--deployment)

## 🎯 نظرة عامة | Overview

**Sbay** is a comprehensive e-commerce marketplace platform designed specifically for the Syrian market. It provides a modern, secure, and user-friendly platform for buying and selling products online, similar to eBay.

**سباي** هي منصة تجارة إلكترونية شاملة مصممة خصيصاً للسوق السوري. توفر منصة حديثة وآمنة وسهلة الاستخدام لبيع وشراء المنتجات عبر الإنترنت.

### ✨ الميزات الرئيسية | Key Features

- 🔐 **نظام مصادقة آمن** | Secure authentication with JWT
- 🛒 **إدارة المنتجات** | Product listing and management
- 🔍 **بحث متقدم** | Advanced search and filtering
- 💬 **نظام المراسلة** | Buyer-seller messaging system
- ⭐ **نظام التقييمات** | Rating and review system
- 🌍 **دعم اللغة العربية** | Full Arabic language support (RTL)
- 📱 **تطبيق موبايل** | Native mobile applications
- 💳 **طرق دفع متعددة** | Multiple payment methods

## 🚀 التقنيات المستخدمة | Tech Stack

### Frontend
- **Next.js 14+** - React framework with SSR
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Query** - Data fetching
- **Zustand** - State management

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Helmet** - Security middleware
- **Express Rate Limit** - Rate limiting

### Mobile
- **React Native** - Mobile framework
- **Expo** - Development platform

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **npm Workspaces** - Monorepo management

## 🏗️ البنية المعمارية | Architecture

```
sbay/
├── apps/
│   ├── web/          # Next.js web application
│   ├── api/          # Express backend API
│   └── mobile/       # React Native mobile app
├── packages/
│   └── shared/       # Shared types, utilities, and components
├── .github/          # GitHub configuration
└── docker-compose.yml
```

## ⚡ البدء السريع | Quick Start

### المتطلبات | Prerequisites

- **Node.js** 18+ and npm 9+
- **PostgreSQL** 14+ (or use Docker)
- **Docker** and **Docker Compose** (optional but recommended)

### 1️⃣ التثبيت | Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/sbay.git
cd sbay

# Install dependencies
npm install
```

### 2️⃣ إعداد البيئة | Environment Setup

```bash
# Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Edit the .env files with your configuration
```

### 3️⃣ قاعدة البيانات | Database Setup

#### مع Docker | With Docker:
```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis
```

#### بدون Docker | Without Docker:
- Install PostgreSQL locally
- Create a database named `sbay`
- Update the database connection in `apps/api/.env`

### 4️⃣ تشغيل التطبيق | Run the Application

```bash
# Run all applications in development mode
npm run dev

# Or run individually:
npm run dev:api    # API server on http://localhost:3001
npm run dev:web    # Web app on http://localhost:3000
```

### 5️⃣ مع Docker Compose | With Docker Compose:

```bash
# Start all services
docker-compose up

# Or in detached mode
docker-compose up -d
```

## 💻 التطوير | Development

### Scripts

```bash
# Development
npm run dev              # Run all apps in dev mode
npm run dev:web          # Run web app only
npm run dev:api          # Run API server only
npm run dev:mobile       # Run mobile app only

# Build
npm run build            # Build all apps
npm run build:web        # Build web app
npm run build:api        # Build API

# Type checking
npm run type-check       # Check TypeScript types

# Linting
npm run lint             # Lint all code
npm run format           # Format code with Prettier

# Docker
npm run docker:up        # Start Docker services
npm run docker:down      # Stop Docker services
```

### Project Structure

#### API (`apps/api/`)
```
apps/api/
├── src/
│   ├── index.ts          # Entry point
│   ├── routes/           # API routes
│   │   ├── auth.ts
│   │   ├── products.ts
│   │   ├── users.ts
│   │   ├── categories.ts
│   │   └── messages.ts
│   └── middleware/       # Custom middleware
│       ├── auth.ts
│       └── errorHandler.ts
├── .env.example
└── package.json
```

#### Web (`apps/web/`)
```
apps/web/
├── src/
│   ├── pages/            # Next.js pages
│   │   ├── index.tsx
│   │   ├── _app.tsx
│   │   └── _document.tsx
│   ├── components/       # React components
│   └── styles/           # Global styles
├── .env.example
└── package.json
```

## 🔒 الأمان | Security

- ✅ JWT authentication with refresh tokens
- ✅ Password hashing with bcrypt
- ✅ Helmet.js for HTTP headers security
- ✅ Rate limiting to prevent abuse
- ✅ Input validation with express-validator
- ✅ CORS configuration
- ✅ Environment variables for sensitive data

## 🚢 النشر | Deployment

### Docker Deployment

```bash
# Build and run production containers
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

```bash
# Build all apps
npm run build

# Run API in production
cd apps/api && npm start

# Run Web in production
cd apps/web && npm start
```

## 📱 تطبيق الموبايل | Mobile App

```bash
# Navigate to mobile app
cd apps/mobile

# Install dependencies
npm install

# Start Expo
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## 🤝 المساهمة | Contributing

Contributions are welcome! Please read our contributing guidelines first.

## 📄 الترخيص | License

This project is licensed under the MIT License.

## 👥 الفريق | Team

- **Your Name** - Project Lead

## 📞 التواصل | Contact

- **Email**: your.email@example.com
- **Website**: https://sbay.sy
- **GitHub**: https://github.com/yourusername/sbay

---

Made with ❤️ for Syria | صنع بحب لسوريا
