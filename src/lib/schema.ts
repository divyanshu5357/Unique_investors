
import { z } from 'zod';

// Removed Firebase admin imports - now using Supabase only

export const PlotSchema = z.object({
    id: z.string(),
    projectName: z.string().min(1, 'Project name is required'),
    type: z.string().min(1, 'Type is required'),
    block: z.string().min(1, 'Block is required'),
    plotNumber: z.coerce.number().int().positive('Plot number must be a positive integer'),
    status: z.enum(['available', 'booked', 'sold']),
    dimension: z.string().min(1, 'Dimension is required'),
    area: z.coerce.number().positive('Area must be a positive number'),
    buyerName: z.string().optional().nullable(),
    salePrice: z.coerce.number().optional().nullable(),
    commissionRate: z.coerce.number().optional().nullable(),
    // Admin-only fields
    brokerName: z.string().optional().nullable(),
    brokerId: z.string().optional().nullable(),
    sellerName: z.string().optional().nullable(),
    soldAmount: z.coerce.number().optional().nullable(),
    // Booked plots management fields
    totalPlotAmount: z.coerce.number().optional().nullable(),
    bookingAmount: z.coerce.number().optional().nullable(),
    remainingAmount: z.coerce.number().optional().nullable(),
    tenureMonths: z.coerce.number().int().optional().nullable(),
    paidPercentage: z.coerce.number().optional().nullable(),
    commissionStatus: z.enum(['pending', 'paid']).optional().nullable(),
    createdAt: z.any().optional(),
    updatedAt: z.any().optional(),
    updatedBy: z.string().optional().nullable(),
});

export type Plot = z.infer<typeof PlotSchema>;

export const PaymentHistorySchema = z.object({
    id: z.string(),
    plotId: z.string(),
    buyerName: z.string(),
    brokerId: z.string().optional().nullable(),
    amountReceived: z.number(),
    paymentDate: z.string(), // ISO date string
    notes: z.string().optional().nullable(),
    updatedBy: z.string().optional().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type PaymentHistory = z.infer<typeof PaymentHistorySchema>;

// Form schema for adding new payment
export const addPaymentSchema = z.object({
    plotId: z.string().min(1, 'Plot ID is required'),
    amountReceived: z.coerce.number().positive('Amount must be positive'),
    paymentDate: z.string().min(1, 'Payment date is required'),
    notes: z.string().optional(),
});

// Form schema for creating/editing booked plots
export const bookedPlotSchema = z.object({
    projectName: z.string().min(1, 'Project name is required'),
    type: z.string().min(1, 'Type is required'),
    block: z.string().min(1, 'Block is required'),
    plotNumber: z.coerce.number().int().positive('Plot number must be positive'),
    dimension: z.string().min(1, 'Dimension is required'),
    area: z.coerce.number().positive('Area must be positive'),
    buyerName: z.string().min(1, 'Buyer name is required'),
    brokerId: z.string().min(1, 'Broker is required'),
    totalPlotAmount: z.coerce.number().positive('Total plot amount is required'),
    bookingAmount: z.coerce.number().positive('Booking amount is required'),
    tenureMonths: z.coerce.number().int().positive('Tenure must be positive'),
});

export const Wallet = z.object({
    id: z.string(),
    ownerId: z.string(),
    directSaleBalance: z.number().default(0),
    downlineSaleBalance: z.number().default(0),
    totalBalance: z.number().default(0),
});

export type Wallet = z.infer<typeof Wallet>;

export const Transaction = z.object({
    id: z.string(),
    walletId: z.string(),
    walletType: z.enum(['direct', 'downline']),
    type: z.enum(['credit', 'debit', 'withdrawal']),
    amount: z.number(),
    date: z.string(), // ISO date string from Supabase
    description: z.string(),
    paymentMode: z.string().optional().nullable(),
    transactionId: z.string().optional().nullable(),
    proofUrl: z.string().url().optional().nullable(),
    // New fields for withdrawal functionality
    status: z.enum(['pending', 'approved', 'rejected', 'completed']).optional(),
    note: z.string().optional().nullable(),
    processedBy: z.string().optional().nullable(),
    processedAt: z.string().optional().nullable(),
});

export type Transaction = z.infer<typeof Transaction>;

// Enhanced withdrawal request schema
export const WithdrawalRequest = z.object({
    id: z.string(),
    brokerId: z.string(),
    brokerName: z.string(),
    brokerEmail: z.string(),
    amount: z.number().positive(),
    status: z.enum(['pending', 'approved', 'rejected']),
    requestedAt: z.string(),
    processedAt: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
    paymentType: z.enum(['cash', 'cheque', 'online_transfer']).optional().nullable(),
    proofImageUrl: z.string().url().optional().nullable(),
    processedBy: z.string().optional().nullable(), // Admin ID who processed the request
    rejectionReason: z.string().optional().nullable(),
});

export type WithdrawalRequest = z.infer<typeof WithdrawalRequest>;

// Form schemas
export const withdrawalRequestSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
    note: z.string().optional(),
});

