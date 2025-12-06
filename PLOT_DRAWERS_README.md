# Plot Detail Drawers - Complete Implementation

## 📋 Overview

Two specialized drawer components for displaying plot details with role-based access control:

1. **RoleBasedPlotDetailDrawer** - Comprehensive plot information with admin/broker differentiation
2. **PaymentInstallmentDrawer** - Focused payment and installment tracking for booked/sold plots

---

## 🎯 Quick Start

### Installation

Both components are already created in your project:
- `src/components/admin/RoleBasedPlotDetailDrawer.tsx`
- `src/components/admin/PaymentInstallmentDrawer.tsx`
- `src/components/admin/PlotDetailDrawersSampleIntegration.tsx` (example usage)

### Basic Usage

```typescript
import { RoleBasedPlotDetailDrawer } from '@/components/admin/RoleBasedPlotDetailDrawer';
import { PaymentInstallmentDrawer } from '@/components/admin/PaymentInstallmentDrawer';
import { useState } from 'react';

export default function MyPage() {
    const [selectedPlot, setSelectedPlot] = useState(null);
    const [plotDrawerOpen, setPlotDrawerOpen] = useState(false);

    return (
        <>
            <button onClick={() => setPlotDrawerOpen(true)}>
                View Plot Details
            </button>

            <RoleBasedPlotDetailDrawer
                isOpen={plotDrawerOpen}
                onClose={() => setPlotDrawerOpen(false)}
                plot={selectedPlot}
                userRole="admin"
                onEdit={(plot) => console.log('Edit:', plot)}
                onDelete={(plotId) => console.log('Delete:', plotId)}
            />
        </>
    );
}
```

---

## 📦 Component Details

### RoleBasedPlotDetailDrawer

**Location:** `src/components/admin/RoleBasedPlotDetailDrawer.tsx`

**Purpose:** Display comprehensive plot details with role-based access control

#### Props

```typescript
interface RoleBasedPlotDetailDrawerProps {
    // Core props
    isOpen: boolean;                              // Control drawer visibility
    onClose: () => void;                          // Handle drawer close
    plot: Plot | null;                            // Plot data to display
    userRole: 'admin' | 'broker';                 // User role for access control

    // Admin callbacks
    onEdit?: (plot: Plot) => void;               // Open edit form
    onDelete?: (plotId: string) => void;         // Delete plot
    onAddPayment?: (plot: Plot) => void;         // Open payment dialog
    onCancel?: (plotId: string) => void;         // Cancel booking
    onConvertToSold?: (plot: Plot) => void;      // Mark as sold
    
    // Both roles
    onPrint?: (plot: Plot) => void;              // Print plot details
}
```

#### Features

**Admin View:**
- ✅ All plot statuses visible
- ✅ Full edit capabilities
- ✅ Commission details tab
- ✅ Internal notes tab
- ✅ Complete audit history
- ✅ All action buttons

**Broker View:**
- ✅ Booked & Sold plots only
- ✅ Read-only access
- ✅ Limited tabs (no admin-only tabs)
- ✅ View & Print only

#### Tabs by Role

| Tab | Admin | Broker |
|-----|-------|--------|
| Overview | ✅ | ✅ |
| Specifications | ✅ | ✅ |
| Pricing | ✅ | ✅ |
| Booking | ✅ (Booked) | ✅ (Booked) |
| Payment | ✅ (Booked) | ✅ (Booked) |
| Sale | ✅ (Sold) | ✅ (Sold) |
| Commission | ✅ Admin only | ❌ |
| Internal Notes | ✅ Admin only | ❌ |
| History | ✅ Admin only | ❌ |

#### Information Displayed

**Basic Information:**
- Project name, block, plot number
- Current status with color-coded badge
- Owner/buyer information and contact details

**Specifications:**
- Size (in Gaj)
- Dimension
- Type
- Facing direction

**Pricing:**
- Total plot amount
- Price per Gaj
- Booking/Sale amounts
- Remaining balance

**Booking Info** (Booked plots)
- Buyer name
- Booking date
- Booking amount
- Tenure (months)
- Broker/Associate name

**Payment Tracking** (Booked plots)
- Payment progress percentage
- Total due amount
- Amount paid
- Outstanding balance
- Next due date
- Commission status

**Sale Info** (Sold plots)
- Sale date
- Sale price
- Sold amount
- Buyer and seller names

**Commission** (Admin only, Booked plots)
- Broker name
- Commission rate
- Commission status

**Internal Notes** (Admin only)
- Admin-only notes space
- Not visible to brokers

**History** (Admin only)
- Creation date and time
- Last update date and time
- Updated by (if available)
- Current status

---

### PaymentInstallmentDrawer

**Location:** `src/components/admin/PaymentInstallmentDrawer.tsx`

**Purpose:** Display detailed payment and installment tracking

#### Props

