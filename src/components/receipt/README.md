# Receipt Components Documentation

Professional printable receipt system for booked and sold plots with A4 optimization.

## Components

### 1. `PrintableReceipt.tsx`
Core receipt component with full layout and styling.

**Features:**
- ✅ Company header with logo and branding
- ✅ Receipt metadata (number, date, payment mode, transaction ID)
- ✅ Buyer information (name, mobile, email, address)
- ✅ Project details (name, plot number, block, area, facing, dimension)
- ✅ Financial details with conditional logic for booked vs sold plots
- ✅ Terms & conditions section
- ✅ Professional footer with authorized signatory line
- ✅ A4 optimized for printing
- ✅ TypeScript interfaces for type safety

**Props Interface:**
```typescript
export interface PrintableReceiptProps {
    plotType: 'booked' | 'sold';
    paymentDetails: {
        id: string;
        receiptNumber: string;
        date: string;  // formatted date string
        paymentMode: 'bank_transfer' | 'check' | 'cash' | 'upi' | 'credit_card';
        transactionId: string;
    };
    buyerDetails: {
        name: string;
        mobile: string;
        email?: string;
        address: string;
    };
    projectDetails: {
        projectName: string;
        plotNumber: string;
        block: string;
        area: number;  // in Gaj
        dimension?: string;  // e.g., "50 x 50 ft"
        facing: string;
    };
    financialDetails: {
        totalAmount: number;
        bookingAmount: number;
        totalPaidTillDate: number;
        outstandingBalance?: number;  // optional for sold plots
        paymentCompleted?: boolean;
    };
    salesExecutive?: string;
}
```

### 2. `ReceiptPrintWrapper.tsx`
Wrapper component with print and download functionality.

**Features:**
- 🖨️ Native browser print functionality
- 📥 PDF download support
- ✕ Close button for modal dialogs
- Responsive button styling
- No external dependencies required (removed react-to-print)

**Usage:**
```typescript
import { ReceiptPrintWrapper } from '@/components/receipt';

<ReceiptPrintWrapper
    plotType="booked"
    paymentDetails={...}
    buyerDetails={...}
    projectDetails={...}
    financialDetails={...}
    onClose={() => setShowModal(false)}
    showPrintButtons={true}
/>
```

### 3. `ReceiptExample.tsx`
Example component demonstrating receipt usage with sample data.

**Features:**
- Toggle between booked and sold plot receipts
- Quick preview with key details
- Modal view with full receipt
- Sample data for both receipt types

## Styling

### `receipt-print.css`
Print-optimized stylesheet with:
- A4 page setup (210mm × 297mm)
- Color preservation for printing (`print-color-adjust: exact`)
- Page break prevention within sections
- Print-specific UI element hiding
- Responsive screen display styling

**Media Queries:**
- `@media print` - Print-specific rules
- `@media screen` - Screen display rules
- `@page` - A4 page configuration

## Quick Start

### 1. Display a Receipt in Modal
```typescript
import { useState } from 'react';
import { ReceiptPrintWrapper } from '@/components/receipt';

export function PaymentPage() {
    const [showReceipt, setShowReceipt] = useState(false);

    return (
        <>
            <button onClick={() => setShowReceipt(true)}>
                View Receipt
            </button>

            {showReceipt && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <ReceiptPrintWrapper
                            plotType="booked"
                            paymentDetails={{
                                id: 'pd-001',
                                receiptNumber: 'RCP-2024-001',
                                date: new Date().toLocaleDateString('en-IN'),
                                paymentMode: 'bank_transfer',
                                transactionId: 'TXN-2024-12345',
                            }}
                            buyerDetails={{
                                name: 'John Doe',
                                mobile: '+91 98765 43210',
                                address: '123 Main St',
                            }}
                            projectDetails={{
                                projectName: 'Project Name',
                                plotNumber: 'A-101',
                                block: 'Block A',
                                area: 2500,
                                facing: 'North',
                            }}
                            financialDetails={{
                                totalAmount: 1250000,
                                bookingAmount: 125000,
                                totalPaidTillDate: 500000,
                                outstandingBalance: 750000,
                            }}
                            onClose={() => setShowReceipt(false)}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
```

### 2. Integrate with Payment Confirmation
```typescript
// In your payment success handler
<ReceiptPrintWrapper
    plotType="sold"
    paymentDetails={paymentData}
    buyerDetails={buyerData}
    projectDetails={projectData}
    financialDetails={{
        totalAmount: projectData.price,
        bookingAmount: projectData.price,
        totalPaidTillDate: projectData.price,
        paymentCompleted: true,
    }}
    salesExecutive="Sales Team Name"
/>
```

## Formatting Rules

### Currency Display
- Format: Indian Rupees (₹)
- Separator: Commas for thousands
- Example: ₹12,50,000

### Date Format
- Format: DD/MM/YYYY (Indian locale)
- Example: 15/01/2024

### Payment Modes Supported
- `bank_transfer` → "Bank Transfer"
- `check` → "Check"
- `cash` → "Cash"
- `upi` → "UPI"
- `credit_card` → "Credit Card"

## Receipt Types

### Booked Plot Receipt
Displays:
- Total Amount
- Booking Amount
- Total Paid Till Date
- **Outstanding Balance** (only if > 0)

### Sold Plot Receipt
Displays:
- Total Amount
- Total Paid Till Date
- "PAYMENT COMPLETED" badge

## Print Instructions

### Browser Print Dialog
1. Click "Print Receipt" button
2. Select "Save as PDF" for PDF download
3. Or select physical printer for direct printing
4. Page format: A4 (210 × 297 mm)

### Print Settings
- **Orientation:** Portrait
- **Paper Size:** A4
- **Margins:** 0mm (pre-configured)
- **Color:** Enable color printing for professional appearance

## Business Requirements Met

✅ Company logo, name, address, contact details  
✅ Receipt number, date, payment mode, transaction ID  
✅ Buyer details with optional email  
✅ Project details (name, plot number, block, area, facing, dimension)  
✅ Payment details with conditional logic  
✅ Outstanding balance hidden when zero  
✅ "Sales Executive" instead of "Broker"  
✅ Terms & conditions (4-point disclaimer)  
✅ Footer with thank you message and signature line  
✅ A4 optimized for professional printing  

## File Structure

```
src/components/receipt/
├── PrintableReceipt.tsx      (316 lines) - Core receipt component
├── ReceiptPrintWrapper.tsx   (93 lines)  - Print wrapper with UI
├── ReceiptExample.tsx        (221 lines) - Example/demo component
├── index.ts                  (3 lines)   - Barrel exports
└── README.md                 (this file) - Documentation
```

## Styling Assets

```
src/styles/
└── receipt-print.css         (180 lines) - A4 print optimization
```

## Integration Checklist

- [ ] Import receipt components in payment pages
- [ ] Add print receipt button to transaction history
- [ ] Display receipt on booking confirmation
- [ ] Display receipt on payment completion
- [ ] Test print to PDF
- [ ] Test on physical printer
- [ ] Verify A4 layout rendering
- [ ] Test color preservation in print

## Error Handling

All type errors have been resolved:
- ✅ Interface types properly exported
- ✅ No external dependencies required
- ✅ Native browser print API used
- ✅ TypeScript strict mode compliant

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Display only (printing varies by device)

## Notes

- Receipt date is automatically formatted to Indian locale (en-IN)
- Currency formatting uses Indian number system (₹)
- Component uses `forwardRef` for print reference handling
- Tailwind CSS classes used for styling (ensure Tailwind is configured)
- Print styles defined in `receipt-print.css` media query