export const processWithdrawalSchema = z.object({
    requestId: z.string(),
    action: z.enum(['approve', 'reject']),
    paymentType: z.enum(['cash', 'cheque', 'online_transfer']).optional(),
    proofImageUrl: z.string().url().optional(),
    rejectionReason: z.string().optional(),
});

// Broker Verification schemas
export const BrokerVerification = z.object({
    id: z.string(),
    brokerId: z.string(),
    brokerName: z.string(),
    brokerEmail: z.string(),
    fullName: z.string(),
    idType: z.enum(['aadhar', 'pan', 'passport', 'driving_license']),
    idNumber: z.string(),
    idImageData: z.string(), // Base64 encoded image data
    idImageType: z.string(), // MIME type (e.g., 'image/jpeg', 'image/png')
    idImageSize: z.number(), // File size in bytes
    status: z.enum(['pending', 'approved', 'rejected']),
    createdAt: z.string(),
    processedAt: z.string().optional().nullable(),
    processedBy: z.string().optional().nullable(),
    rejectionReason: z.string().optional().nullable(),
});

export type BrokerVerification = z.infer<typeof BrokerVerification>;

// Form schemas for verification
export const brokerVerificationSubmissionSchema = z.object({
    fullName: z.string().min(1, 'Full name is required'),
    email: z.string().email('Invalid email address').min(1, 'Email is required'),
    mobileNumber: z.string().min(10, 'Mobile number must be at least 10 digits').regex(/^[0-9+\-\s()]+$/, 'Please enter a valid mobile number'),
    address: z.string().min(10, 'Address must be at least 10 characters'),
    idType: z.enum(['aadhar', 'pan', 'passport', 'driving_license'], {
        required_error: 'Please select an ID type'
    }),
    idNumber: z.string().min(1, 'ID number is required').refine((val) => {
        // Basic validation based on ID type
        const cleanVal = val.replace(/\s/g, '');
        return cleanVal.length >= 6; // Minimum length check
    }, 'Invalid ID number format'),
    idImageData: z.string().min(1, 'Please upload a document image'),
    idImageType: z.string().min(1, 'Image type is required'),
    idImageSize: z.number().positive('Image size must be positive'),
});

export const processVerificationSchema = z.object({
    verificationId: z.string(),
    action: z.enum(['approve', 'reject']),
    rejectionReason: z.string().optional(),
});

// Broker Referral schemas
export const BrokerReferral = z.object({
    id: z.string(),
    referrerId: z.string(),
    referrerName: z.string(),
    referrerEmail: z.string(),
    referredName: z.string(),
    referredEmail: z.string(),
    referredPhone: z.string(),
    note: z.string().optional().nullable(),
    status: z.enum(['pending', 'approved', 'rejected']),
    createdAt: z.string(),
    processedAt: z.string().optional().nullable(),
    processedBy: z.string().optional().nullable(),
    rejectionReason: z.string().optional().nullable(),
    // New broker details when approved
    newBrokerId: z.string().optional().nullable(),
});

export type BrokerReferral = z.infer<typeof BrokerReferral>;

