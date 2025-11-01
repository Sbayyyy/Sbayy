# Sbay Web Application

Next.js-based web application for the Sbay marketplace platform.

## Features

- 🎨 Modern UI with Tailwind CSS
- 🌍 Arabic language support (RTL)
- 📱 Responsive design
- ⚡ Server-Side Rendering
- 🔄 Data fetching with React Query
- 🎯 Type-safe with TypeScript

## Getting Started

### Prerequisites

- Node.js 18+

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Configure:
- `NEXT_PUBLIC_API_URL` - API backend URL

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── pages/              # Next.js pages
│   ├── index.tsx       # Home page
│   ├── _app.tsx        # App wrapper
│   └── _document.tsx   # HTML document
├── components/         # React components
├── styles/            # Global styles
│   └── globals.css    # Tailwind CSS
└── lib/               # Utility functions
```

## Pages

- `/` - Home page
- `/categories` - Browse categories
- `/products` - Browse products
- `/product/:id` - Product details
- `/sell` - Create new listing
- `/login` - User login
- `/register` - User registration
- `/profile` - User profile
- `/messages` - User messages

## Styling

This project uses Tailwind CSS with custom configuration for:
- RTL support for Arabic
- Custom color scheme
- Responsive breakpoints
- Custom utility classes

## Internationalization

- Default language: Arabic (RTL)
- Supported languages: Arabic, English
- Next.js i18n built-in support

## License

MIT
