# Charts Components

Recharts-based visualization components for the AI Product Research Dashboard.

## Components

### PriceDistributionChart

- **Purpose**: Visualize products across price ranges
- **Data**: Product price list
- **Chart Type**: Bar chart
- **Use Case**: Identify market price tiers and gaps

### MarketScoreTrendChart

- **Purpose**: Show market scores and prices per product
- **Data**: Products with market_score and price
- **Chart Type**: Composed (bars + line)
- **Use Case**: Identify high-demand products and pricing correlations

### OpportunityScoringChart

- **Purpose**: Scatter plot of demand vs. competition
- **Data**: Opportunities array from AI scoring
- **Chart Type**: Scatter chart
- **Use Case**: Find best opportunities (high demand + low competition)

## Installation

All components use Recharts. Install with:

```bash
npm install recharts
```

## Props

Each chart accepts a data prop:

- `PriceDistributionChart` - `products` (array)
- `MarketScoreTrendChart` - `products` (array)
- `OpportunityScoringChart` - `opportunities` (array)

## Styling

Charts inherit CSS from parent `.chart-container` class. Customize in App.css.
