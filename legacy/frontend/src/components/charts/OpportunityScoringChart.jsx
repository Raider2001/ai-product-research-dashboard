import React from 'react';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from 'recharts';

/**
 * OpportunityScoringChart
 * Scatter plot showing opportunity score based on:
 * X-axis: Market Score (demand)
 * Y-axis: Competition Level (inverse of uniqueness)
 * Size/Color: Opportunity Score
 */
const OpportunityScoringChart = ({ opportunities }) => {
    if (!opportunities || opportunities.length === 0) {
        return (
            <div className="chart-container">
                <h3>Opportunity Matrix</h3>
                <p>No opportunity data available. Run AI analysis first.</p>
            </div>
        );
    }

    const data = opportunities.map((opp) => ({
        name: opp.name.substring(0, 15),
        x: parseFloat(opp.demand) || 50,
        y: 100 - (parseFloat(opp.competition) || 50), // Invert so low competition is high on Y
        score: parseFloat(opp.opportunity_score) || 50,
        fullName: opp.name,
    }));

    // Color based on opportunity score
    const getColor = (score) => {
        if (score >= 90) return '#22c55e';
        if (score >= 80) return '#3b82f6';
        if (score >= 70) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <div className="chart-container">
            <h3>Opportunity Matrix (High-Score Products)</h3>
            <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                <span style={{ color: '#22c55e' }}>● Excellent</span>
                {' | '}
                <span style={{ color: '#f59e0b' }}>● Good</span>
                {' | '}
                <span style={{ color: '#3b82f6' }}>● Moderate</span>
                {' | '}
                <span style={{ color: '#ef4444' }}>● Low</span>
            </div>
            <ResponsiveContainer width="100%" height={350}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                    <XAxis dataKey="x" name="Demand (Market Score)" unit="%" />
                    <YAxis dataKey="y" name="Low Competition ↑" unit="%" />
                    <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                        }}
                        formatter={(value, name) => {
                            if (name === 'x') return [`${value.toFixed(0)}%`, 'Demand'];
                            if (name === 'y') return [`${value.toFixed(0)}%`, 'Low Competition'];
                            return value.toFixed(1);
                        }}
                        labelFormatter={(label) => data.find((d) => d.x === label)?.fullName || label}
                    />
                    <Scatter name="Opportunity Score" data={data} fill="#8884d8">
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getColor(entry.score)} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
            <div style={{ marginTop: '15px', fontSize: '0.9em', color: '#666' }}>
                <strong>Top quadrant (low competition + high demand):</strong> Best opportunities
            </div>
        </div>
    );
};

export default OpportunityScoringChart;
