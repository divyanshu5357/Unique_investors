# Admin Plot Detail Drawer & Inventory System

## Overview

A comprehensive admin-only slide navigation drawer system for managing plot inventory with advanced filtering, detailed information display, and status-based action buttons.

## Components

### 1. PlotDetailDrawer (`PlotDetailDrawer.tsx`)
**Purpose:** Slide-out drawer panel with detailed plot information and admin actions

**Features:**
- ✅ **Sticky Header**: Project, Block, Plot Number, Status with last update date
- ✅ **Tabbed Interface**: Overview, Specifications, Pricing, Booking, Payment, Sale, History
- ✅ **Full Plot Specifications**: Size (gaj), Dimensions, Type, Plot Number
- ✅ **Pricing Breakdown**: 
  - Available plots: N/A
  - Booked plots: Total Plot Amount, Booking Amount
  - Sold plots: Sale Price, Sold Amount
- ✅ **Booking Details Tab**: Buyer, Booking Amount, Tenure, Associate/Broker
- ✅ **Payment Tracking Tab**:
  - Visual progress bar (0-100%)
  - Total Amount, Received (green), Balance (orange)
  - Payment percentage with color coding
  - Commission Status badge
- ✅ **Sale Details Tab**: Sale Price, Sold Amount, Buyer, Seller
- ✅ **History/Audit Tab**: Creation date, Last updated, Status timeline
- ✅ **Status-Based Action Buttons**:
  - **Available**: Edit, Delete buttons
  - **Booked < 50%**: Cancel Booking button
  - **Booked**: Add Payment button
  - **Booked ≥ 50%**: Mark as Sold button
- ✅ **Sticky Action Bar**: Fixed at bottom with status-based buttons
- ✅ **Confirmation Dialogs**: Delete & Cancel Booking with warnings
- ✅ **Responsive Design**: Works on mobile, tablet, desktop

**Props:**
```typescript
interface PlotDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    plot: Plot | null;
    onEdit?: (plot: Plot) => void;
    onDelete?: (plotId: string) => void;
    onAddPayment?: (plot: Plot) => void;
    onCancel?: (plotId: string) => void;
    onConvertToSold?: (plot: Plot) => void;
}
```

**Usage:**
```tsx
<PlotDetailDrawer
    isOpen={isDrawerOpen}
    onClose={() => setIsDrawerOpen(false)}
    plot={selectedPlot}
    onEdit={(plot) => handleEdit(plot)}
    onDelete={(plotId) => handleDelete(plotId)}
    onCancel={(plotId) => handleCancel(plotId)}
/>
```

---

### 2. PlotFilter (`PlotFilter.tsx`)
**Purpose:** Advanced filtering component for project-wise data with multiple criteria

**Filter Criteria:**
- 🔍 **Search**: Plot number, buyer name, project, block
- 🏢 **Project**: Dropdown with all unique projects
- 🏘️ **Block**: Dynamic dropdown filtered by selected project
- 📊 **Status**: Available, Booked, Sold, Cancelled
- 💰 **Price Range**: Min-Max price filter
- 📏 **Size Range**: Min-Max size in gaj

**Features:**
- ✅ Collapsible filter panel with toggle button
- ✅ Active filter count badge
- ✅ Clear all filters button
- ✅ Real-time filtering
- ✅ Dynamic cascading dropdowns (project → block)
- ✅ Combined filtering (all criteria AND logic)
- ✅ Stores filter state

**Props:**
```typescript
interface PlotFilterProps {
    plots: Plot[];
    onFilter: (filtered: Plot[]) => void;
    onFilterChange?: (filters: PlotFilterOptions) => void;
}

interface PlotFilterOptions {
    projectName?: string;
    block?: string;
    status?: string;
    minPrice?: number;
    maxPrice?: number;
    minSize?: number;
    maxSize?: number;
    searchText?: string;
}
```

**Usage:**
```tsx
<PlotFilter 
    plots={allPlots}
    onFilter={(filtered) => setFilteredPlots(filtered)}
    onFilterChange={(filters) => handleFilterChange(filters)}
/>
```

---

### 3. AdminInventoryEnhanced (`AdminInventoryEnhanced.tsx`)
**Purpose:** Main admin inventory page combining drawer and filter

**Features:**
- ✅ **Dashboard Stats**: Total, Available, Booked, Sold count
- ✅ **Add New Plot Button**: Opens PlotForm dialog
- ✅ **Filter Integration**: PlotFilter component for searching
- ✅ **Project Grouping**: Plots organized by project
- ✅ **Project Statistics**: Cards showing Available, Booked, Sold, Total Value per project
- ✅ **Plot Grid Display**: Color-coded grid with plot number, size, and payment %
- ✅ **Click to View**: Click any plot to open detail drawer
- ✅ **Edit/Delete from Drawer**: Full CRUD operations
- ✅ **Payment Tracking**: Visual payment percentage on booked plots
- ✅ **Loading States**: Spinner while fetching data
- ✅ **Toast Notifications**: Success/error messages

**Workflow:**
1. Admin views inventory grid
2. Filters by project/status/price/size
3. Clicks plot card to open detail drawer
4. Views complete information in tabbed interface
5. Takes action: Edit, Delete, Add Payment, Cancel, Mark Sold
6. Drawer updates with confirmation
7. Inventory refreshes automatically

---

## Data Flow

