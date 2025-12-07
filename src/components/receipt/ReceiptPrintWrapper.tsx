'use client';

import React, { useRef } from 'react';
import PrintableReceipt, { PrintableReceiptProps } from './PrintableReceipt';

interface ReceiptPrintWrapperProps extends PrintableReceiptProps {
  onClose?: () => void;
  showPrintButtons?: boolean;
}

export const ReceiptPrintWrapper: React.FC<ReceiptPrintWrapperProps> = ({
  onClose,
  showPrintButtons = true,
  ...receiptProps
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print(); // ✅ USE SAME PAGE
  };

  const handleDownloadPDF = () => {
    window.print(); // ✅ BROWSER WILL OFFER "Save as PDF"
  };

  return (
    <div className="w-full">
      {showPrintButtons && (
        <div className="flex justify-center gap-4 mb-6 print:hidden no-print">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            🖨️ Print Receipt
          </button>

          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
          >
            📥 Download PDF
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition"
            >
              ✕ Close
            </button>
          )}
        </div>
      )}

      {/* ✅ Receipt Print Area */}
      <div
        ref={contentRef}
        className="bg-white receipt-container"
        data-printable-receipt
      >
        <PrintableReceipt {...receiptProps} />
      </div>
    </div>
  );
};

export default ReceiptPrintWrapper;
