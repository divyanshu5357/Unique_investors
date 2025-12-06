# Role-Based Plot Detail Drawers - Implementation Guide

This document provides a complete guide to implementing and using the new role-based plot detail drawer components.

## Components Created

### 1. **RoleBasedPlotDetailDrawer** (`src/components/admin/RoleBasedPlotDetailDrawer.tsx`)
A comprehensive, role-aware plot details drawer that provides different views and functionality based on user role (Admin vs Broker).

### 2. **PaymentInstallmentDrawer** (`src/components/admin/PaymentInstallmentDrawer.tsx`)
A specialized drawer focused exclusively on payment and installment tracking for Booked and Sold plots.

---

## Features Overview

### RoleBasedPlotDetailDrawer

#### Admin Access (Full Permissions)
- ✅ View all plots of all statuses (Available, Booked, Sold, Cancelled)
- ✅ Edit and delete available plots
- ✅ Add payments and manage booked plots
- ✅ Mark plots as sold
- ✅ Cancel bookings
- ✅ View all tabs including:
  - Overview
  - Specifications
  - Pricing
  - Booking details (if booked)
  - Payment tracking (if booked)
  - Sale details (if sold)
  - **Commission details** (Admin only)
  - **Internal notes** (Admin only)
  - **Full history & audit log** (Admin only)
- ✅ Print plots

#### Broker Access (Read-Only)
- ✅ View only **Booked** and **Sold** plots (owned by them)
- ❌ Cannot edit, delete, or make changes
- ✅ View limited tabs:
  - Overview
  - Specifications
  - Pricing
  - Booking details
  - Payment tracking
  - Sale details
- ❌ No access to:
  - Commission details
  - Internal notes
  - Full history
- ✅ Print plots
- ✅ Visual indicator showing "Read-only access"

### PaymentInstallmentDrawer

Focused view for payment and installment details showing:
- **Payment Summary**
  - Total amount due
  - Amount paid
  - Outstanding balance
  - Payment progress percentage
  - Late fees (if any)
  - Next due date
  - Count of paid/unpaid installments

- **Installments List**
  - Installment date
  - Amount due
  - Payment method
  - Receipt/Reference number
  - Paid/Unpaid/Partial status
  - Late fees applied (if any)
  - Download receipt button (Admin only)

- **Payment History**
  - Timeline of all paid installments
  - Payment dates and amounts
  - Visual payment history

---

## Implementation Guide

### Step 1: Import the Components

```typescript
import { RoleBasedPlotDetailDrawer } from '@/components/admin/RoleBasedPlotDetailDrawer';
import { PaymentInstallmentDrawer } from '@/components/admin/PaymentInstallmentDrawer';
```

### Step 2: Set Up State Management

```typescript
'use client'

import { useState } from 'react';
import { Plot } from '@/lib/schema';

export default function YourComponent() {
    const [isPlotDrawerOpen, setIsPlotDrawerOpen] = useState(false);
    const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
    const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
    const [userRole, setUserRole] = useState<'admin' | 'broker'>('admin');

    // ... rest of component
}
```

### Step 3: Use in Your Component

#### Example 1: Admin Inventory Page

```typescript
'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RoleBasedPlotDetailDrawer } from '@/components/admin/RoleBasedPlotDetailDrawer';
import { getPlots, updatePlot, deletePlot } from '@/lib/actions';
import { useEffect } from 'react';

export default function AdminInventoryPage() {
    const [plots, setPlots] = useState([]);
    const [selectedPlot, setSelectedPlot] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        const fetchPlots = async () => {
            const data = await getPlots();
            setPlots(data);
        };
        fetchPlots();
    }, []);

    const handleViewPlot = (plot) => {
        setSelectedPlot(plot);
        setIsDrawerOpen(true);
    };

    return (
        <>
            <div className="grid gap-4">
                {plots.map(plot => (
                    <div key={plot.id} className="flex items-center justify-between p-4 border rounded">
                        <div>
                            <p className="font-semibold">Plot #{plot.plotNumber}</p>
                            <p className="text-sm text-muted-foreground">{plot.projectName}</p>
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={() => handleViewPlot(plot)}
                        >
                            View Details
                        </Button>
                    </div>
                ))}
            </div>

            {/* Plot Detail Drawer */}
            <RoleBasedPlotDetailDrawer
                isOpen={isDrawerOpen}
                onClose={() => {
                    setIsDrawerOpen(false);
                    setSelectedPlot(null);
                }}
                plot={selectedPlot}
                userRole="admin"
                onEdit={(plot) => {
                    // Handle edit
                    console.log('Edit plot:', plot);
                }}
                onDelete={(plotId) => {
                    // Handle delete
                    deletePlot(plotId);
                }}
                onAddPayment={(plot) => {
                    // Open payment dialog
                    console.log('Add payment for:', plot);
                }}
                onCancel={(plotId) => {
                    // Handle cancel booking
                    console.log('Cancel booking:', plotId);
                }}
                onConvertToSold={(plot) => {
                    // Handle convert to sold
                    console.log('Convert to sold:', plot);
                }}
                onPrint={(plot) => {
                    // Handle print
                    window.print();
                }}
            />
        </>
    );
}
```

