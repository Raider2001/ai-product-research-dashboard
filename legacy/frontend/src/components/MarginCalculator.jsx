import React, { useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from 'recharts';

/**
 * MarginCalculator
 * Interactive profit margin calculator with visualization
 * Shows margin at different price points
 */
const MarginCalculator = () => {
    const [cost, setCost] = useState(50);
    const [retailPrice, setRetailPrice] = useState(150);
    const [marketplaceMargin, setMarketplaceMargin] = useState(2.9);
    const [shippingCost, setShippingCost] = useState(5);
    const [quantity, setQuantity] = useState(1);
    const [fixedFee, setFixedFee] = useState(0.3);
    const [advertising, setAdvertising] = useState(0);

    const shopifyFees = (retailPrice * marketplaceMargin / 100) + fixedFee;
    const netProfitPerUnit = retailPrice - cost - shopifyFees - shippingCost - advertising;
    const netMarginPercent = ((netProfitPerUnit / retailPrice) * 100).toFixed(1);

    const grossProfit = retailPrice - cost;
    const grossMarginPercent = ((grossProfit / retailPrice) * 100).toFixed(1);

    const totalRevenue = retailPrice * quantity;
    const totalMarketplaceFees = shopifyFees * quantity;
    const totalShipping = shippingCost * quantity;
    const totalNetProfit = netProfitPerUnit * quantity;

    // Generate data for margin at different price points
    const generateMarginData = () => {
        const data = [];
        for (let price = cost; price <= retailPrice * 2; price += cost * 0.1) {
            const gm = ((price - cost) / price * 100);
            const fees = (price * marketplaceMargin / 100) + fixedFee;
            const nm = ((price - cost - fees - shippingCost - advertising) / price) * 100;
            data.push({
                price: price.toFixed(0),
                grossMargin: parseFloat(gm.toFixed(1)),
                netMargin: parseFloat(nm.toFixed(1)),
            });
        }
        return data;
    };

    const marginData = generateMarginData();

    const breakEvenPrice = (cost + shippingCost + fixedFee + advertising) / (1 - marketplaceMargin / 100);

    return (
        <div className="margin-calculator">
            <h3>💰 Profit Margin Calculator</h3>

            <div className="calculator-grid">
                {/* Input Section */}
                <div className="calc-inputs">
                    <div className="input-group">
                        <label>💵 Product Cost</label>
                        <input
                            type="number"
                            value={cost}
                            onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                            step="0.01"
                            min="0"
                        />
                    </div>

                    <div className="input-group">
                        <label>🏷️ Retail Price</label>
                        <input
                            type="number"
                            value={retailPrice}
                            onChange={(e) => setRetailPrice(parseFloat(e.target.value) || 0)}
                            step="0.01"
                            min="0"
                        />
                    </div>

                    <div className="input-group">
                        <label>📦 Shipping Cost</label>
                        <input
                            type="number"
                            value={shippingCost}
                            onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                            step="0.01"
                            min="0"
                        />
                    </div>

                    <div className="input-group">
                        <label>Shopify fee (%)</label>
                        <input
                            type="number"
                            value={marketplaceMargin}
                            onChange={(e) => setMarketplaceMargin(parseFloat(e.target.value) || 0)}
                            step="0.1"
                            min="0"
                            max="100"
                        />
                    </div>

                    <div className="input-group">
                        <label>Shopify fixed fee</label>
                        <input
                            type="number"
                            value={fixedFee}
                            onChange={(e) => setFixedFee(parseFloat(e.target.value) || 0)}
                            step="0.01"
                            min="0"
                        />
                    </div>
                    <div className="input-group">
                        <label>Ad spend / unit</label>
                        <input
                            type="number"
                            value={advertising}
                            onChange={(e) => setAdvertising(parseFloat(e.target.value) || 0)}
                            step="0.01"
                            min="0"
                        />
                    </div>
                    <div className="input-group">
                        <label>Quantity</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            step="1"
                            min="1"
                        />
                    </div>
                </div>

                {/* Results Section */}
                <div className="calc-results">
                    <div className="result-card result-gross">
                        <div className="result-label">Gross Margin</div>
                        <div className="result-value">{grossMarginPercent}%</div>
                        <div className="result-detail">${grossProfit.toFixed(2)} per unit</div>
                    </div>

                    <div className="result-card result-net">
                        <div className="result-label">Net Margin</div>
                        <div className="result-value" style={{
                            color: netMarginPercent < 0 ? '#ef4444' : '#22c55e'
                        }}>
                            {netMarginPercent}%
                        </div>
                        <div className="result-detail">${netProfitPerUnit.toFixed(2)} per unit</div>
                    </div>

                    <div className="result-card">
                        <div className="result-label">Break-Even Price</div>
                        <div className="result-value">${breakEvenPrice.toFixed(2)}</div>
                        <div className="result-detail">Minimum to cover costs</div>
                    </div>

                    <div className="result-card">
                        <div className="result-label">Total Profit ({quantity} units)</div>
                        <div className="result-value" style={{
                            color: totalNetProfit < 0 ? '#ef4444' : '#22c55e'
                        }}>
                            ${totalNetProfit.toFixed(2)}
                        </div>
                        <div className="result-detail">Revenue: ${totalRevenue.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* Breakdown Table */}
            <div className="calc-breakdown">
                <h4>Per-Unit Breakdown</h4>
                <table className="breakdown-table">
                    <tbody>
                        <tr>
                            <td>Retail Price</td>
                            <td>${retailPrice.toFixed(2)}</td>
                        </tr>
                        <tr className="cost-row">
                            <td>- Product Cost</td>
                            <td>${cost.toFixed(2)}</td>
                        </tr>
                        <tr className="cost-row">
                            <td>Shopify fees ({marketplaceMargin}% + ${fixedFee.toFixed(2)})</td>
                            <td>${shopifyFees.toFixed(2)}</td>
                        </tr>
                        <tr className="cost-row">
                            <td>- Shipping Cost</td>
                            <td>${shippingCost.toFixed(2)}</td>
                        </tr>
                        <tr className="profit-row">
                            <td><strong>Net Profit</strong></td>
                            <td><strong>${netProfitPerUnit.toFixed(2)}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Margin Chart */}
            <div className="calc-chart">
                <h4>Margin Analysis at Different Price Points</h4>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={marginData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                        <XAxis dataKey="price" label={{ value: 'Retail Price ($)', position: 'insideBottomRight', offset: -5 }} />
                        <YAxis label={{ value: 'Margin (%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value) => value.toFixed(1) + '%'} />
                        <Line type="monotone" dataKey="grossMargin" stroke="#3b82f6" name="Gross Margin" strokeWidth={2} />
                        <Line type="monotone" dataKey="netMargin" stroke="#22c55e" name="Net Margin" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Viability Analysis */}
            <div className="viability-analysis">
                <h4>💡 Analysis</h4>
                {netMarginPercent >= 50 && (
                    <div className="analysis-excellent">
                        Preferred band. {netMarginPercent}% after cost, shipping, Shopify fees, and ads.
                    </div>
                )}
                {netMarginPercent >= 40 && netMarginPercent < 50 && (
                    <div className="analysis-good">
                        Hits the 40% floor. Prefer 50%+ before you lock it into the launch 30.
                    </div>
                )}
                {netMarginPercent >= 20 && netMarginPercent < 40 && (
                    <div className="analysis-fair">
                        Below 40%. Skip unless cost or shipping drops.
                    </div>
                )}
                {netMarginPercent < 20 && (
                    <div className="analysis-poor">
                        Not viable after fees.
                    </div>
                )}
                {retailPrice > breakEvenPrice && (
                    <div className="analysis-breakeven">
                        Break-even at ${breakEvenPrice.toFixed(2)} — You have ${(retailPrice - breakEvenPrice).toFixed(2)} profit cushion per sale.
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarginCalculator;
