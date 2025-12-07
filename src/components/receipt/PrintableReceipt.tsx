'use client';

import React, { forwardRef } from 'react';
import Image from 'next/image';

interface PaymentDetails {
    id: string;
    receiptNumber: string;
    date: string;
    paymentMode: 'bank_transfer' | 'check' | 'cash' | 'upi' | 'credit_card';
    transactionId: string;
}

interface BuyerDetails {
    name: string;
    mobile: string;
    email?: string;
    address: string;
}

interface ProjectDetails {
    projectName: string;
    plotNumber: string;
    block: string;
    area: number; // in sqft or gaj
    dimension?: string;
    facing: string;
}

interface FinancialDetails {
    totalAmount: number;
    bookingAmount: number;
    totalPaidTillDate: number;
    outstandingBalance?: number;
    paymentCompleted?: boolean;
}

export interface PrintableReceiptProps {
    plotType: 'booked' | 'sold';
    paymentDetails: PaymentDetails;
    buyerDetails: BuyerDetails;
    projectDetails: ProjectDetails;
    financialDetails: FinancialDetails;
    salesExecutive?: string;
}

const PrintableReceipt = forwardRef<HTMLDivElement, PrintableReceiptProps>(
    ({
        plotType,
        paymentDetails,
        buyerDetails,
        projectDetails,
        financialDetails,
        salesExecutive = 'Not Assigned',
    }, ref) => {
        const paymentModeLabel = {
            bank_transfer: 'Bank Transfer',
            check: 'Check',
            cash: 'Cash',
            upi: 'UPI',
            credit_card: 'Credit Card',
        }[paymentDetails.paymentMode];

        const formatCurrency = (amount: number) => {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 0,
            }).format(amount);
        };

        const formatDate = (date: string) => {
            return new Date(date).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        };

        return (
            <div
                ref={ref}
                className="w-full bg-white p-6 font-serif receipt receipt-section text-sm"
            >
                {/* Header */}
                <div className="border-b-2 border-gray-800 pb-2 mb-2">
                    <div className="flex items-start justify-between mb-2">
                        {/* Logo and Company Info */}
                        <div className="flex items-center gap-2">
                            <img
                                src="/logo.svg"
                                alt="Unique Investor Logo"
                                width={48}
                                height={48}
                                className="w-12 h-12 rounded-lg"
                            />
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">
                                    UNIQUE INVESTOR
                                </h1>
                                <p className="text-xs text-gray-600 mt-0">
                                    Where Dream Come True
                                </p>
                            </div>
                        </div>

                        {/* Receipt Type Badge */}
                        <div className="text-right">
                            <div
                                className={`inline-block px-2 py-1 rounded-lg font-bold text-white text-xs ${
                                    plotType === 'booked'
                                        ? 'bg-blue-600'
                                        : 'bg-green-600'
                                }`}
                            >
                                {plotType === 'booked'
                                    ? 'BOOKING RECEIPT'
                                    : 'SALE RECEIPT'}
                            </div>
                        </div>
                    </div>

                    {/* Company Contact Details */}
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-700 mt-1">
                        <div>
                            <p className="font-semibold text-xs">Address:</p>
                            <p className="text-xs leading-tight">Shop no. 2, 1st floor, Shree Shahmal Pahalwan Complex,</p>
                            <p className="text-xs leading-tight">near Brahma Mandir, Opposite Gaur City 14th Avenue</p>
                            <p className="text-xs leading-tight">Gr.noida 201301, India</p>
                        </div>
                        <div>
                            <p className="font-semibold text-xs">Contact:</p>
                            <p className="text-xs">Phone: +91 88103 17477</p>
                            <p className="text-xs">Email: uniqueinvestor@yahoo.com</p>
                        </div>
                        <div>
                            <p className="font-semibold text-xs">Receipt No:</p>
                            <p className="text-sm font-bold text-gray-900 mt-0">
                                {paymentDetails.receiptNumber}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Receipt Details - Top Section */}
                <div className="grid grid-cols-4 gap-2 mb-2 text-xs">
                    <div>
                        <p className="text-gray-600 font-semibold text-xs">Date</p>
                        <p className="font-bold text-gray-900 text-xs">
                            {formatDate(paymentDetails.date)}
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-600 font-semibold text-xs">Payment Mode</p>
                        <p className="font-bold text-gray-900 text-xs">{paymentModeLabel}</p>
                    </div>
                    <div>
                        <p className="text-gray-600 font-semibold text-xs">Transaction ID</p>
                        <p className="font-bold text-gray-900 text-xs">
                            {paymentDetails.transactionId || 'N/A'}
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-600 font-semibold text-xs">Sales Executive</p>
                        <p className="font-bold text-gray-900 text-xs">{salesExecutive}</p>
                    </div>
                </div>

                {/* Buyer Details */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-2">
                    <h3 className="font-bold text-gray-900 mb-1 text-xs">
                        BUYER INFORMATION
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <p className="text-gray-600 font-semibold text-xs">Buyer Name</p>
                            <p className="font-bold text-gray-900 text-xs">
                                {buyerDetails.name}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600 font-semibold text-xs">Mobile</p>
                            <p className="font-bold text-gray-900 text-xs">
                                {buyerDetails.mobile}
                            </p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-gray-600 font-semibold text-xs">Address</p>
                            <p className="font-bold text-gray-900 text-xs">
                                {buyerDetails.address}
                            </p>
                        </div>
                        {buyerDetails.email && (
                            <div className="col-span-2">
                                <p className="text-gray-600 font-semibold text-xs">Email</p>
                                <p className="font-bold text-gray-900 text-xs">
                                    {buyerDetails.email}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Project Details */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-2">
                    <h3 className="font-bold text-gray-900 mb-1 text-xs">
                        PROJECT DETAILS
                    </h3>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                            <p className="text-gray-600 font-semibold text-xs">Project Name</p>
                            <p className="font-bold text-gray-900 text-xs">
                                {projectDetails.projectName}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600 font-semibold text-xs">Plot Number</p>
                            <p className="font-bold text-gray-900 text-xs">
                                {projectDetails.plotNumber}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600 font-semibold text-xs">Block</p>
                            <p className="font-bold text-gray-900 text-xs">
                                {projectDetails.block}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600 font-semibold text-xs">Area</p>
                            <p className="font-bold text-gray-900 text-xs">
                                {projectDetails.area} Gaj
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-600 font-semibold text-xs">Facing</p>
                            <p className="font-bold text-gray-900 text-xs">
                                {projectDetails.facing}
                            </p>
                        </div>
                        {projectDetails.dimension && (
                            <div>
                                <p className="text-gray-600 font-semibold text-xs">Dimension</p>
                                <p className="font-bold text-gray-900 text-xs">
                                    {projectDetails.dimension}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Financial Details */}

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-gray-800 rounded-lg p-2 mb-2">
                    <h3 className="font-bold text-gray-900 mb-1 text-xs">
                        PAYMENT DETAILS
                    </h3>
                    <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-700 font-semibold text-xs">
                                Total Amount:
                            </span>
                            <span className="font-bold text-gray-900 text-xs">
                                {formatCurrency(financialDetails.totalAmount)}
                            </span>
                        </div>

                        {plotType === 'booked' && (
                            <>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700 font-semibold text-xs">
                                        Booking Amount:
                                    </span>
                                    <span className="font-bold text-gray-900 text-xs">
                                        {formatCurrency(financialDetails.bookingAmount)}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700 font-semibold text-xs">
                                        Total Paid Till Date:
                                    </span>
                                    <span className="font-bold text-gray-900 text-xs">
                                        {formatCurrency(
                                            financialDetails.totalPaidTillDate
                                        )}
                                    </span>
                                </div>

                                {financialDetails.outstandingBalance !== undefined &&
                                    financialDetails.outstandingBalance > 0 && (
                                        <div className="pt-1 border-t border-gray-300 flex justify-between items-center">
                                            <span className="text-gray-900 font-bold text-xs">
                                                Outstanding Balance:
                                            </span>
                                            <span className="text-red-600 font-bold text-xs">
                                                {formatCurrency(
                                                    financialDetails.outstandingBalance
                                                )}
                                            </span>
                                        </div>
                                    )}
                            </>
                        )}

                        {plotType === 'sold' && (
                            <>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700 font-semibold text-xs">
                                        Total Paid:
                                    </span>
                                    <span className="font-bold text-gray-900 text-xs">
                                        {formatCurrency(
                                            financialDetails.totalPaidTillDate
                                        )}
                                    </span>
                                </div>

                                <div className="pt-1 border-t-2 border-green-600 flex justify-between items-center bg-green-50 -mx-2 px-2 py-1 rounded">
                                    <span className="text-green-900 font-bold text-xs">
                                        Status:
                                    </span>
                                    <span className="text-green-600 font-bold text-xs">
                                        ✓ PAYMENT COMPLETED
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="page-break"></div>

                {/* Terms & Conditions */}
                <div className="bg-gray-50 border border-gray-200 rounded p-2 mb-2 text-xs">
                    <p className="font-bold text-gray-900 mb-1 text-xs">Terms & Conditions:</p>
                    <ul className="space-y-0 text-gray-700 text-xs">
                        <li>
                            • This receipt is a valid proof of payment and should be
                            kept safely for future reference.
                        </li>
                        <li>
                            • All payments are non-refundable as per company policy.
                        </li>
                        <li>
                            • Further payment schedule will be communicated separately.
                        </li>
                        <li>
                            • For discrepancies, contact our office within 7 days.
                        </li>
                    </ul>
                </div>

                {/* Footer */}
                <div className="border-t-2 border-gray-800 pt-1 text-center text-xs">
                    <p className="text-gray-700 font-semibold mb-0 text-xs">
                        Thank you for choosing Unique Investor
                    </p>
                    <p className="text-gray-600 text-xs mb-1">
                        Authorized Digital Receipt - Generated on {formatDate(new Date().toISOString())}
                    </p>
                    <div className="flex justify-end gap-8 text-xs">
                        <div className="text-center">
                            <p className="text-gray-700 font-semibold mb-3 text-xs">
                                Authorized Signatory
                            </p>
                            <p className="text-gray-600 text-xs">________________</p>
                            <p className="text-gray-600 text-xs">Name & Signature</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

PrintableReceipt.displayName = 'PrintableReceipt';

export default PrintableReceipt;