#### Example 2: Broker Inventory Page

```typescript
'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RoleBasedPlotDetailDrawer } from '@/components/admin/RoleBasedPlotDetailDrawer';
import { PaymentInstallmentDrawer } from '@/components/admin/PaymentInstallmentDrawer';
import { getBrokerBookedPlots, getBrokerSoldPlots } from '@/lib/actions';

export default function BrokerInventoryPage() {
    const [bookedPlots, setBookedPlots] = useState([]);
    const [soldPlots, setSoldPlots] = useState([]);
    const [selectedPlot, setSelectedPlot] = useState(null);
    const [isPlotDrawerOpen, setIsPlotDrawerOpen] = useState(false);
    const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);

    useEffect(() => {
        const fetchPlots = async () => {
            const booked = await getBrokerBookedPlots();
            const sold = await getBrokerSoldPlots();
            setBookedPlots(booked);
            setSoldPlots(sold);
        };
        fetchPlots();
    }, []);

    const handleViewPlot = (plot) => {
        setSelectedPlot(plot);
        setIsPlotDrawerOpen(true);
    };

    const handleViewPayments = (plot) => {
        setSelectedPlot(plot);
        setIsPaymentDrawerOpen(true);
    };

    return (
        <>
            {/* Booked Plots Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold">Booked Plots</h2>
                {bookedPlots.map(plot => (
                    <div key={plot.id} className="flex items-center justify-between p-4 border rounded">
                        <div>
                            <p className="font-semibold">Plot #{plot.plot_number}</p>
                            <p className="text-sm text-muted-foreground">{plot.project_name}</p>
                            <p className="text-xs text-green-600">{plot.paidPercentage || 0}% Paid</p>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewPlot(plot)}
                            >
                                View Details
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewPayments(plot)}
                            >
                                Payment Details
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Sold Plots Section */}
            <div className="space-y-4 mt-8">
                <h2 className="text-xl font-bold">Sold Plots</h2>
                {soldPlots.map(plot => (
                    <div key={plot.id} className="flex items-center justify-between p-4 border rounded">
                        <div>
                            <p className="font-semibold">Plot #{plot.plot_number}</p>
                            <p className="text-sm text-muted-foreground">{plot.project_name}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewPlot(plot)}
                            >
                                View Details
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Plot Detail Drawer - Read-only for Broker */}
            <RoleBasedPlotDetailDrawer
                isOpen={isPlotDrawerOpen}
                onClose={() => {
                    setIsPlotDrawerOpen(false);
                    setSelectedPlot(null);
                }}
                plot={selectedPlot}
                userRole="broker"
                onPrint={(plot) => {
                    window.print();
                }}
            />

            {/* Payment Installment Drawer */}
            <PaymentInstallmentDrawer
                isOpen={isPaymentDrawerOpen}
                onClose={() => {
                    setIsPaymentDrawerOpen(false);
                    setSelectedPlot(null);
                }}
                plot={selectedPlot}
                userRole="broker"
                onPrint={(plot) => {
                    window.print();
                }}
            />
        </>
    );
}
```

---

## Props Reference

### RoleBasedPlotDetailDrawer Props

```typescript
interface RoleBasedPlotDetailDrawerProps {
    isOpen: boolean;                              // Control drawer visibility
    onClose: () => void;                          // Handle drawer close
    plot: Plot | null;                            // Plot data to display
    userRole: 'admin' | 'broker';                 // User's role for access control
    onEdit?: (plot: Plot) => void;               // Admin: Edit plot
    onDelete?: (plotId: string) => void;         // Admin: Delete plot
    onAddPayment?: (plot: Plot) => void;         // Admin: Add payment
    onCancel?: (plotId: string) => void;         // Admin: Cancel booking
    onConvertToSold?: (plot: Plot) => void;      // Admin: Convert to sold
    onPrint?: (plot: Plot) => void;              // Both: Print plot details
}
```

### PaymentInstallmentDrawer Props

```typescript
interface PaymentInstallment {
    id: string;
    installmentDate: string;
    amount: number;
    paymentMethod?: string;
    receiptNumber?: string;
    status: 'paid' | 'unpaid' | 'partial';
    lateFee?: number;
}

interface PaymentInstallmentDrawerProps {
    isOpen: boolean;                              // Control drawer visibility
    onClose: () => void;                          // Handle drawer close
    plot: Plot | null;                            // Plot data
    installments?: PaymentInstallment[];           // Installment records
    userRole: 'admin' | 'broker';                 // User's role
    onDownloadReceipt?: (installmentId: string) => void;  // Admin: Download receipt
    onPrint?: (plot: Plot) => void;              // Both: Print statement
}
```

---

## Tabs Visibility Matrix

