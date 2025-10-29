# 🚀 Sbay Setup & Quick Start Guide

## ✅ Was wurde erstellt?

Dein komplettes **Sbay E-Commerce Projekt** ist jetzt fertig! 

### 📦 Projektstruktur:

```
Sbay/
├── apps/
│   ├── api/          ✅ Backend API (Express + TypeScript + PostgreSQL)
│   ├── web/          ✅ Web App (Next.js 14 + React + Tailwind)
│   └── mobile/       ✅ Mobile App (React Native + Expo)
├── packages/
│   └── shared/       ✅ Gemeinsame Types & Utils
├── docker-compose.yml ✅ Docker Konfiguration
└── README.md         ✅ Dokumentation
```

### 🛠️ Technologien:

- **Backend**: Node.js, Express, TypeScript, PostgreSQL, JWT Auth
- **Frontend**: Next.js 14, React, Tailwind CSS, React Query
- **Mobile**: React Native, Expo
- **Security**: Helmet, Rate Limiting, bcrypt, JWT
- **Database**: PostgreSQL mit komplettem Schema
- **DevOps**: Docker, Docker Compose

---

## 🚀 SCHNELLSTART (3 Optionen)

### Option 1: Mit Docker (EMPFOHLEN) 🐳

```powershell
# 1. Starte alle Services mit Docker
docker-compose up -d

# Fertig! 
# - Web: http://localhost:3000
# - API: http://localhost:3001
# - PostgreSQL: localhost:5432
```

### Option 2: Lokal (ohne Docker)

```powershell
# 1. PostgreSQL installieren und starten
# Download: https://www.postgresql.org/download/windows/

# 2. Datenbank erstellen
psql -U postgres
CREATE DATABASE sbay;
\q

# 3. Environment Files kopieren
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 4. .env Dateien bearbeiten mit deinen DB-Credentials

# 5. Alle Apps starten
npm run dev

# Oder einzeln:
npm run dev:api    # API: http://localhost:3001
npm run dev:web    # Web: http://localhost:3000
```

### Option 3: Nur bestimmte Teile

```powershell
# Nur Backend API
cd apps/api
npm run dev

# Nur Web Frontend
cd apps/web
npm run dev

# Nur Mobile App
cd apps/mobile
npm run dev
```

---

## 📋 Nächste Schritte

### 1. Environment Variables setzen

**apps/api/.env:**
```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sbay
DB_USER=postgres
DB_PASSWORD=DEIN_PASSWORD

JWT_SECRET=ÄNDERE_DIES_IN_PRODUKTION
JWT_REFRESH_SECRET=ÄNDERE_DIES_AUCH
```

**apps/web/.env.local:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 2. Datenbank Schema initialisieren

```powershell
# Mit PostgreSQL Client
psql -U postgres -d sbay -f apps/api/src/db/schema.sql

# Oder über Docker
docker exec -i sbay-postgres psql -U postgres -d sbay < apps/api/src/db/schema.sql
```

### 3. API testen

```powershell
# Health Check
curl http://localhost:3001/health

# Kategorien abrufen
curl http://localhost:3001/api/categories

# Produkte abrufen
curl http://localhost:3001/api/products
```

---

## 🎯 Features & Routen

### API Endpoints (`/api/*`)

- **Auth**:
  - `POST /auth/register` - Registrierung
  - `POST /auth/login` - Login
  
- **Users**:
  - `GET /users/me` - Eigenes Profil (Auth required)
  
- **Products**:
  - `GET /products` - Alle Produkte (mit Pagination)
  - `POST /products` - Neues Produkt (Auth required)
  
- **Categories**:
  - `GET /categories` - Alle Kategorien
  
- **Messages**:
  - `GET /messages` - Nachrichten (Auth required)

### Web Pages

- `/` - Homepage
- `/login` - Login
- `/register` - Registrierung
- `/products` - Produktliste
- `/categories` - Kategorien
- `/sell` - Neues Produkt erstellen
- `/profile` - Benutzerprofil

---

## 📱 Mobile App starten

```powershell
cd apps/mobile

# Expo Server starten
npm run dev

# Dann:
# - Für iOS: 'i' drücken
# - Für Android: 'a' drücken
# - Für Web: 'w' drücken
# - QR-Code scannen mit Expo Go App
```

---

## 🔧 Entwicklung

### Nützliche Commands

```powershell
# Alle Apps bauen
npm run build

# TypeScript prüfen
npm run type-check

# Code formatieren
npm run format

# Linting
npm run lint

# Docker Services
npm run docker:up      # Services starten
npm run docker:down    # Services stoppen
```

### Workspace Commands

```powershell
# Nur API
npm run dev --workspace=apps/api
npm run build --workspace=apps/api

# Nur Web
npm run dev --workspace=apps/web
npm run build --workspace=apps/web

# Shared Package
npm run build --workspace=packages/shared
```

---

## 🔒 Sicherheit

Das Projekt enthält bereits:

- ✅ JWT Authentication mit Refresh Tokens
- ✅ Password Hashing (bcrypt)
- ✅ Helmet.js für HTTP Headers
- ✅ Rate Limiting
- ✅ Input Validation
- ✅ CORS Configuration
- ✅ SQL Injection Protection (Prepared Statements)

**⚠️ WICHTIG für Production:**
1. Ändere alle Secrets in `.env` Files!
2. Verwende HTTPS/SSL
3. Setze starke Passwörter
4. Aktiviere PostgreSQL Authentication

---

## 📚 Datenbank Schema

Bereits erstellt:
- ✅ `users` - Benutzer
- ✅ `categories` - Kategorien (mit Beispieldaten)
- ✅ `products` - Produkte
- ✅ `product_images` - Produktbilder
- ✅ `messages` - Nachrichten
- ✅ `reviews` - Bewertungen
- ✅ `favorites` - Favoriten

---

## 🐛 Troubleshooting

### Port bereits belegt?

```powershell
# Andere Ports in .env setzen:
# apps/api/.env
PORT=3002

# apps/web/.env.local  
# (Next.js Port über package.json script)
```

### PostgreSQL Connection Error?

```powershell
# 1. Check ob PostgreSQL läuft
docker ps  # Mit Docker
# oder
services.msc  # Windows Services

# 2. Check Credentials in apps/api/.env
# 3. Check ob Datenbank existiert
psql -U postgres -l
```

### Module not found?

```powershell
# Dependencies neu installieren
rm -rf node_modules
rm package-lock.json
npm install
```

---

## 📖 Weitere Dokumentation

- [Haupt-README](./README.md)
- [API Dokumentation](./apps/api/README.md)
- [Web App Dokumentation](./apps/web/README.md)
- [Mobile App Dokumentation](./apps/mobile/README.md)

---

## 🎉 Du bist fertig!

Dein vollständiges E-Commerce-Projekt ist bereit für die Entwicklung!

**Nächster Schritt**: Starte mit `npm run dev` oder `docker-compose up` 🚀

Bei Fragen oder Problemen, schau in die README-Dateien oder die Code-Kommentare!

---

**Made with ❤️ for Syria | صنع بحب لسوريا**
