import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ComposedChart,
    Bar,
    Cell,
} from 'recharts';

/**
 * MarketScoreTrendChart
 * Displays market scores across products
 * Identifies high-potential and declining products
 */
const MarketScoreTrendChart = ({ products }) => {
    if (!products || products.length === 0) {
        return (
            <div className="chart-container">
                <h3>Market Score Analysis</h3>
                <p>No data available</p>
            </div>
        );
    }

    // Prepare data for chart
    const data = products
        .map((product) => ({
            name: product.name.substring(0, 12) + (product.name.length > 12 ? '...' : ''),
            score: parseFloat(product.market_score) || 0,
            price: parseFloat(product.price) || 0,
        }))
        .sort((a, b) => b.score - a.score);

    return (
        <div className="chart-container">
            <h3>Market Score Analysis</h3>
            <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis yAxisId="left" label={{ value: 'Market Score', angle: -90, position: 'insideLeft' }} />
                    <YAxis yAxisId="right" orientation="right" label={{ value: 'Price ($)', angle: 90, position: 'insideRight' }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                        }}
                        formatter={(value) => value.toFixed(2)}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="score" name="Market Score" fill="#464feb" opacity={0.7} />
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="price"
                        name="Price"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={{ fill: '#22c55e', r: 4 }}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default MarketScoreTrendChart;