| Tab | Admin | Broker (Booked) | Broker (Sold) |
|-----|-------|-----------------|---------------|
| Overview | ✅ | ✅ | ✅ |
| Specifications | ✅ | ✅ | ✅ |
| Pricing | ✅ | ✅ | ✅ |
| Booking | ✅ (Booked only) | ✅ | ❌ |
| Payment | ✅ (Booked only) | ✅ | ❌ |
| Sale | ✅ (Sold only) | ❌ | ✅ |
| Commission | ✅ (Booked only) | ❌ | ❌ |
| Internal Notes | ✅ | ❌ | ❌ |
| History | ✅ | ❌ | ❌ |

---

## Action Button Visibility Matrix

| Button | Admin Available | Admin Booked | Admin Sold | Broker Booked | Broker Sold |
|--------|-----------------|--------------|-----------|---------------|------------|
| Edit | ✅ | ❌ | ❌ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ | ❌ |
| Add Payment | ❌ | ✅ | ❌ | ❌ | ❌ |
| Cancel Booking | ❌ | ✅ (<50%) | ❌ | ❌ | ❌ |
| Mark as Sold | ❌ | ✅ (≥50%) | ❌ | ❌ | ❌ |
| Print | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Display Information

### Admin View Includes:
1. **Basic Information**
   - Project name, Block, Plot number, Status
   - Current owner/buyer information with contact details

2. **Specifications**
   - Size (in Gaj)
   - Dimension
   - Type
   - Facing direction

3. **Pricing**
   - Total plot amount (Booked)
   - Price per Gaj (Booked)
   - Booking amount
   - Remaining amount (Booked)
   - Sale price & sold amount (Sold)

4. **Booking Details** (Booked plots)
   - Buyer name
   - Booking date
   - Booking amount
   - Tenure in months
   - Broker/Associate name

5. **Payment Tracking** (Booked plots)
   - Payment progress percentage
   - Total amount due
   - Amount paid (in green)
   - Outstanding balance (in orange)
   - Next due date
   - Commission status

6. **Sale Details** (Sold plots)
   - Sale date
   - Sale price
   - Sold amount
   - Buyer name
   - Seller name

7. **Commission Details** (Booked plots - Admin only)
   - Broker name
   - Commission rate percentage
   - Commission status (Pending/Paid)

8. **Internal Notes** (Admin only)
   - Space for administrative notes
   - Not visible to brokers

9. **Full History** (Admin only)
   - Creation date
   - Last update date
   - Updated by (if available)
   - Current status
   - Full edit history (coming soon)

### Broker View (Read-Only):
- Basic information (without internal notes)
- Specifications
- Pricing (visible amounts only)
- Booking details (relevant for booked plots)
- Payment tracking (relevant for booked plots)
- Sale details (relevant for sold plots)
- Print and View buttons only (no edit/delete)

---

## Styling & UX Features

### Visual Indicators
- **Status Badges**: Color-coded (Available=Green, Booked=Yellow, Sold=Red, Cancelled=Gray)
- **Read-Only Indicator**: Lock icon for brokers showing read-only access
- **Payment Progress**: Gradient progress bar showing payment completion
- **Role-based Actions**: Different buttons shown based on user role and plot status

### Responsive Design
- Works on mobile, tablet, and desktop
- Sticky headers for easy navigation
- Scrollable content area
- Fixed action bar at bottom

### Color Scheme
- **Paid/Available**: Green tones
- **Booked/Pending**: Yellow/Amber tones
- **Sold/Completed**: Red tones
- **Balance Due**: Orange tones
- **Admin-only content**: Purple/Orange accents
- **Late Fees**: Red accents

---

## Integration with Existing Code

To replace the existing `PlotDetailDrawer` with the new role-based version:

```typescript
// Old (to be replaced)
<PlotDetailDrawer {...props} />

// New (with role control)
const { user } = await getAuthenticatedUser();
<RoleBasedPlotDetailDrawer 
    {...props}
    userRole={user.role as 'admin' | 'broker'}
/>
```

---

## Future Enhancements

1. **Payment Schedule**: Integration with actual installment records from database
2. **Edit Internal Notes**: Admin capability to add/edit internal notes
3. **Full Audit Trail**: Complete history of all status changes
4. **Document Upload**: Attach documents to plots
5. **Email Notifications**: Automate payment reminders
6. **Payment Receipts**: PDF generation for payment receipts
7. **Commission Tracking**: Detailed commission calculation breakdown

---

## Testing Checklist

- [ ] Admin can view all plot statuses
- [ ] Admin can edit and delete available plots
- [ ] Admin can add payments and manage bookings
- [ ] Admin can see commission and internal notes tabs
- [ ] Admin can view full history
- [ ] Broker can only view booked and sold plots
- [ ] Broker sees read-only indicator
- [ ] Broker cannot edit or delete plots
- [ ] Broker cannot access commission, notes, or history tabs
- [ ] Both roles can print plot details
- [ ] Payment drawer displays correctly
- [ ] All calculations are accurate
- [ ] Responsive design works on all devices
- [ ] Icons and colors display correctly

---