// Form schema for broker referral submission
export const brokerReferralSubmissionSchema = z.object({
    referredName: z.string().min(2, 'Full name must be at least 2 characters'),
    referredEmail: z.string().email('Please enter a valid email address'),
    referredPhone: z.string().min(10, 'Phone number must be at least 10 digits').regex(/^[+]?[\d\s\-()]+$/, 'Please enter a valid phone number'),
    note: z.string().max(500, 'Note cannot exceed 500 characters').optional(),
});

export const processReferralSchema = z.object({
    referralId: z.string(),
    action: z.enum(['approve', 'reject']),
    rejectionReason: z.string().optional(),
    // New broker account details when approving
    username: z.string().min(3, 'Username must be at least 3 characters').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    role: z.enum(['broker']).default('broker').optional(),
    // Referral details for profile creation
    referredName: z.string().optional(),
    referredEmail: z.string().optional(),
    referredPhone: z.string().optional(),
    referrerId: z.string().optional(),
    referrerName: z.string().optional(),
});

// Commission schemas
export const Commission = z.object({
    id: z.string(),
    saleId: z.string(),
    sellerId: z.string(), // The broker who made the sale
    sellerName: z.string(),
    receiverId: z.string(), // The upline broker receiving commission
    receiverName: z.string(),
    level: z.number().int().min(1).max(3), // 1, 2, or 3 levels up
    amount: z.number().positive(),
    percentage: z.number().positive().max(100),
    saleAmount: z.number().positive(),
    createdAt: z.string(),
    plotId: z.string().optional().nullable(),
    projectName: z.string().optional().nullable(),
});

export type Commission = z.infer<typeof Commission>;

// Sales record schema
export const Sale = z.object({
    id: z.string(),
    plotId: z.string(),
    projectName: z.string(),
    brokerId: z.string(),
    brokerName: z.string(),
    amount: z.number().positive(),
    saleDate: z.string(),
    buyerName: z.string(),
    commissionRate: z.number().positive().max(100),
    createdAt: z.string(),
});

export type Sale = z.infer<typeof Sale>;

// Dashboard analytics types
export const DashboardSummary = z.object({
    totalSales: z.number(),
    totalCommissionPaid: z.number(),
    companyTurnover: z.number(),
    totalPlotsSold: z.number(),
    activeBrokers: z.number(),
});

export type DashboardSummary = z.infer<typeof DashboardSummary>;

export const MonthlyData = z.object({
    month: z.string(), // Format: "2024-01", "2024-02", etc.
    monthName: z.string(), // Format: "Jan 2024", "Feb 2024", etc.
    totalSales: z.number(),
    commissionPaid: z.number(),
    companyTurnover: z.number(),
});

export type MonthlyData = z.infer<typeof MonthlyData>;

export const DashboardFilters = z.object({
    startDate: z.string().optional(), // ISO date string
    endDate: z.string().optional(), // ISO date string
    brokerId: z.string().optional(),
    brokerName: z.string().optional(),
});

export type DashboardFilters = z.infer<typeof DashboardFilters>;

export const DashboardAnalytics = z.object({
    summary: DashboardSummary,
    monthlyData: z.array(MonthlyData),
    filters: DashboardFilters.optional(),
});

export type DashboardAnalytics = z.infer<typeof DashboardAnalytics>;

// Ensures that if status is 'sold', then salePrice and commissionRate are required and positive.
export const PlotFormValidationSchema = PlotSchema.omit({ id: true, createdAt: true, updatedAt: true, updatedBy: true }).superRefine((data, ctx) => {
    if (data.status === 'sold') {
        if (!data.salePrice || data.salePrice <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['salePrice'],
                message: 'Sale price is required and must be positive when plot is sold.',
            });
        }
        if (!data.commissionRate || data.commissionRate <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['commissionRate'],
                message: 'Commission rate is required and must be positive when plot is sold.',
            });
        }
        if (!data.brokerId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['brokerId'],
                message: 'Broker is required when plot is sold.',
            });
        }
        // Removed soldAmount validation as we now only use salePrice field
    }
});