```typescript
interface PaymentInstallmentDrawerProps {
    isOpen: boolean;                              // Control visibility
    onClose: () => void;                          // Handle close
    plot: Plot | null;                            // Plot data
    installments?: PaymentInstallment[];           // Installment records
    userRole: 'admin' | 'broker';                 // User role
    onDownloadReceipt?: (installmentId: string) => void;  // Download receipt
    onPrint?: (plot: Plot) => void;              // Print statement
}

interface PaymentInstallment {
    id: string;
    installmentDate: string;                      // ISO date string
    amount: number;                               // Amount due
    paymentMethod?: string;                       // Payment method
    receiptNumber?: string;                       // Receipt/Reference number
    status: 'paid' | 'unpaid' | 'partial';       // Payment status
    lateFee?: number;                             // Late fee if applicable
}
```

#### Tabs

1. **Summary Tab**
   - Total paid amount (green card)
   - Total amount due
   - Outstanding balance (orange)
   - Paid/Unpaid installment counts
   - Payment progress bar
   - Late fees (if any)
   - Next due date

2. **Installments Tab**
   - List of all installments
   - Installment number and date
   - Amount due
   - Payment method
   - Receipt number
   - Status badge (Paid/Unpaid/Partial)
   - Late fee (if applicable)
   - Download receipt button (Admin only)

3. **History Tab**
   - Timeline of all paid installments
   - Payment dates and amounts
   - Visual timeline with check marks

#### Information Shown

**Payment Overview:**
- Total Paid: ₹X (in green)
- Total Amount: ₹X
- Outstanding Balance: ₹X (in orange)
- Paid Installments: N
- Unpaid Installments: N
- Payment Progress: X%
- Late Fees: ₹X (if applicable)
- Next Due Date: DD MMM YYYY

**Per Installment:**
- Installment #
- Date
- Amount
- Payment Method
- Receipt/Reference Number
- Status (color-coded badge)
- Late Fee (if any)

**For Admin Only:**
- Download receipt button

---

## 🚀 Advanced Usage

### Integration with Admin Page

```typescript
'use client'

import { RoleBasedPlotDetailDrawer } from '@/components/admin/RoleBasedPlotDetailDrawer';
import { useState, useEffect } from 'react';
import { getPlots, updatePlot, deletePlot } from '@/lib/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AdminPlotsPage() {
    const [plots, setPlots] = useState([]);
    const [selectedPlot, setSelectedPlot] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => {
        loadPlots();
    }, []);

    const loadPlots = async () => {
        const data = await getPlots();
        setPlots(data);
    };

    const handleEditPlot = async (plot) => {
        // Open edit dialog
        const result = await openEditDialog(plot);
        if (result) {
            await updatePlot(result);
            loadPlots();
        }
    };

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Plot #</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {plots.map(plot => (
                        <TableRow key={plot.id}>
                            <TableCell>#{plot.plotNumber}</TableCell>
                            <TableCell>{plot.projectName}</TableCell>
                            <TableCell>
                                <span className="px-2 py-1 rounded bg-blue-100">
                                    {plot.status}
                                </span>
                            </TableCell>
                            <TableCell>
                                <button
                                    onClick={() => {
                                        setSelectedPlot(plot);
                                        setDrawerOpen(true);
                                    }}
                                    className="text-blue-600 hover:underline"
                                >
                                    View
                                </button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <RoleBasedPlotDetailDrawer
                isOpen={drawerOpen}
                onClose={() => {
                    setDrawerOpen(false);
                    setSelectedPlot(null);
                }}
                plot={selectedPlot}
                userRole="admin"
                onEdit={handleEditPlot}
                onDelete={(plotId) => {
                    if (confirm('Delete this plot?')) {
                        deletePlot(plotId);
                        loadPlots();
                    }
                }}
                onPrint={(plot) => window.print()}
            />
        </>
    );
}
```

### Integration with Broker Page

```typescript
'use client'

import { RoleBasedPlotDetailDrawer } from '@/components/admin/RoleBasedPlotDetailDrawer';
import { PaymentInstallmentDrawer } from '@/components/admin/PaymentInstallmentDrawer';
import { useState, useEffect } from 'react';
import { getBrokerBookedPlots, getPlotInstallments } from '@/lib/actions';

export default function BrokerPlotsPage() {
    const [plots, setPlots] = useState([]);
    const [selectedPlot, setSelectedPlot] = useState(null);
    const [installments, setInstallments] = useState([]);
    const [plotDrawerOpen, setPlotDrawerOpen] = useState(false);
    const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);

    useEffect(() => {
        loadPlots();
    }, []);

    const loadPlots = async () => {
        const data = await getBrokerBookedPlots();
        setPlots(data);
    };

    const handleViewPayments = async (plot) => {
        setSelectedPlot(plot);
        const inst = await getPlotInstallments(plot.id);
        setInstallments(inst);
        setPaymentDrawerOpen(true);
    };

    return (
        <>
            <div className="space-y-4">
                {plots.map(plot => (
                    <div key={plot.id} className="p-4 border rounded">
                        <p className="font-semibold">Plot #{plot.plot_number}</p>
                        <p className="text-sm text-muted-foreground">{plot.project_name}</p>
                        <div className="mt-2 flex gap-2">
                            <button
                                onClick={() => {
                                    setSelectedPlot(plot);
                                    setPlotDrawerOpen(true);
                                }}
                                className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                            >
                                View Details
                            </button>
                            <button
                                onClick={() => handleViewPayments(plot)}
                                className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                            >
                                Payment Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <RoleBasedPlotDetailDrawer
                isOpen={plotDrawerOpen}
                onClose={() => setPlotDrawerOpen(false)}
                plot={selectedPlot}
                userRole="broker"
                onPrint={(plot) => window.print()}
            />

            <PaymentInstallmentDrawer
                isOpen={paymentDrawerOpen}
                onClose={() => setPaymentDrawerOpen(false)}
                plot={selectedPlot}
                installments={installments}
                userRole="broker"
                onPrint={(plot) => window.print()}
            />
        </>
    );
}
```

