/**
 * GAJ-BASED COMMISSION CONFIGURATION
 * 
 * ⚠️ IMPORTANT: To change commission rates in the future, ONLY modify the values below.
 * This is the SINGLE SOURCE OF TRUTH for all commission calculations.
 * 
 * All commission calculations across the entire application use these rates.
 * Changes here will automatically reflect everywhere:
 * - Direct sales commissions
 * - Projected commission wallet
 * - Upline commission distributions
 * - Admin dashboards
 * - Broker wallets
 * 
 * Formula: Commission Amount = Plot Size (in Gaj) × Rate (in ₹)
 * Example: 300 gaj plot = Direct: 300×1000=₹300,000 | Level 1: 300×200=₹60,000 | Level 2: 300×50=₹15,000
 */

export const GAJ_COMMISSION_RATES = {
    /**
     * Direct Broker / Seller Commission
     * The broker who sold the plot receives this amount per gaj
     * 
     * Current: ₹1,000 per gaj
     * To change: Update the value below
     */
    direct: 1000,

    /**
     * Level 1 Upline Commission
     * The immediate upline (referrer) of the seller receives this amount per gaj
     * 
     * Current: ₹200 per gaj
     * To change: Update the value below
     */
    level1: 200,

    /**
     * Level 2 Upline Commission
     * The upline's upline receives this amount per gaj
     * 
     * Current: ₹50 per gaj
     * To change: Update the value below
     */
    level2: 50,

    // Level 3 and above: No commission (can be extended if needed)
};

/**
 * COMMISSION SYSTEM TYPE
 * 
 * 'gaj' = Gaj-based commission (current system)
 * 'percentage' = Percentage-based commission (legacy)
 * 
 * This allows keeping legacy plots on percentage system if needed
 */
export const COMMISSION_SYSTEM_TYPE = 'gaj' as const;

/**
 * HELPER FUNCTION: Calculate commission for a given level
 * 
 * Usage:
 *   const plotSize = 300; // in gaj
 *   const directCommission = calculateCommission('direct', plotSize);
 *   const level1Commission = calculateCommission('level1', plotSize);
 */
export function calculateCommission(
    level: 'direct' | 'level1' | 'level2',
    plotSizeInGaj: number
): number {
    if (!plotSizeInGaj || plotSizeInGaj <= 0) {
        return 0;
    }

    const rates: Record<string, number> = {
        direct: GAJ_COMMISSION_RATES.direct,
        level1: GAJ_COMMISSION_RATES.level1,
        level2: GAJ_COMMISSION_RATES.level2,
    };

    const rate = rates[level] || 0;
    return plotSizeInGaj * rate;
}

/**
 * HELPER FUNCTION: Get commission breakdown for a plot
 * 
 * Usage:
 *   const breakdown = getCommissionBreakdown(300);
 *   console.log(breakdown); // { direct: 300000, level1: 60000, level2: 15000, total: 375000 }
 */
export function getCommissionBreakdown(plotSizeInGaj: number): {
    direct: number;
    level1: number;
    level2: number;
    total: number;
} {
    return {
        direct: calculateCommission('direct', plotSizeInGaj),
        level1: calculateCommission('level1', plotSizeInGaj),
        level2: calculateCommission('level2', plotSizeInGaj),
        total:
            calculateCommission('direct', plotSizeInGaj) +
            calculateCommission('level1', plotSizeInGaj) +
            calculateCommission('level2', plotSizeInGaj),
    };
}

/**
 * DOCUMENTATION: Where these rates are used
 * 
 * 1. processCommissionCalculation() - Main commission distribution
 *    File: src/lib/actions.ts (line ~2385)
 * 
 * 2. getProjectedCommissionWallet() - Calculate projected commission for booked plots
 *    File: src/lib/actions.ts (line ~4564)
 * 
 * 3. triggerCommissionDistribution() - Trigger when payment reaches 75%
 *    File: src/lib/actions.ts (line ~3817)
 * 
 * 4. Performance Dashboard - Display commission amounts
 *    File: src/app/broker/(main)/performance/page.tsx
 * 
 * 5. Booked Plots Page - Projected wallet display
 *    File: src/app/broker/(main)/booked-plots/page.tsx
 * 
 * FUTURE CHANGES:
 * To modify rates, only edit the values at the top of this file.
 * All the above locations will automatically use the new rates.
 */

export default {
    GAJ_COMMISSION_RATES,
    COMMISSION_SYSTEM_TYPE,
    calculateCommission,
    getCommissionBreakdown,
};
