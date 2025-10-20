import { z } from 'zod';

export interface SoldPlot {
    id: string;
    projectName: string;
    plotNumber: number;
    buyerName: string;
    salePrice: number;
    status: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Broker {
    id: string;
    created_at: string;
    full_name: string | null;
    email: string | undefined;
    soldPlots?: SoldPlot[];
    directSaleBalance?: number;
    downlineSaleBalance?: number;
    totalBalance?: number;
}

export interface DownlineTreeData {
    id: string;
    full_name: string | null;
    children: DownlineTreeData[];
}

// Transaction-related interfaces
export interface TransactionRecord {
    id: string;
    walletId: string;
    walletType: 'direct' | 'downline';
    type: 'credit' | 'debit' | 'withdrawal';
    amount: number;
    date: string;
    description: string;
    paymentMode?: string | null;
    transactionId?: string | null;
    proofUrl?: string | null;
    status?: 'pending' | 'approved' | 'rejected' | 'completed';
    note?: string | null;
    processedBy?: string | null;
    processedAt?: string | null;
}

export interface WithdrawalRequestRecord {
    id: string;
    brokerId: string;
    brokerName: string;
    brokerEmail: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: string;
    processedAt?: string | null;
    note?: string | null;
    paymentType?: 'cash' | 'cheque' | 'online_transfer' | null;
    proofImageUrl?: string | null;
    processedBy?: string | null;
    rejectionReason?: string | null;
}

// Broker Verification interfaces
export interface BrokerVerificationRecord {
    id: string;
    brokerId: string;
    brokerName: string;
    brokerEmail: string;
    fullName: string;
    idType: 'aadhaar' | 'pan' | 'driving_license';
    idNumber: string;
    idImageData: string; // Base64 encoded image data
    idImageType: string; // MIME type
    idImageSize: number; // File size in bytes
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    processedAt?: string | null;
    processedBy?: string | null;
    rejectionReason?: string | null;
}

// Broker Referral interfaces
export interface BrokerReferralRecord {
    id: string;
    referrerId: string;
    referrerName: string;
    referrerEmail: string;
    referredName: string;
    referredEmail: string;
    referredPhone: string;
    note?: string | null;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    processedAt?: string | null;
    processedBy?: string | null;
    rejectionReason?: string | null;
    newBrokerId?: string | null;
}

// Commission interfaces
export interface CommissionRecord {
    id: string;
    saleId: string;
    sellerId: string;
    sellerName: string;
    receiverId: string;
    receiverName: string;
    level: number;
    amount: number;
    percentage: number;
    saleAmount: number;
    createdAt: string;
    plotId?: string | null;
    projectName?: string | null;
}

export const withdrawalSchema = z.object({
    amount: z.number().positive(),
    paymentMode: z.string(),
    paymentDetails: z.any(),
});