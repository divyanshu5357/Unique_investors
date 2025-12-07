// This file re-exports all actions for backward compatibility
// Import from individual modules to avoid circular dependencies

// Plot Actions - Phase 1 ✅
export {
    ensureUserProfile,
    addPlot,
    updatePlot,
    removeDuplicatePlots,
    cleanupCorruptPlots,
    analyzeDuplicatePlots,
    canDeletePlot,
    deletePlot,
    bulkAddPlots,
    getPlotHistory,
    getPublicPlots,
    getPlots
} from './plot-actions';

// Commission Actions - Phase 1 ✅
export {
    updateCommission,
    processCommissionCalculation,
    getBrokerCommissions,
    calculateCommissionForSoldPlots,
    recalculateCommissionForPlot
} from './commission-actions';

// Wallet Actions - Phase 1 ✅
export {
    getBrokerWallets,
    manageBrokerWallet,
    reversePlotFinancials,
    setBookedPlotAmounts
} from './wallet-actions';

// Payment Actions - Phase 2 ✅
export {
    getTransactions,
    requestWithdrawal,
    getBrokerTransactions,
    getBrokerWithdrawalRequests,
    getAllWithdrawalRequests,
    processWithdrawalRequest
} from './payment-actions';

// Broker Actions - Phase 2 ✅
export {
    createBroker,
    getBrokers,
    deleteBroker,
    getDownlineTreeForBroker,
    getBrokerHistory,
    getMyDownlineTree,
    getBrokerProfile
} from './broker-actions';

// Verification Actions - Phase 2 ✅
export {
    submitBrokerVerification,
    getBrokerVerificationStatus,
    getAllBrokerVerifications,
    processVerificationRequest,
    submitBrokerReferral,
    getBrokerReferrals,
    processReferralRequest,
} from './verification-actions';

// Booking Actions - Phase 2 ✅
export {
    getBookedPlots,
    getPaymentHistory,
    addPaymentToPlot,
    cancelBookedPlot,
} from './booking-actions';

// Content Actions - Phase 2 ✅
export {
    getTestimonials,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
    submitTestimonial,
    submitContactForm,
    // Gallery functions (moved into content-actions)
    getAdminGalleryImages,
    addGalleryImage,
    updateGalleryImage,
    deleteGalleryImage,
} from './content-actions';

// Dashboard / Analytics Actions
export {
    getDashboardAnalytics,
    getBrokersList,
    getProjectedCommissionWallet,
    backfillAllInitialBookingPayments,
    getBrokerBookedPlots,
    getBrokerSoldPlots,
    getBrokerAllPlots,
    getBrokerPlotHistory,
} from './dashboard-actions';
