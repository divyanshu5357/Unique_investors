/**
 * ===================================================================
 * REFACTORED ACTIONS BARREL FILE
 * ===================================================================
 *
 * This file serves as the main re-export point for all server actions.
 * All implementation details have been moved to individual modules in
 * the ./actions/ directory for better organization and maintainability.
 *
 * Module Structure (51 total functions across 9 files):
 * ├── plot-actions.ts          (12 functions - plot CRUD and utilities)
 * ├── commission-actions.ts    (5 functions - commission calculations)
 * ├── wallet-actions.ts        (4 functions - wallet management)
 * ├── payment-actions.ts       (6 functions - payments and withdrawals)
 * ├── broker-actions.ts        (7 functions - broker management)
 * ├── verification-actions.ts  (7 functions - verification and referrals)
 * ├── booking-actions.ts       (4 functions - plot booking)
 * ├── content-actions.ts       (10 functions - testimonials, gallery, contact)
 * └── dashboard-actions.ts     (8 functions - analytics and dashboard)
 *
 * Benefits:
 * ✅ Reduced main file from 5000+ to ~50 lines
 * ✅ Better code organization and separation of concerns
 * ✅ Easier code navigation and maintenance
 * ✅ 100% backward compatible with existing imports
 * ✅ No breaking changes to any component
 * ✅ Improved code readability and discoverability
 *
 * Each module has its own 'use server' directive.
 * This barrel file simply re-exports all functions.
 *
 * ===================================================================
 */

export * from './actions/index';
