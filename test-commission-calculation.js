// Test Commission Calculation
// This script demonstrates how the commission calculation works

const saleAmount = 100000; // ₹1,00,000 (1 Lakh)

const commissionRates = {
    direct: 0.5,  // Direct seller: 0.5%
    1: 0.5,       // Level 1 upline: 0.5%
    2: 0.3,       // Level 2 upline: 0.3%
    3: 0.2,       // Level 3 upline: 0.2%
};

// Calculate seller commission
const sellerCommission = (saleAmount * commissionRates.direct) / 100;
console.log(`Seller Commission: ₹${sellerCommission} (${commissionRates.direct}%)`);

// Calculate upline commissions
const uplineCommissions = [];
for (let level = 1; level <= 3; level++) {
    const commission = (saleAmount * commissionRates[level]) / 100;
    uplineCommissions.push({
        level,
        commission,
        percentage: commissionRates[level]
    });
    console.log(`Level ${level} Upline: ₹${commission} (${commissionRates[level]}%)`);
}

// Calculate totals
const totalUplineCommission = uplineCommissions.reduce((sum, c) => sum + c.commission, 0);
const totalDistributed = sellerCommission + totalUplineCommission;
const companyProfit = saleAmount - totalDistributed;

console.log('\n--- Summary ---');
console.log(`Sale Amount: ₹${saleAmount}`);
console.log(`Seller Commission: ₹${sellerCommission}`);
console.log(`Total Upline Commission: ₹${totalUplineCommission}`);
console.log(`Total Distributed: ₹${totalDistributed} (${((totalDistributed / saleAmount) * 100).toFixed(2)}%)`);
console.log(`Company Profit: ₹${companyProfit} (${((companyProfit / saleAmount) * 100).toFixed(2)}%)`);

/*
Expected Output:

Seller Commission: ₹500 (0.5%)
Level 1 Upline: ₹500 (0.5%)
Level 2 Upline: ₹300 (0.3%)
Level 3 Upline: ₹200 (0.2%)

--- Summary ---
Sale Amount: ₹100000
Seller Commission: ₹500
Total Upline Commission: ₹1000
Total Distributed: ₹1500 (1.50%)
Company Profit: ₹98500 (98.50%)
*/
