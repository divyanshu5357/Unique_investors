/**
 * TEST: Commission Calculation for Booked Plots
 * Testing GAJ-BASED commission system for booked plots
 * 
 * Expected Results:
 * - Direct: Area (gaj) × ₹1,000
 * - Level 1: Area (gaj) × ₹200
 * - Level 2: Area (gaj) × ₹50
 */

// Commission rates
const RATES = {
    direct: 1000,
    level1: 200,
    level2: 50
};

// Test data - Simulating booked plots
const testPlots = [
    {
        id: 'plot-1',
        plotNumber: 'P-001',
        projectName: 'Green Valley',
        area: 100,
        status: 'booked',
        paidPercentage: 50,
        description: '100 gaj booked plot at 50% paid'
    },
    {
        id: 'plot-2',
        plotNumber: 'P-002',
        projectName: 'Sunset Heights',
        area: 300,
        status: 'booked',
        paidPercentage: 25,
        description: '300 gaj booked plot at 25% paid'
    },
    {
        id: 'plot-3',
        plotNumber: 'P-003',
        projectName: 'Coastal View',
        area: 250,
        status: 'booked',
        paidPercentage: 75,
        description: '250 gaj booked plot at 75% paid (threshold)'
    },
    {
        id: 'plot-4',
        plotNumber: 'P-004',
        projectName: 'Mountain Peak',
        area: 150,
        status: 'booked',
        paidPercentage: 40,
        description: '150 gaj booked plot at 40% paid'
    }
];

// Helper function to calculate commission
function calculateCommission(type, areaInGaj) {
    const rate = RATES[type] || 0;
    return areaInGaj * rate;
}

// Helper function to get commission breakdown
function getCommissionBreakdown(areaInGaj) {
    return {
        direct: calculateCommission('direct', areaInGaj),
        level1: calculateCommission('level1', areaInGaj),
        level2: calculateCommission('level2', areaInGaj),
        total: calculateCommission('direct', areaInGaj) + 
               calculateCommission('level1', areaInGaj) + 
               calculateCommission('level2', areaInGaj)
    };
}

console.log('\n' + '='.repeat(80));
console.log('COMMISSION CALCULATION TEST - BOOKED PLOTS');
console.log('='.repeat(80));

console.log('\n📋 Commission Rates (GAJ-BASED):');
console.log(`   Direct:  ₹${RATES.direct.toLocaleString()} per gaj`);
console.log(`   Level 1: ₹${RATES.level1.toLocaleString()} per gaj`);
console.log(`   Level 2: ₹${RATES.level2.toLocaleString()} per gaj`);

console.log('\n' + '-'.repeat(80));
console.log('TEST RESULTS FOR BOOKED PLOTS:');
console.log('-'.repeat(80));

let totalProjectedCommission = 0;
let validBookedPlots = 0;

testPlots.forEach((plot, index) => {
    console.log(`\n📍 Test Case ${index + 1}: ${plot.description}`);
    console.log(`   Plot ID: ${plot.id}`);
    console.log(`   Plot Number: ${plot.plotNumber}`);
    console.log(`   Project: ${plot.projectName}`);
    console.log(`   Area: ${plot.area} gaj`);
    console.log(`   Status: ${plot.status}`);
    console.log(`   Paid Percentage: ${plot.paidPercentage}%`);

    const isProjectedWallet = plot.paidPercentage < 75;
    console.log(`   ✓ Included in Projected Wallet: ${isProjectedWallet ? 'YES' : 'NO (≥75% paid)'}`);

    const breakdown = getCommissionBreakdown(plot.area);
    
    console.log(`\n   💰 Commission Breakdown:`);
    console.log(`      Direct Commission:  ₹${breakdown.direct.toLocaleString()} (${plot.area} gaj × ₹${RATES.direct})`);
    console.log(`      Level 1 Commission: ₹${breakdown.level1.toLocaleString()} (${plot.area} gaj × ₹${RATES.level1})`);
    console.log(`      Level 2 Commission: ₹${breakdown.level2.toLocaleString()} (${plot.area} gaj × ₹${RATES.level2})`);
    console.log(`      ─────────────────────────`);
    console.log(`      Total Commission:   ₹${breakdown.total.toLocaleString()}`);

    if (isProjectedWallet) {
        totalProjectedCommission += breakdown.direct;
        validBookedPlots++;
        console.log(`\n   ✅ PROJECTED COMMISSION (Direct only): ₹${breakdown.direct.toLocaleString()}`);
    } else {
        console.log(`\n   ⏸️ PENDING (Not in projected wallet, ≥75% paid)`);
    }
});

