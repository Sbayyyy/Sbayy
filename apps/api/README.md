# Sbay API

Backend API server for the Sbay marketplace platform.

## Features

- 🔐 JWT Authentication
- 👥 User Management
- 🛍️ Product CRUD Operations
- 📂 Category Management
- 💬 Messaging System
- ⭐ Rating & Reviews
- 🔒 Security (Helmet, Rate Limiting)
- ✅ Input Validation

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `PORT` - Server port (default: 3001)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database configuration
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - JWT secrets
- `CORS_ORIGIN` - Allowed CORS origin

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users/me` - Get current user profile

### Products
- `GET /api/products` - Get all products (with pagination)
- `POST /api/products` - Create new product (authenticated)
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product (authenticated)
- `DELETE /api/products/:id` - Delete product (authenticated)

### Categories
- `GET /api/categories` - Get all categories

### Messages
- `GET /api/messages` - Get user messages (authenticated)

## Security

- Helmet.js for HTTP headers
- CORS configuration
- Rate limiting
- JWT authentication
- Password hashing with bcrypt
- Input validation

## Database Schema

TODO: Add database schema documentation

## License

MIT
