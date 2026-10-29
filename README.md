# Spark Clean Laundry Business Analytics System - Phase 1

Complete frontend implementation for the Spark Clean Laundry Business Analytics capstone project.

## Technology Stack

- **Frontend Framework**: React 19 + TypeScript (strict mode)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **Routing**: React Router DOM
- **Charts**: Recharts
- **UI Components**: Custom built with lucide-react icons
- **State Management**: Zustand
- **Notifications**: Sonner
- **Animations**: Framer Motion
- **Data Tables**: TanStack Table

## Features

### Dashboard
- KPI cards with trend indicators
- Revenue trend charts
- Orders by branch analysis
- Service mix and payment method visualizations
- Recent orders table

### Analytics Modules
1. **Descriptive Analytics**: Statistical summaries and pattern detection
2. **Predictive Analytics**: Curve estimation (linear/quadratic/cubic) with R²/F-ratio validation
3. **Prescriptive Analytics**: Transportation optimization with real solver

### Data Management
- Data Explorer with all 9 entities
- CSV export functionality
- Real-time filters (branch, date range, service)

### Additional Features
- Dark/light theme toggle
- Global command palette (Ctrl+K)
- Responsive design for mobile/tablet/desktop
- Real analytics computations (no hardcoded values)
- Seeded mock data (150 customers, 600 orders, 162 demand records, etc.)

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The application will be available at `http://localhost:5173`

## Data Generation

Mock data is generated using seeded pseudo-random generator for deterministic results:
- **Customers**: 150 records
- **Orders**: 600 transactions
- **Branch Monthly Demand**: 162 records (6 branches × 27 months)
- **Marketing Campaigns**: 60 records
- **Plant Deliveries**: 120 records
- **Reference Tables**: Branches, Plants, Services, Delivery Cost Matrix

## Project Structure

```
src/
├── components/
│   ├── ui/          # Reusable UI components
│   ├── charts/      # Chart components
│   └── layout/      # Layout components
├── pages/           # Application pages
├── data/            # Mock data generators
├── lib/
│   └── analytics/   # Statistical computations
├── services/        # API service layer
├── store/           # Zustand store
└── types/           # TypeScript definitions
```

## Phase 2 Ready

The codebase is structured with a service layer (`services/api.ts`) ready for backend integration. All data access goes through this layer, making Phase 2 backend swap straightforward.
