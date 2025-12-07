'use client';

import React, { useState } from 'react';
import { ReceiptPrintWrapper } from './ReceiptPrintWrapper';
import type { PrintableReceiptProps } from './PrintableReceipt';

export const ReceiptExample: React.FC = () => {
    const [selectedType, setSelectedType] = useState<'booked' | 'sold'>('booked');
    const [showModal, setShowModal] = useState(false);

    const bookedPlotReceipt: PrintableReceiptProps = {
        plotType: 'booked',
        paymentDetails: {
            id: 'pd-001',
            receiptNumber: 'RCP-2024-001',
            date: new Date().toLocaleDateString('en-IN'),
            paymentMode: 'bank_transfer',
            transactionId: 'TXN-2024-12345678',
        },
        buyerDetails: {
            name: 'John Doe',
            mobile: '+91 98765 43210',
            email: 'john.doe@example.com',
            address: '123, MG Road, Bangalore - 560001',
        },
        projectDetails: {
            projectName: 'Unique Investors Paradise',
            plotNumber: 'A-101',
            block: 'Block A',
            area: 2500,
            facing: 'North',
            dimension: '50 x 50 ft',
        },
        financialDetails: {
            totalAmount: 1250000,
            bookingAmount: 125000,
            totalPaidTillDate: 500000,
            outstandingBalance: 750000,
        },
        salesExecutive: 'Rajesh Kumar',
    };

    const soldPlotReceipt: PrintableReceiptProps = {
        plotType: 'sold',
        paymentDetails: {
            id: 'pd-002',
            receiptNumber: 'RCP-2024-002',
            date: new Date().toLocaleDateString('en-IN'),
            paymentMode: 'check',
            transactionId: 'CHQ-2024-98765432',
        },
        buyerDetails: {
            name: 'Jane Smith',
            mobile: '+91 87654 32109',
            email: 'jane.smith@example.com',
            address: '456, Whitefield, Bangalore - 560066',
        },
        projectDetails: {
            projectName: 'Unique Investors Paradise',
            plotNumber: 'B-205',
            block: 'Block B',
            area: 3000,
            facing: 'East',
            dimension: '60 x 50 ft',
        },
        financialDetails: {
            totalAmount: 1500000,
            bookingAmount: 1500000,
            totalPaidTillDate: 1500000,
            paymentCompleted: true,
        },
        salesExecutive: 'Priya Sharma',
    };

    const currentReceipt = selectedType === 'booked' ? bookedPlotReceipt : soldPlotReceipt;

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Receipt Preview</h1>
                    <p className="text-gray-600">View and print receipts for booked and sold plots</p>
                </div>

                {/* Controls */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <div className="flex items-center gap-4 mb-6">
                        <label className="font-semibold text-gray-700">Select Receipt Type:</label>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setSelectedType('booked')}
                                className={`px-6 py-2 rounded-lg font-medium transition ${
                                    selectedType === 'booked'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                }`}
                            >
                                Booked Plot
                            </button>
                            <button
                                onClick={() => setSelectedType('sold')}
                                className={`px-6 py-2 rounded-lg font-medium transition ${
                                    selectedType === 'sold'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                }`}
                            >
                                Sold Plot
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowModal(true)}
                        className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition"
                    >
                        View Full Receipt
                    </button>
                </div>

                {/* Quick Preview */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Preview</h2>
                    
                    <div className="grid grid-cols-2 gap-6 text-sm">
                        {/* Receipt Details */}
                        <div>
                            <h3 className="font-semibold text-gray-700 mb-3">Receipt Details</h3>
                            <div className="space-y-2 text-gray-600">
                                <p><span className="font-medium">Number:</span> {currentReceipt.paymentDetails.receiptNumber}</p>
                                <p><span className="font-medium">Date:</span> {new Date().toLocaleDateString('en-IN')}</p>
                                <p><span className="font-medium">Mode:</span> {currentReceipt.paymentDetails.paymentMode}</p>
                                <p><span className="font-medium">Transaction ID:</span> {currentReceipt.paymentDetails.transactionId}</p>
                            </div>
                        </div>

                        {/* Buyer Details */}
                        <div>
                            <h3 className="font-semibold text-gray-700 mb-3">Buyer Details</h3>
                            <div className="space-y-2 text-gray-600">
                                <p><span className="font-medium">Name:</span> {currentReceipt.buyerDetails.name}</p>
                                <p><span className="font-medium">Mobile:</span> {currentReceipt.buyerDetails.mobile}</p>
                                <p><span className="font-medium">Email:</span> {currentReceipt.buyerDetails.email}</p>
                                <p><span className="font-medium">Address:</span> {currentReceipt.buyerDetails.address}</p>
                            </div>
                        </div>

                        {/* Project Details */}
                        <div>
                            <h3 className="font-semibold text-gray-700 mb-3">Project Details</h3>
                            <div className="space-y-2 text-gray-600">
                                <p><span className="font-medium">Project:</span> {currentReceipt.projectDetails.projectName}</p>
                                <p><span className="font-medium">Plot:</span> {currentReceipt.projectDetails.plotNumber}</p>
                                <p><span className="font-medium">Block:</span> {currentReceipt.projectDetails.block}</p>
                                <p><span className="font-medium">Area:</span> {currentReceipt.projectDetails.area} Gaj</p>
                                <p><span className="font-medium">Facing:</span> {currentReceipt.projectDetails.facing}</p>
                            </div>
                        </div>

                        {/* Financial Details */}
                        <div>
                            <h3 className="font-semibold text-gray-700 mb-3">Payment Details</h3>
                            <div className="space-y-2 text-gray-600">
                                <p><span className="font-medium">Total Amount:</span> ₹{(currentReceipt.financialDetails.totalAmount).toLocaleString('en-IN')}</p>
                                {selectedType === 'booked' && (
                                    <>
                                        <p><span className="font-medium">Booking Amount:</span> ₹{(currentReceipt.financialDetails.bookingAmount).toLocaleString('en-IN')}</p>
                                        <p><span className="font-medium">Total Paid:</span> ₹{(currentReceipt.financialDetails.totalPaidTillDate).toLocaleString('en-IN')}</p>
                                        {currentReceipt.financialDetails.outstandingBalance && (
                                            <p><span className="font-medium">Outstanding:</span> ₹{(currentReceipt.financialDetails.outstandingBalance).toLocaleString('en-IN')}</p>
                                        )}
                                    </>
                                )}
                                {selectedType === 'sold' && (
                                    <p><span className="font-medium">Total Paid:</span> ₹{(currentReceipt.financialDetails.totalPaidTillDate).toLocaleString('en-IN')}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-white rounded-lg max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                                <h2 className="text-xl font-bold">Receipt</h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-gray-500 hover:text-gray-700 font-bold text-xl"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="p-8">
                                <ReceiptPrintWrapper
                                    {...currentReceipt}
                                    onClose={() => setShowModal(false)}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReceiptExample;