```
AdminInventoryEnhanced (Main Page)
├── PlotFilter
│   └── Filters plots by project, block, status, price, size, search
├── Plot Grid (Project Grouped)
│   ├── Project Section
│   │   ├── Stats Cards (Available, Booked, Sold, Value)
│   │   └── Plot Cards Grid (Click → Open Drawer)
│   └── Plot Detail Drawer
│       ├── Header (Sticky)
│       ├── Tabs (Overview, Specs, Pricing, Payment, History)
│       ├── Content (Scrollable)
│       └── Action Bar (Sticky)
└── Dialogs
    ├── PlotForm (Add/Edit)
    ├── Delete Confirmation
    └── Cancel Booking Confirmation
```

---

## Status-Based Features

### Available Status
- ✅ Show: Edit, Delete buttons
- ✅ Grid Color: Green
- ❌ No payment tracking
- ❌ No booking details

### Booked Status
- ✅ Show: Add Payment, Mark as Sold (if ≥50%), Cancel Booking (if <50%)
- ✅ Grid Color: Yellow with payment % display
- ✅ Show: Full booking details, buyer info, tenure
- ✅ Show: Payment tracking with progress bar
- ✅ Commission Status badge

### Sold Status
- ✅ Show: No edit buttons (view only)
- ✅ Grid Color: Red
- ✅ Show: Sale details (price, amount, dates)
- ✅ Show: Buyer and seller information
- ❌ No delete allowed
- ❌ No status change

### Cancelled Status
- ✅ Grid Color: Gray
- ✅ Show: Audit trail with cancellation reason
- ✅ View only

---

## Action Flows

### Edit Plot
```
Click Plot → Open Drawer → Click Edit Button → 
Open PlotForm Dialog → Submit → Update DB → 
Refresh List → Close Drawer & Dialog
```

### Add Payment (Booked Plot)
```
Click Plot → Open Drawer → Tab: Payment → 
Click Add Payment → Payment Dialog → Enter Amount →
Update Paid % → If ≥50%: Show "Mark as Sold" Button →
Success Toast
```

### Cancel Booking (Booked Plot < 50%)
```
Click Plot → Open Drawer → Click Cancel Booking →
Confirmation Dialog → Confirm → 
Reset to Available, Clear Booking Data →
Refresh List → Show Success Toast
```

### Mark as Sold (Booked Plot ≥ 50%)
```
Click Plot → Open Drawer → Tab: Payment →
Click Mark as Sold → Confirm → 
Change Status to Sold → Add Sale Details →
Update DB → Refresh → Close Drawer
```

### Delete Plot (Available Only)
```
Click Plot → Open Drawer → Click Delete →
Confirmation Dialog → Confirm →
Delete from DB → Refresh List →
Close Drawer → Show Success Toast
```

---

## Filter Examples

**Example 1: Find all available plots in Green Valley project**
1. Open Filter Panel
2. Select Project: "Green Valley"
3. Select Status: "Available"
4. Results: All available plots in Green Valley

**Example 2: Find booked plots above ₹50 lakhs**
1. Open Filter Panel
2. Select Status: "Booked"
3. Set Min Price: 5000000
4. Results: Booked plots ≥ ₹50,00,000

**Example 3: Find plots between 1000-2000 gaj in Block A**
1. Open Filter Panel
2. Select Block: "A"
3. Set Min Size: 1000, Max Size: 2000
4. Results: Block A plots between 1000-2000 gaj

---

## UI Components Used

- **Sheet**: Slide drawer panel
- **Tabs**: Tabbed content (Overview, Specs, etc.)
- **Card**: Information containers
- **Badge**: Status indicators and labels
- **Button**: Action buttons
- **Input**: Filter text inputs
- **Select**: Dropdown filters
- **Dialog**: Add/Edit form dialog
- **AlertDialog**: Confirmations
- **Separator**: Visual dividers
- **Progress Bar**: Payment percentage visual

---

## Icons Used

- `Pencil`: Edit action
- `Trash2`: Delete action
- `CreditCard`: Payment actions
- `X`: Close/Cancel
- `CheckCircle2`: Completed/Success
- `AlertCircle`: Status indicator
- `FileText`: Documents/Sale details
- `Clock`: Time/Date info
- `User`: Buyer/Broker info
- `DollarSign`: Price/Payment
- `Briefcase`: Booking details
- `TrendingUp`: Updates/History
- `History`: Audit trail
- `Filter`: Filter button

---

## Styling

- **Color Coding**:
  - Green: Available plots
  - Yellow: Booked plots
  - Red: Sold plots
  - Gray: Cancelled plots

- **Responsive Grid**:
  - Mobile: 2 columns
  - Tablet: 3-4 columns
  - Desktop: 6 columns

- **Sticky Elements**:
  - Header stays visible while scrolling content
  - Action bar stays visible at bottom
  - Filter panel sticky in drawer

---

## Future Enhancements

- 📝 Full edit history with timestamps
- 🔗 Document upload and viewing
- 📧 Email notifications on status changes
- 📊 Export to CSV/PDF
- 🔄 Batch operations (bulk edit, delete, status change)
- 💬 Internal notes/comments system
- 📱 Mobile app integration
- 🔔 Audit log with user tracking
- 🎯 Advanced analytics dashboard
- 🔐 Role-based action buttons

---

## Integration Steps

1. Import components:
```tsx
import { AdminInventoryEnhanced } from '@/components/admin/AdminInventoryEnhanced';
import { PlotDetailDrawer } from '@/components/admin/PlotDetailDrawer';
import { PlotFilter } from '@/components/admin/PlotFilter';
```

2. Add to admin inventory page:
```tsx
export default function AdminInventoryPage() {
    return <AdminInventoryEnhanced />;
}
```

3. Ensure all required UI components are available in `@/components/ui/`

4. Configure Sheet component if needed (from shadcn/ui)

---

## Dependencies

- React 18+
- Next.js 14+
- Tailwind CSS
- shadcn/ui components
- lucide-react icons
- date-fns for date formatting
