# Kharji / خرجی

A beautiful, bilingual expense tracker built with Next.js. Track your personal expenses in both Toman and USD with real-time exchange rates.

## Features

- 💰 **Dual Currency Support** - Track expenses in both Iranian Toman and USD
- 📊 **Rich Visualizations** - Interactive charts showing spending by category and daily trends
- 🌐 **Real-time Exchange Rates** - Automatic fetching from Navasan API with 24-hour caching
- 🌙 **Dark Mode** - Beautiful dark theme support
- 🌍 **Bilingual Interface** - Full support for English and Persian (Farsi)
- 📱 **Responsive Design** - Works perfectly on mobile and desktop
- ✏️ **Full CRUD Operations** - Add, edit, and delete expenses with ease
- 📈 **Statistics Dashboard** - Total expenses, transaction count, and average daily spending

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** Turso (libSQL)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Fonts:** Geist Sans & Vazirmatn (Persian)

## Getting Started

1. Clone the repository:
```bash
git clone <repository-url>
cd expense-tracker
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
# Create .env.local file with:
TURSO_DATABASE_URL=your_turso_database_url
TURSO_AUTH_TOKEN=your_turso_auth_token
NAVASAN_API_KEY=your_navasan_api_key  # Optional, uses free tier if not provided
```

4. Run database migrations:
```bash
pnpm migrate
```

5. Start the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── expenses/        # CRUD API routes for expenses
│   │   └── exchange-rate/   # Exchange rate fetching with caching
│   ├── layout.tsx           # Root layout with fonts and metadata
│   ├── page.tsx             # Main page component
│   └── globals.css          # Global styles
├── components/
│   ├── expense-form.tsx     # Form for adding/editing expenses
│   ├── expense-list.tsx     # Table displaying all expenses
│   ├── expense-stats.tsx    # Statistics cards
│   └── expense-charts.tsx   # Chart visualizations
├── lib/
│   ├── db/                  # Database setup and migrations
│   ├── types/               # TypeScript type definitions
│   ├── constants.ts         # Currency conversion utilities
│   └── utils.ts             # Shared utility functions
```

## Features in Detail

### Expense Management
- Add expenses with category, description, date, and dual currency amounts
- Edit existing expenses inline
- Delete expenses with confirmation
- Auto-calculates currency conversion based on current exchange rate

### Statistics
- **Total Expenses:** Sum of all expenses in both currencies
- **Transaction Count:** Number of expense entries
- **Average Daily Spending:** Calculated from first expense date to today

### Visualizations
- **Category Distribution:** Pie chart showing spending breakdown by category
- **Category Comparison:** Horizontal bar chart for easy comparison
- **Daily Spending Trend:** Area chart showing spending patterns over time with zero-day filling

### Exchange Rate Integration
- Fetches live USD/Toman rates from Navasan API
- 24-hour CDN-level caching to minimize API calls
- Automatic rate updates in the expense form
- Respects API rate limits (120 requests/month on free tier)

## Database Schema

```sql
CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  price_toman REAL NOT NULL,
  price_usd REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Deployment

The app is optimized for deployment on Vercel:

```bash
pnpm build
```

Ensure environment variables are set in your Vercel project settings.

## License

MIT

## Credits

Built with ❤️ using modern web technologies.