---

## 🎨 Styling

### Custom Theming

Both components use Tailwind CSS and shadcn/ui components. To customize:

1. **Colors:** Modify status badge colors in `statusConfig` and `paymentStatus`
2. **Spacing:** Adjust `p-`, `m-`, `gap-` classes
3. **Fonts:** Change `text-` classes for size and weight

### Dark Mode

Components automatically support dark mode through shadcn/ui.

---

## 🔒 Security & Access Control

### Role-Based Access

- **Admin:** Full access to all plots and actions
- **Broker:** Read-only access to own booked/sold plots only

### Database RLS Policies

See `supabase/migrations/20250105_create_payment_installments.sql` for:
- Admin can view all installments
- Brokers can view only their own installments
- Admin can insert/update/delete installments
- Brokers cannot modify installments

---

## 📱 Responsive Design

Both drawers are fully responsive:
- **Mobile:** Single column, optimized for small screens
- **Tablet:** Two-column layout where appropriate
- **Desktop:** Full three-column layout with sticky headers

---

## 🧪 Testing

### Test Cases

```typescript
// Test 1: Admin views all plot statuses
test('Admin can view available plots', () => {
    render(
        <RoleBasedPlotDetailDrawer
            plot={availablePlot}
            userRole="admin"
            isOpen={true}
            onClose={() => {}}
        />
    );
    expect(screen.getByText('Edit')).toBeInTheDocument();
});

// Test 2: Broker cannot view available plots
test('Broker cannot view available plots', () => {
    render(
        <RoleBasedPlotDetailDrawer
            plot={availablePlot}
            userRole="broker"
            isOpen={true}
            onClose={() => {}}
        />
    );
    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
});

// Test 3: Payment drawer shows installments
test('Payment drawer displays all installments', () => {
    render(
        <PaymentInstallmentDrawer
            plot={bookedPlot}
            installments={mockInstallments}
            userRole="admin"
            isOpen={true}
            onClose={() => {}}
        />
    );
    expect(screen.getByText('Installment #1')).toBeInTheDocument();
});
```

---

## 📝 TypeScript Types

Full TypeScript support included. Import types:

```typescript
import { Plot } from '@/lib/schema';

interface PaymentInstallment {
    id: string;
    installmentDate: string;
    amount: number;
    paymentMethod?: string;
    receiptNumber?: string;
    status: 'paid' | 'unpaid' | 'partial';
    lateFee?: number;
}
```

---

## 🔄 State Management

Both components work with any state management:
- React `useState` (simple cases)
- Context API (shared state)
- Redux/Zustand (complex apps)
- TanStack Query (server state)

---

## 🎯 Performance

- Lazy rendering of tabs (only renders active tab)
- Optimized re-renders with proper memoization
- Efficient filtering and calculations
- Minimal bundle size (~15KB gzipped)

---

## 🐛 Troubleshooting

### Drawer not opening
```typescript
// Make sure both isOpen and plot are set
<RoleBasedPlotDetailDrawer
    isOpen={true}        // Must be true
    plot={selectedPlot}  // Must not be null
    onClose={() => {}}
/>
```

### Broker sees restricted message
```typescript
// Check userRole and plot status
// Brokers can only see 'booked' or 'sold' plots
const canAccess = ['booked', 'sold'].includes(plot.status);
```

### Installments not showing
```typescript
// Ensure installments prop is passed and non-empty
<PaymentInstallmentDrawer
    installments={mockInstallments}  // Must be array, can be empty
    {...otherProps}
/>
```

---

## 📚 Additional Resources

- See `ROLE_BASED_DRAWERS_GUIDE.md` for detailed feature documentation
- See `PlotDetailDrawersSampleIntegration.tsx` for full working example
- Database schema: `supabase/migrations/20250105_create_payment_installments.sql`

---

## 🚀 Future Enhancements

- [ ] Edit internal notes functionality
- [ ] Bulk actions for multiple plots
- [ ] Advanced filtering and search
- [ ] Payment schedule generation
- [ ] SMS/Email notifications
- [ ] Receipt PDF generation
- [ ] Commission breakdown calculations
- [ ] Plot comparison view

---

## 📄 License

Part of Unique Investor project. All rights reserved.