console.log('\n' + '='.repeat(80));
console.log('SUMMARY - PROJECTED COMMISSION WALLET');
console.log('='.repeat(80));
console.log(`\nTotal Booked Plots: ${testPlots.length}`);
console.log(`Plots < 75% Paid: ${validBookedPlots}`);
console.log(`Total Projected Commission (Direct): ₹${totalProjectedCommission.toLocaleString()}`);

console.log('\n' + '='.repeat(80));
console.log('SPECIFIC TEST CASES - VERIFY CALCULATIONS');
console.log('='.repeat(80));

const verificationTests = [
    { area: 100, expectedDirect: 100000, expectedLevel1: 20000, expectedLevel2: 5000 },
    { area: 300, expectedDirect: 300000, expectedLevel1: 60000, expectedLevel2: 15000 },
    { area: 250, expectedDirect: 250000, expectedLevel1: 50000, expectedLevel2: 12500 },
    { area: 150, expectedDirect: 150000, expectedLevel1: 30000, expectedLevel2: 7500 }
];

let allTestsPassed = true;

verificationTests.forEach((test, index) => {
    const breakdown = getCommissionBreakdown(test.area);
    const directMatch = breakdown.direct === test.expectedDirect;
    const level1Match = breakdown.level1 === test.expectedLevel1;
    const level2Match = breakdown.level2 === test.expectedLevel2;
    const passed = directMatch && level1Match && level2Match;

    console.log(`\n✓ Test ${index + 1}: ${test.area} gaj plot`);
    console.log(`  Direct: ₹${breakdown.direct.toLocaleString()} ${directMatch ? '✅' : '❌'} (Expected: ₹${test.expectedDirect.toLocaleString()})`);
    console.log(`  Level1: ₹${breakdown.level1.toLocaleString()} ${level1Match ? '✅' : '❌'} (Expected: ₹${test.expectedLevel1.toLocaleString()})`);
    console.log(`  Level2: ₹${breakdown.level2.toLocaleString()} ${level2Match ? '✅' : '❌'} (Expected: ₹${test.expectedLevel2.toLocaleString()})`);
    
    if (!passed) allTestsPassed = false;
});

console.log('\n' + '='.repeat(80));
console.log(allTestsPassed ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED!');
console.log('='.repeat(80));

console.log('\n📝 INTERPRETATION FOR BOOKED PLOTS:');
console.log(`
1. PROJECTED COMMISSION WALLET (Booked plots < 75% paid):
   - Only DIRECT commission is shown in wallet (broker's direct earning)
   - Formula: Plot Area (gaj) × ₹1,000
   - NOT yet withdrawable (locked until 75% payment or sold)

2. FUTURE PAYOUTS (When plot reaches 75% or gets sold):
   - Direct: Plot Area × ₹1,000 → Goes to Broker
   - Level 1: Plot Area × ₹200 → Goes to Upline (Broker's referrer)
   - Level 2: Plot Area × ₹50 → Goes to Level 2 Upline

3. WALLET STATUS:
   - Booked plots < 75%: In "Projected Commission Wallet" (locked)
   - Booked plots ≥ 75%: Waiting for payout trigger
   - Sold plots: Immediate commission distribution
`);

console.log('\n' + '='.repeat(80));
console.log('✅ COMMISSION CALCULATION TEST COMPLETED');
console.log('='.repeat(80) + '\n');
