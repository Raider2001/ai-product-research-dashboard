import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from 'recharts';

/**
 * PriceDistributionChart
 * Displays price ranges and product count in each range
 * Helps identify market pricing tiers
 */
const PriceDistributionChart = ({ products }) => {
    if (!products || products.length === 0) {
        return (
            <div className="chart-container">
                <h3>Price Distribution</h3>
                <p>No data available</p>
            </div>
        );
    }

    // Create price range buckets
    const createPriceRanges = (products) => {
        const ranges = [
            { name: '$0-50', min: 0, max: 50, count: 0 },
            { name: '$50-100', min: 50, max: 100, count: 0 },
            { name: '$100-200', min: 100, max: 200, count: 0 },
            { name: '$200-500', min: 200, max: 500, count: 0 },
            { name: '$500+', min: 500, max: Infinity, count: 0 },
        ];

        products.forEach((product) => {
            const price = parseFloat(product.price) || 0;
            ranges.forEach((range) => {
                if (price >= range.min && price < range.max) {
                    range.count++;
                }
            });
        });

        return ranges.filter((range) => range.count > 0);
    };

    const data = createPriceRanges(products);
    const colors = ['#464feb', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
        <div className="chart-container">
            <h3>Price Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                        }}
                        formatter={(value) => `${value} products`}
                    />
                    <Bar dataKey="count" name="Product Count" radius={[8, 8, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PriceDistributionChart;
