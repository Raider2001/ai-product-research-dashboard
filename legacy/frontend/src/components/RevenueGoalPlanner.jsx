import { useMemo, useState } from 'react';

function safeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCurrency(value) {
    return `$${safeNumber(value, 0).toFixed(2)}`;
}

function formatPercent(value) {
    return `${safeNumber(value, 0).toFixed(1)}%`;
}

function formatSignedPercent(value) {
    const safe = safeNumber(value, 0);
    const sign = safe > 0 ? '+' : '';
    return `${sign}${safe.toFixed(1)}%`;
}

function csvCell(value) {
    const stringValue = String(value ?? '');
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

const SCENARIO_PRESETS = {
    survival: {
        label: 'Survival',
        conversionRatePct: 1.5,
        atcRatePct: 4.2,
        monthlyGrowthPct: 5,
        expectedWeeklySessions: 1300,
        avgCpc: 0.95,
        taxRatePct: 8.5,
        cogsPct: 52,
    },
    base: {
        label: 'Base',
        conversionRatePct: 2.2,
        atcRatePct: 5.5,
        monthlyGrowthPct: 12,
        expectedWeeklySessions: 2000,
        avgCpc: 0.78,
        taxRatePct: 8,
        cogsPct: 48,
    },
    stretch: {
        label: 'Stretch',
        conversionRatePct: 3.1,
        atcRatePct: 6.8,
        monthlyGrowthPct: 18,
        expectedWeeklySessions: 2800,
        avgCpc: 0.62,
        taxRatePct: 8,
        cogsPct: 44,
    },
};

const RevenueGoalPlanner = ({ products = [] }) => {
    const listNowProducts = useMemo(() => {
        return products.filter((product) => product.listing_verdict === 'List' || product.listing_verdict === 'Extra' || product.adjusted_decision_action === 'List Now');
    }, [products]);

    const avgRecommendedPrice = useMemo(() => {
        if (listNowProducts.length === 0) {
            return 0;
        }

        const total = listNowProducts.reduce((sum, product) => {
            return sum + safeNumber(product.adjusted_recommended_price ?? product.list_price_recommended ?? product.product_price ?? product.price, 0);
        }, 0);

        return total / listNowProducts.length;
    }, [listNowProducts]);

    const [weeklyRevenueTarget, setWeeklyRevenueTarget] = useState(2100);
    const [timelineMonths, setTimelineMonths] = useState(6);
    const [breakMonths, setBreakMonths] = useState(2);
    const [conversionRatePct, setConversionRatePct] = useState(2.2);
    const [atcRatePct, setAtcRatePct] = useState(5.5);
    const [monthlyGrowthPct, setMonthlyGrowthPct] = useState(12);
    const [expectedWeeklySessions, setExpectedWeeklySessions] = useState(2000);
    const [avgOrderValue, setAvgOrderValue] = useState(avgRecommendedPrice > 0 ? Number(avgRecommendedPrice.toFixed(2)) : 0);
    const [shopifyPlanMonthly, setShopifyPlanMonthly] = useState(39);
    const [taxRatePct, setTaxRatePct] = useState(8);
    const [paymentFeePct, setPaymentFeePct] = useState(2.9);
    const [paymentFixedFee, setPaymentFixedFee] = useState(0.3);
    const [averageCogsPct, setAverageCogsPct] = useState(48);
    const [shippingOpsPerOrder, setShippingOpsPerOrder] = useState(5.25);
    const [returnRatePct, setReturnRatePct] = useState(4);
    const [avgCpc, setAvgCpc] = useState(0.78);
    const [selectedPreset, setSelectedPreset] = useState('base');
    const [tunerResult, setTunerResult] = useState(null);

    const model = useMemo(() => {
        const weeklyTarget = safeNumber(weeklyRevenueTarget, 0);
        const months = Math.max(safeNumber(timelineMonths, 0), 0);
        const breakWindow = Math.max(safeNumber(breakMonths, 0), 0);
        const conversionRate = Math.max(safeNumber(conversionRatePct, 0), 0) / 100;
        const atcRate = Math.max(safeNumber(atcRatePct, 0), 0) / 100;
        const growthRate = Math.max(safeNumber(monthlyGrowthPct, 0), 0) / 100;
        const sessions = Math.max(safeNumber(expectedWeeklySessions, 0), 0);
        const aov = Math.max(safeNumber(avgOrderValue, 0), 0);
        const shopifyMonthly = Math.max(safeNumber(shopifyPlanMonthly, 0), 0);
        const taxRate = Math.max(safeNumber(taxRatePct, 0), 0) / 100;
        const processingRate = Math.max(safeNumber(paymentFeePct, 0), 0) / 100;
        const processingFixed = Math.max(safeNumber(paymentFixedFee, 0), 0);
        const cogsRate = Math.max(safeNumber(averageCogsPct, 0), 0) / 100;
        const opsPerOrder = Math.max(safeNumber(shippingOpsPerOrder, 0), 0);
        const returnsRate = Math.max(safeNumber(returnRatePct, 0), 0) / 100;
        const cpc = Math.max(safeNumber(avgCpc, 0), 0);
        const listNowCount = listNowProducts.length;

        const weeks = months * 4.345;
        const breakReserveWeeks = breakWindow * 4.345;

        const weeklyOrdersNeeded = aov > 0 ? weeklyTarget / aov : 0;
        const weeklySessionsNeeded = conversionRate > 0 ? weeklyOrdersNeeded / conversionRate : 0;
        const weeklyAtcNeeded = atcRate > 0 ? weeklySessionsNeeded * atcRate : 0;

        const projectedWeeklyOrders = sessions * conversionRate;
        const projectedWeeklyRevenue = projectedWeeklyOrders * aov;
        const targetGapWeekly = weeklyTarget - projectedWeeklyRevenue;

        const sixMonthIncomeGoal = weeklyTarget * weeks;
        const breakReserveGoal = weeklyTarget * breakReserveWeeks;
        const combinedRevenueGoal = sixMonthIncomeGoal + breakReserveGoal;

        const projectedRevenueOverTimeline = projectedWeeklyRevenue * weeks;
        const shortfallToCombinedGoal = combinedRevenueGoal - projectedRevenueOverTimeline;

        const growthAdjustedWeeklyRevenueAtTimelineEnd = projectedWeeklyRevenue * Math.pow(1 + growthRate, months);

        const weeklyShopifyCost = shopifyMonthly / 4.345;
        const contributionPerOrderBeforeReturns = aov * (1 - taxRate - processingRate - cogsRate) - opsPerOrder - processingFixed;
        const contributionPerOrder = contributionPerOrderBeforeReturns * (1 - returnsRate);
        const projectedContributionWeekly = projectedWeeklyOrders * contributionPerOrder;
        const projectedProfitAfterShopifyWeekly = projectedContributionWeekly - weeklyShopifyCost;

        const trafficBasedCpa = conversionRate > 0 ? cpc / conversionRate : 0;
        const cpaHeadroom = Math.max(contributionPerOrder - trafficBasedCpa, 0);

        const ordersGapToTarget = Math.max(weeklyOrdersNeeded - projectedWeeklyOrders, 0);
        const sessionsGapToTarget = Math.max(weeklySessionsNeeded - sessions, 0);

        const minimumAdBudgetNeededWeekly = sessionsGapToTarget * cpc;
        const breakEvenAdBudgetCeilingWeekly = weeklyOrdersNeeded * contributionPerOrder;

        const effectiveRevenueAfterTaxAndFees = projectedWeeklyRevenue * (1 - taxRate - processingRate);

        const readiness = projectedWeeklyRevenue >= weeklyTarget
            ? 'On Track'
            : projectedWeeklyRevenue >= weeklyTarget * 0.75
                ? 'Close - Needs Optimization'
                : 'Not Ready Yet';

        const focusAction = projectedWeeklyRevenue >= weeklyTarget
            ? 'Maintain pricing discipline, improve conversion, and build reserve.'
            : targetGapWeekly <= weeklyTarget * 0.25
                ? 'Increase qualified traffic and improve product page conversion first.'
                : 'Delay launch spend and strengthen conversion and offer clarity before scaling.';

        const launchReadinessByCash = projectedProfitAfterShopifyWeekly > 0 && minimumAdBudgetNeededWeekly <= projectedContributionWeekly * 0.7
            ? 'Cash-Ready'
            : minimumAdBudgetNeededWeekly <= projectedContributionWeekly
                ? 'Tight but Testable'
                : 'Underfunded for Full Target';

        return {
            listNowCount,
            aov,
            weeklyOrdersNeeded,
            weeklySessionsNeeded,
            weeklyAtcNeeded,
            projectedWeeklyOrders,
            projectedWeeklyRevenue,
            targetGapWeekly,
            sixMonthIncomeGoal,
            breakReserveGoal,
            combinedRevenueGoal,
            projectedRevenueOverTimeline,
            shortfallToCombinedGoal,
            growthAdjustedWeeklyRevenueAtTimelineEnd,
            weeklyShopifyCost,
            contributionPerOrder,
            projectedContributionWeekly,
            projectedProfitAfterShopifyWeekly,
            trafficBasedCpa,
            cpaHeadroom,
            ordersGapToTarget,
            sessionsGapToTarget,
            minimumAdBudgetNeededWeekly,
            breakEvenAdBudgetCeilingWeekly,
            effectiveRevenueAfterTaxAndFees,
            readiness,
            focusAction,
            launchReadinessByCash,
        };
    }, [
        weeklyRevenueTarget,
        timelineMonths,
        breakMonths,
        conversionRatePct,
        atcRatePct,
        monthlyGrowthPct,
        expectedWeeklySessions,
        avgOrderValue,
        shopifyPlanMonthly,
        taxRatePct,
        paymentFeePct,
        paymentFixedFee,
        averageCogsPct,
        shippingOpsPerOrder,
        returnRatePct,
        avgCpc,
        listNowProducts,
    ]);

    const scenarioSnapshots = useMemo(() => {
        const target = safeNumber(weeklyRevenueTarget, 0);
        const aov = Math.max(safeNumber(avgOrderValue, 0), 0);

        return Object.values(SCENARIO_PRESETS).map((preset) => {
            const conversionRate = preset.conversionRatePct / 100;
            const sessions = preset.expectedWeeklySessions;
            const projectedOrders = sessions * conversionRate;
            const projectedRevenue = projectedOrders * aov;
            const weeklyOrdersNeeded = aov > 0 ? target / aov : 0;
            const sessionsNeeded = conversionRate > 0 ? weeklyOrdersNeeded / conversionRate : 0;
            const minAdBudget = Math.max(sessionsNeeded - sessions, 0) * preset.avgCpc;
            const status = projectedRevenue >= target
                ? 'Ready'
                : projectedRevenue >= target * 0.75
                    ? 'Near'
                    : 'Gap';

            return {
                key: preset.label.toLowerCase(),
                label: preset.label,
                projectedRevenue,
                minAdBudget,
                status,
            };
        });
    }, [weeklyRevenueTarget, avgOrderValue]);

    const applyPreset = (key) => {
        const preset = SCENARIO_PRESETS[key];
        if (!preset) {
            return;
        }

        setSelectedPreset(key);
        setConversionRatePct(preset.conversionRatePct);
        setAtcRatePct(preset.atcRatePct);
        setMonthlyGrowthPct(preset.monthlyGrowthPct);
        setExpectedWeeklySessions(preset.expectedWeeklySessions);
        setAvgCpc(preset.avgCpc);
        setTaxRatePct(preset.taxRatePct);
        setAverageCogsPct(preset.cogsPct);
        setTunerResult(null);
    };

    const runAutoGoalTuner = () => {
        const weeklyTarget = Math.max(safeNumber(weeklyRevenueTarget, 0), 0);
        const shopifyMonthly = Math.max(safeNumber(shopifyPlanMonthly, 0), 0);
        const taxRate = Math.max(safeNumber(taxRatePct, 0), 0) / 100;
        const processingRate = Math.max(safeNumber(paymentFeePct, 0), 0) / 100;
        const processingFixed = Math.max(safeNumber(paymentFixedFee, 0), 0);
        const cogsRate = Math.max(safeNumber(averageCogsPct, 0), 0) / 100;
        const opsPerOrder = Math.max(safeNumber(shippingOpsPerOrder, 0), 0);
        const returnsRate = Math.max(safeNumber(returnRatePct, 0), 0) / 100;

        const baseAov = Math.max(safeNumber(avgOrderValue, 0), 0.01);
        const baseCvrPct = Math.max(safeNumber(conversionRatePct, 0), 0.1);
        const baseCvr = baseCvrPct / 100;
        const baseSessions = Math.max(Math.round(safeNumber(expectedWeeklySessions, 0)), 100);

        const weeklyShopifyCost = shopifyMonthly / 4.345;
        const denominator = Math.max(1 - taxRate - processingRate - cogsRate, 0.01);
        const minAovForPositiveContribution = (opsPerOrder + processingFixed) / denominator + 0.01;

        let best = null;

        for (let aovMultiplier = 1; aovMultiplier <= 2.5; aovMultiplier += 0.05) {
            for (let cvrMultiplier = 1; cvrMultiplier <= 2.5; cvrMultiplier += 0.05) {
                for (let sessionsMultiplier = 1; sessionsMultiplier <= 4; sessionsMultiplier += 0.1) {
                    const tunedAov = Math.max(baseAov * aovMultiplier, minAovForPositiveContribution);
                    const tunedCvr = baseCvr * cvrMultiplier;
                    const tunedSessions = Math.round(baseSessions * sessionsMultiplier);

                    const tunedOrders = tunedSessions * tunedCvr;
                    const tunedRevenue = tunedOrders * tunedAov;

                    const contributionPerOrder = (tunedAov * denominator - opsPerOrder - processingFixed) * (1 - returnsRate);
                    const weeklyProfitAfterShopify = tunedOrders * contributionPerOrder - weeklyShopifyCost;

                    if (tunedRevenue < weeklyTarget || contributionPerOrder <= 0 || weeklyProfitAfterShopify <= 0) {
                        continue;
                    }

                    const aovUplift = ((tunedAov / baseAov) - 1) * 100;
                    const cvrUplift = ((tunedCvr / baseCvr) - 1) * 100;
                    const sessionsUplift = ((tunedSessions / baseSessions) - 1) * 100;

                    const score = (aovUplift * 0.4) + (cvrUplift * 0.35) + (sessionsUplift * 0.25);

                    if (!best || score < best.score || (score === best.score && tunedSessions < best.tunedSessions)) {
                        best = {
                            score,
                            tunedAov,
                            tunedCvrPct: tunedCvr * 100,
                            tunedSessions,
                            tunedRevenue,
                            contributionPerOrder,
                            weeklyProfitAfterShopify,
                            aovUplift,
                            cvrUplift,
                            sessionsUplift,
                        };
                    }
                }
            }
        }

        if (!best) {
            setTunerResult({
                feasible: false,
                message: 'No feasible plan found in current tuning range. Lower COGS/shipping, improve pricing, or reduce weekly target for phase 1.',
            });
            return;
        }

        setAvgOrderValue(best.tunedAov.toFixed(2));
        setConversionRatePct(best.tunedCvrPct.toFixed(2));
        setExpectedWeeklySessions(best.tunedSessions);
        setSelectedPreset('custom');
        setTunerResult({
            feasible: true,
            ...best,
        });
    };

    const resetFromPipeline = () => {
        setAvgOrderValue(avgRecommendedPrice > 0 ? Number(avgRecommendedPrice.toFixed(2)) : 0);
    };

    const exportGoalPlanCsv = () => {
        const today = new Date();
        const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const planName = tunerResult?.feasible ? 'AutoTuned' : 'Manual';

        const rows = [
            ['section', 'metric', 'value'],
            ['Plan', 'plan_type', planName],
            ['Plan', 'weekly_revenue_target', safeNumber(weeklyRevenueTarget, 0).toFixed(2)],
            ['Plan', 'timeline_months', safeNumber(timelineMonths, 0)],
            ['Plan', 'break_months', safeNumber(breakMonths, 0)],
            ['Plan', 'list_now_pool_count', model.listNowCount],
            ['Assumptions', 'average_order_value', safeNumber(avgOrderValue, 0).toFixed(2)],
            ['Assumptions', 'conversion_rate_pct', safeNumber(conversionRatePct, 0).toFixed(2)],
            ['Assumptions', 'atc_rate_pct', safeNumber(atcRatePct, 0).toFixed(2)],
            ['Assumptions', 'expected_weekly_sessions', safeNumber(expectedWeeklySessions, 0).toFixed(0)],
            ['Assumptions', 'monthly_growth_pct', safeNumber(monthlyGrowthPct, 0).toFixed(2)],
            ['Assumptions', 'shopify_plan_monthly', safeNumber(shopifyPlanMonthly, 0).toFixed(2)],
            ['Assumptions', 'sales_tax_pct', safeNumber(taxRatePct, 0).toFixed(2)],
            ['Assumptions', 'payment_fee_pct', safeNumber(paymentFeePct, 0).toFixed(2)],
            ['Assumptions', 'payment_fixed_fee_per_order', safeNumber(paymentFixedFee, 0).toFixed(2)],
            ['Assumptions', 'cogs_pct', safeNumber(averageCogsPct, 0).toFixed(2)],
            ['Assumptions', 'shipping_ops_per_order', safeNumber(shippingOpsPerOrder, 0).toFixed(2)],
            ['Assumptions', 'return_rate_pct', safeNumber(returnRatePct, 0).toFixed(2)],
            ['Assumptions', 'average_cpc', safeNumber(avgCpc, 0).toFixed(2)],
            ['Outputs', 'projected_weekly_revenue', model.projectedWeeklyRevenue.toFixed(2)],
            ['Outputs', 'projected_weekly_orders', model.projectedWeeklyOrders.toFixed(2)],
            ['Outputs', 'weekly_orders_needed', model.weeklyOrdersNeeded.toFixed(2)],
            ['Outputs', 'weekly_sessions_needed', model.weeklySessionsNeeded.toFixed(2)],
            ['Outputs', 'weekly_atc_needed', model.weeklyAtcNeeded.toFixed(2)],
            ['Outputs', 'weekly_revenue_gap', model.targetGapWeekly.toFixed(2)],
            ['Outputs', 'minimum_ad_budget_needed_weekly', model.minimumAdBudgetNeededWeekly.toFixed(2)],
            ['Outputs', 'break_even_ad_budget_ceiling_weekly', model.breakEvenAdBudgetCeilingWeekly.toFixed(2)],
            ['Outputs', 'projected_profit_after_shopify_weekly', model.projectedProfitAfterShopifyWeekly.toFixed(2)],
            ['Outputs', 'contribution_margin_per_order', model.contributionPerOrder.toFixed(2)],
            ['Outputs', 'launch_cash_status', model.launchReadinessByCash],
            ['Outputs', 'readiness_status', model.readiness],
            ['Outputs', 'timeline_revenue_gap', model.shortfallToCombinedGoal.toFixed(2)],
            ['Outputs', 'focus_recommendation', model.focusAction],
        ];

        if (tunerResult?.feasible) {
            rows.push(['AutoTuner', 'tuned_aov', safeNumber(tunerResult.tunedAov, 0).toFixed(2)]);
            rows.push(['AutoTuner', 'tuned_cvr_pct', safeNumber(tunerResult.tunedCvrPct, 0).toFixed(2)]);
            rows.push(['AutoTuner', 'tuned_sessions', safeNumber(tunerResult.tunedSessions, 0).toFixed(0)]);
            rows.push(['AutoTuner', 'aov_uplift_pct', safeNumber(tunerResult.aovUplift, 0).toFixed(2)]);
            rows.push(['AutoTuner', 'cvr_uplift_pct', safeNumber(tunerResult.cvrUplift, 0).toFixed(2)]);
            rows.push(['AutoTuner', 'sessions_uplift_pct', safeNumber(tunerResult.sessionsUplift, 0).toFixed(2)]);
            rows.push(['AutoTuner', 'tuned_weekly_revenue', safeNumber(tunerResult.tunedRevenue, 0).toFixed(2)]);
            rows.push(['AutoTuner', 'tuned_weekly_profit_after_shopify', safeNumber(tunerResult.weeklyProfitAfterShopify, 0).toFixed(2)]);
        }

        const csvContent = rows
            .map((row) => row.map(csvCell).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `goal-plan-${planName.toLowerCase()}-${stamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <section className="goal-planner-section">
            <div className="goal-planner-header">
                <h3>Revenue Goal Planner</h3>
                <p>Forecast your weekly target, six-month transition runway, and two-month break reserve before launch.</p>
            </div>

            <div className="goal-planner-grid">
                <div className="goal-inputs">
                    <div className="goal-input-group">
                        <label>Weekly revenue target ($)</label>
                        <input type="number" min="0" step="50" value={weeklyRevenueTarget} onChange={(e) => setWeeklyRevenueTarget(e.target.value)} />
                    </div>
                    <div className="goal-input-group">
                        <label>Transition timeline (months)</label>
                        <input type="number" min="1" step="1" value={timelineMonths} onChange={(e) => setTimelineMonths(e.target.value)} />
                    </div>
                    <div className="goal-input-group">
                        <label>Break reserve (months)</label>
                        <input type="number" min="0" step="1" value={breakMonths} onChange={(e) => setBreakMonths(e.target.value)} />
                    </div>
                    <div className="goal-input-group">
                        <label>Expected weekly sessions</label>
                        <input type="number" min="0" step="50" value={expectedWeeklySessions} onChange={(e) => setExpectedWeeklySessions(e.target.value)} />
                    </div>
                    <div className="goal-input-group">
                        <label>Store conversion rate (%)</label>
                        <input type="number" min="0" max="100" step="0.1" value={conversionRatePct} onChange={(e) => setConversionRatePct(e.target.value)} />
                    </div>
                    <div className="goal-input-group">
                        <label>Add-to-cart rate (%)</label>
                        <input type="number" min="0" max="100" step="0.1" value={atcRatePct} onChange={(e) => setAtcRatePct(e.target.value)} />
                    </div>
                    <div className="goal-input-group">
                        <label>Average order value ($)</label>
                        <input type="number" min="0" step="0.01" value={avgOrderValue} onChange={(e) => setAvgOrderValue(e.target.value)} />
                        <button type="button" className="btn-secondary goal-sync-btn" onClick={resetFromPipeline}>Use Pipeline Avg</button>
                    </div>
                    <div className="goal-input-group">
                        <label>Monthly growth assumption (%)</label>
                        <input type="number" min="0" step="1" value={monthlyGrowthPct} onChange={(e) => setMonthlyGrowthPct(e.target.value)} />
                    </div>
                    <div className="goal-input-group">
                        <label>Shopify plan monthly ($)</label>
                        <input type="number" min="0" step="1" value={shopifyPlanMonthly} onChange={(e) => setShopifyPlanMonthly(e.target.value)} />
                    </div>
                    <div className="goal-input-group">
                        <label>Sales tax assumption (%)</label>
                        <input type="number" min="0" step="0.1" value={taxRatePct} onChange={(e) => setTaxRatePct(e.target.value)} />
                    </div>
                    <div className="goal-input-group">
                        <label>Payment processing fee (%)</label>
                        <input type="number" min="0" step="0.1" value={paymentFeePct} onChange={(e) => setPaymentFeePct(e.target.value)} />
                    </div>
                    <div className="goal-input-group">
                        <label>Payment fixed fee / order ($)</label>
                        <input type="number" min="0" step="0.01" value={paymentFixedFee} onChange={(e) => setPaymentFixedFee(e.target.value)} />
                    </div>
                    <div className="goal-input-group">
                        <label>COGS (% of sale)</label>
                        <input type="number" min="0" step="0.5" value={averageCogsPct} onChange={(e) => setAverageCogsPct(e.target.value)} />
                    </div>
                    <div className="goal-input-group">
                        <label>Shipping + ops / order ($)</label>
                        <input type="number" min="0" step="0.25" value={shippingOpsPerOrder} onChange={(e) => setShippingOpsPerOrder(e.target.value)} />
                    </div>
                    <div className="goal-input-group">
                        <label>Return/refund rate (%)</label>
                        <input type="number" min="0" max="100" step="0.5" value={returnRatePct} onChange={(e) => setReturnRatePct(e.target.value)} />
                    </div>
                    <div className="goal-input-group">
                        <label>Average CPC ($)</label>
                        <input type="number" min="0" step="0.01" value={avgCpc} onChange={(e) => setAvgCpc(e.target.value)} />
                    </div>
                </div>

                <div className="goal-results">
                    <div className="scenario-planner-panel">
                        <div className="scenario-header-row">
                            <h4>Scenario Presets</h4>
                            <span className="scenario-selected">Current preset: {SCENARIO_PRESETS[selectedPreset]?.label ?? 'Custom'}</span>
                        </div>
                        <div className="scenario-buttons">
                            <button type="button" className={`btn-secondary ${selectedPreset === 'survival' ? 'scenario-active' : ''}`} onClick={() => applyPreset('survival')}>Survival</button>
                            <button type="button" className={`btn-secondary ${selectedPreset === 'base' ? 'scenario-active' : ''}`} onClick={() => applyPreset('base')}>Base</button>
                            <button type="button" className={`btn-secondary ${selectedPreset === 'stretch' ? 'scenario-active' : ''}`} onClick={() => applyPreset('stretch')}>Stretch</button>
                        </div>
                        <div className="scenario-card-grid">
                            {scenarioSnapshots.map((scenario) => (
                                <article key={scenario.key} className="scenario-card">
                                    <div className="scenario-card-top">
                                        <h5>{scenario.label}</h5>
                                        <span className={`scenario-status scenario-status-${scenario.status.toLowerCase()}`}>{scenario.status}</span>
                                    </div>
                                    <p>Projected weekly revenue: <strong>{formatCurrency(scenario.projectedRevenue)}</strong></p>
                                    <p>Min ad budget to close target: <strong>{formatCurrency(scenario.minAdBudget)}</strong></p>
                                </article>
                            ))}
                        </div>
                        <div className="scenario-tuner-actions">
                            <button type="button" className="btn-primary" onClick={runAutoGoalTuner}>Auto Goal Tuner</button>
                            <button type="button" className="btn-secondary" onClick={exportGoalPlanCsv}>Export Goal Plan CSV</button>
                            <span>Finds minimum viable AOV + CVR + sessions for ${safeNumber(weeklyRevenueTarget, 0).toFixed(0)}/week with positive contribution.</span>
                        </div>
                        {tunerResult && (
                            <div className={`scenario-tuner-result ${tunerResult.feasible ? 'scenario-tuner-ok' : 'scenario-tuner-warn'}`}>
                                {tunerResult.feasible ? (
                                    <>
                                        <h5>Auto Tuner Applied</h5>
                                        <p>Target model updated to AOV <strong>{formatCurrency(tunerResult.tunedAov)}</strong>, CVR <strong>{formatPercent(tunerResult.tunedCvrPct)}</strong>, sessions <strong>{Math.round(tunerResult.tunedSessions)}</strong>/week.</p>
                                        <p>Uplifts: AOV <strong>{formatSignedPercent(tunerResult.aovUplift)}</strong>, CVR <strong>{formatSignedPercent(tunerResult.cvrUplift)}</strong>, sessions <strong>{formatSignedPercent(tunerResult.sessionsUplift)}</strong>.</p>
                                        <p>Projected weekly revenue <strong>{formatCurrency(tunerResult.tunedRevenue)}</strong> with weekly profit after Shopify <strong>{formatCurrency(tunerResult.weeklyProfitAfterShopify)}</strong>.</p>
                                    </>
                                ) : (
                                    <>
                                        <h5>Auto Tuner Warning</h5>
                                        <p>{tunerResult.message}</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="goal-badges">
                        <span className={`goal-status ${model.readiness === 'On Track' ? 'goal-status-good' : model.readiness.includes('Close') ? 'goal-status-warn' : 'goal-status-risk'}`}>
                            {model.readiness}
                        </span>
                        <span className="goal-listnow">List Now Pool: {model.listNowCount} products</span>
                        <span className={`goal-listnow ${model.launchReadinessByCash === 'Cash-Ready' ? 'goal-cash-good' : model.launchReadinessByCash.includes('Tight') ? 'goal-cash-warn' : 'goal-cash-risk'}`}>
                            Launch Cash Status: {model.launchReadinessByCash}
                        </span>
                    </div>

                    <div className="goal-cards">
                        <div className="goal-card">
                            <div className="goal-card-label">Projected Weekly Revenue</div>
                            <div className="goal-card-value">{formatCurrency(model.projectedWeeklyRevenue)}</div>
                        </div>
                        <div className="goal-card">
                            <div className="goal-card-label">Weekly Revenue Gap</div>
                            <div className="goal-card-value">{formatCurrency(model.targetGapWeekly)}</div>
                        </div>
                        <div className="goal-card">
                            <div className="goal-card-label">Orders Needed / Week</div>
                            <div className="goal-card-value">{model.weeklyOrdersNeeded.toFixed(0)}</div>
                        </div>
                        <div className="goal-card">
                            <div className="goal-card-label">Sessions Needed / Week</div>
                            <div className="goal-card-value">{model.weeklySessionsNeeded.toFixed(0)}</div>
                        </div>
                        <div className="goal-card">
                            <div className="goal-card-label">ATC Needed / Week</div>
                            <div className="goal-card-value">{model.weeklyAtcNeeded.toFixed(0)}</div>
                        </div>
                        <div className="goal-card">
                            <div className="goal-card-label">Revenue at Month {safeNumber(timelineMonths, 0)}</div>
                            <div className="goal-card-value">{formatCurrency(model.growthAdjustedWeeklyRevenueAtTimelineEnd)}</div>
                        </div>
                        <div className="goal-card">
                            <div className="goal-card-label">Minimum Ad Budget Needed / Week</div>
                            <div className="goal-card-value">{formatCurrency(model.minimumAdBudgetNeededWeekly)}</div>
                        </div>
                        <div className="goal-card">
                            <div className="goal-card-label">Break-Even Ad Budget Ceiling / Week</div>
                            <div className="goal-card-value">{formatCurrency(model.breakEvenAdBudgetCeilingWeekly)}</div>
                        </div>
                        <div className="goal-card">
                            <div className="goal-card-label">Projected Profit After Shopify / Week</div>
                            <div className="goal-card-value">{formatCurrency(model.projectedProfitAfterShopifyWeekly)}</div>
                        </div>
                        <div className="goal-card">
                            <div className="goal-card-label">Contribution Margin / Order</div>
                            <div className="goal-card-value">{formatCurrency(model.contributionPerOrder)}</div>
                        </div>
                    </div>

                    <div className="goal-summary-table-wrap">
                        <table className="goal-summary-table">
                            <tbody>
                                <tr>
                                    <td>6-Month Income Goal</td>
                                    <td>{formatCurrency(model.sixMonthIncomeGoal)}</td>
                                </tr>
                                <tr>
                                    <td>2-Month Break Reserve Goal</td>
                                    <td>{formatCurrency(model.breakReserveGoal)}</td>
                                </tr>
                                <tr>
                                    <td>Combined Revenue Goal</td>
                                    <td>{formatCurrency(model.combinedRevenueGoal)}</td>
                                </tr>
                                <tr>
                                    <td>Projected Revenue Over Timeline</td>
                                    <td>{formatCurrency(model.projectedRevenueOverTimeline)}</td>
                                </tr>
                                <tr>
                                    <td>Timeline Gap</td>
                                    <td>{formatCurrency(model.shortfallToCombinedGoal)}</td>
                                </tr>
                                <tr>
                                    <td>Current AOV Assumption</td>
                                    <td>{formatCurrency(model.aov)}</td>
                                </tr>
                                <tr>
                                    <td>Current CVR Assumption</td>
                                    <td>{formatPercent(conversionRatePct)}</td>
                                </tr>
                                <tr>
                                    <td>Weekly Shopify Cost</td>
                                    <td>{formatCurrency(model.weeklyShopifyCost)}</td>
                                </tr>
                                <tr>
                                    <td>Projected Revenue After Tax + Processing</td>
                                    <td>{formatCurrency(model.effectiveRevenueAfterTaxAndFees)}</td>
                                </tr>
                                <tr>
                                    <td>Projected Contribution / Week (pre-ads)</td>
                                    <td>{formatCurrency(model.projectedContributionWeekly)}</td>
                                </tr>
                                <tr>
                                    <td>Orders Gap to Weekly Target</td>
                                    <td>{model.ordersGapToTarget.toFixed(0)}</td>
                                </tr>
                                <tr>
                                    <td>Sessions Gap to Weekly Target</td>
                                    <td>{model.sessionsGapToTarget.toFixed(0)}</td>
                                </tr>
                                <tr>
                                    <td>Traffic-Based CPA (CPC/CVR)</td>
                                    <td>{formatCurrency(model.trafficBasedCpa)}</td>
                                </tr>
                                <tr>
                                    <td>CPA Headroom Per Order</td>
                                    <td>{formatCurrency(model.cpaHeadroom)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="goal-focus-box">
                        <h4>AI Focus Recommendation</h4>
                        <p>{model.focusAction}</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default RevenueGoalPlanner;
