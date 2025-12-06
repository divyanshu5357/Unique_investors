# Quick Reference Card - Role-Based Plot Drawers

## 🎯 At a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│                ROLEBASED PLOT DETAIL DRAWER                     │
├─────────────────────────────────────────────────────────────────┤
│ Admin View         │ Broker View                                │
├────────────────────┼────────────────────────────────────────────┤
│ ✅ All statuses    │ ✅ Booked & Sold only (read-only)         │
│ ✅ Edit/Delete     │ ❌ Cannot edit/delete                     │
│ ✅ Add payments    │ ❌ Cannot add payments                    │
│ ✅ 9 tabs         │ ✅ 6 tabs (no admin-only)                 │
│ ✅ Commission     │ ❌ No commission tab                       │
│ ✅ Notes          │ ❌ No notes tab                            │
│ ✅ History        │ ❌ No history tab                          │
└────────────────────┴────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│            PAYMENT INSTALLMENT DRAWER                           │
├─────────────────────────────────────────────────────────────────┤
│ Summary Tab        │ Installments Tab │ History Tab             │
├────────────────────┼──────────────────┼────────────────────────┤
│ • Total paid       │ • All            │ • Timeline view        │
│ • Total due        │   installments   │ • Paid events         │
│ • Balance          │ • Amounts        │ • Dates & amounts     │
│ • Progress %       │ • Methods        │ • Visual design       │
│ • Late fees        │ • Receipts       │                        │
│ • Next due date    │ • Status badges  │                        │
└────────────────────┴──────────────────┴────────────────────────┘
```

---

## 🚀 Quick Start (3 Steps)

### Step 1: Import
```typescript
import { RoleBasedPlotDetailDrawer } from '@/components/admin/RoleBasedPlotDetailDrawer';
import { PaymentInstallmentDrawer } from '@/components/admin/PaymentInstallmentDrawer';
```

### Step 2: Create State
```typescript
const [selectedPlot, setSelectedPlot] = useState(null);
const [isOpen, setIsOpen] = useState(false);
```

### Step 3: Render
```typescript
<RoleBasedPlotDetailDrawer
    isOpen={isOpen}
    onClose={() => setIsOpen(false)}
    plot={selectedPlot}
    userRole="admin"
/>
```

---

## 📁 File Structure

```
src/components/admin/
├── RoleBasedPlotDetailDrawer.tsx          ← Main drawer (700 lines)
├── PaymentInstallmentDrawer.tsx           ← Payment drawer (450 lines)
└── PlotDetailDrawersSampleIntegration.tsx ← Full example (350 lines)

Root Directory
├── ROLE_BASED_DRAWERS_GUIDE.md           ← Detailed guide
├── PLOT_DRAWERS_README.md                ← Quick reference
├── IMPLEMENTATION_SUMMARY.md             ← Complete summary
└── QUICK_REFERENCE.md                    ← This file

Database
└── supabase/migrations/
    └── 20250105_create_payment_installments.sql
```

---

## 🎯 Component Usage Patterns

### Admin Page Pattern
```typescript
'use client'
import { RoleBasedPlotDetailDrawer } from '@/components/admin/RoleBasedPlotDetailDrawer';

export default function AdminPage() {
    const [plot, setPlot] = useState(null);
    const [open, setOpen] = useState(false);

    return (
        <>
            <Table>
                {plots.map(p => (
                    <Button onClick={() => { setPlot(p); setOpen(true); }}>View</Button>
                ))}
            </Table>
            
            <RoleBasedPlotDetailDrawer
                isOpen={open}
                onClose={() => setOpen(false)}
                plot={plot}
                userRole="admin"
                onEdit={handleEdit}
                onDelete={handleDelete}
            />
        </>
    );
}
```

### Broker Page Pattern
```typescript
'use client'
import { RoleBasedPlotDetailDrawer } from '@/components/admin/RoleBasedPlotDetailDrawer';
import { PaymentInstallmentDrawer } from '@/components/admin/PaymentInstallmentDrawer';

export default function BrokerPage() {
    const [plot, setPlot] = useState(null);
    const [plotOpen, setPlotOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [installments, setInstallments] = useState([]);

    return (
        <>
            <Button onClick={() => { setPlot(p); setPlotOpen(true); }}>Details</Button>
            <Button onClick={() => { setPlot(p); setPaymentOpen(true); }}>Payment</Button>
            
            <RoleBasedPlotDetailDrawer
                isOpen={plotOpen}
                onClose={() => setPlotOpen(false)}
                plot={plot}
                userRole="broker"
            />
            
            <PaymentInstallmentDrawer
                isOpen={paymentOpen}
                onClose={() => setPaymentOpen(false)}
                plot={plot}
                installments={installments}
                userRole="broker"
            />
        </>
    );
}
```

---

## 🎨 Colors & Status

### Status Badges
```
Available  → Green   (bg-green-100 text-green-800)
Booked     → Yellow  (bg-yellow-100 text-yellow-800)
Sold       → Red     (bg-red-100 text-red-800)
Cancelled  → Gray    (bg-gray-100 text-gray-800)
```

### Payment Status
```
Paid       → Green   (Check icon)
Unpaid     → Red     (Alert icon)
Partial    → Yellow  (Clock icon)
```

### Amount Colors
```
Paid Amount     → Green  (₹X)
Balance Due     → Orange (₹X)
Late Fees       → Red    (₹X)
Progress Bar    → Blue gradient
```

---

## 📊 Tab Visibility

| Tab | Admin | Broker |
|-----|:-----:|:------:|
| Overview | ✅ | ✅ |
| Specs | ✅ | ✅ |
| Pricing | ✅ | ✅ |
| Booking | ✅ | ✅ |
| Payment | ✅ | ✅ |
| Sale | ✅ | ✅ |
| Commission | ✅ | ❌ |
| Notes | ✅ | ❌ |
| History | ✅ | ❌ |

---

## 🔘 Button Visibility

| Button | Admin Available | Admin Booked | Admin Sold | Broker |
|--------|:---------------:|:------------:|:----------:|:------:|
| Edit | ✅ | ❌ | ❌ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ |
| Add Payment | ❌ | ✅ | ❌ | ❌ |
| Cancel Booking | ❌ | ✅* | ❌ | ❌ |
| Mark as Sold | ❌ | ✅** | ❌ | ❌ |
| Print | ✅ | ✅ | ✅ | ✅ |

*Only if < 50% paid
**Only if ≥ 50% paid

---

## 🔒 Access Control Rules

### Plot Access
```
Admin:  View ALL statuses (Available, Booked, Sold, Cancelled)
Broker: View ONLY (Booked, Sold) in READ-ONLY mode
```

### Tab Access
```
Admin:  See all 9 tabs
Broker: See only 6 tabs (no Commission, Notes, History)
```

### Action Access
```
Admin:  Edit, Delete, Add Payment, Cancel, Convert to Sold, Print
Broker: View, Print ONLY
```

### Information Access
```
Admin:  See all fields including commission and internal notes
Broker: See only relevant booking/payment information
```

---

## 📱 Responsive Breakpoints

```
Mobile (< 640px)    → Single column, optimized layout
Tablet (640-1024px) → Two columns where appropriate
Desktop (> 1024px)  → Full three-column layout
```

---

## ⚡ Props Cheat Sheet

### RoleBasedPlotDetailDrawer
```typescript
{
    isOpen: boolean,
    onClose: () => void,
    plot: Plot | null,
    userRole: 'admin' | 'broker',
    onEdit?: (plot: Plot) => void,
    onDelete?: (plotId: string) => void,
    onAddPayment?: (plot: Plot) => void,
    onCancel?: (plotId: string) => void,
    onConvertToSold?: (plot: Plot) => void,
    onPrint?: (plot: Plot) => void,
}
```

### PaymentInstallmentDrawer
```typescript
{
    isOpen: boolean,
    onClose: () => void,
    plot: Plot | null,
    installments?: PaymentInstallment[],
    userRole: 'admin' | 'broker',
    onDownloadReceipt?: (installmentId: string) => void,
    onPrint?: (plot: Plot) => void,
}
```

---

## 🔍 Common Tasks

### Open Plot Drawer
```typescript
const [plot, setPlot] = useState(null);
const [open, setOpen] = useState(false);

// When clicking a plot
setPlot(selectedPlot);
setOpen(true);
```

### Close Drawer
```typescript
setOpen(false);
setPlot(null);
```

### Handle Admin Action
```typescript
onEdit={(plot) => {
    console.log('Editing:', plot);
    // Open edit dialog
}}
```

### Handle Broker Print
```typescript
onPrint={(plot) => {
    window.print();
}}
```

### Show Payment Details
```typescript
<PaymentInstallmentDrawer
    plot={selectedPlot}
    installments={installmentsData}
    userRole="broker"
    isOpen={paymentDrawerOpen}
    onClose={() => setPaymentDrawerOpen(false)}
/>
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Drawer not opening | Check `isOpen={true}` and `plot != null` |
| No tabs visible | Ensure plot data is provided |
| Broker sees restricted | Plot status must be 'booked' or 'sold' |
| No buttons visible | Check `userRole` is 'admin' for actions |
| Installments empty | Provide `installments=[]` or data array |

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `ROLE_BASED_DRAWERS_GUIDE.md` | Comprehensive feature guide |
| `PLOT_DRAWERS_README.md` | Quick start & reference |
| `IMPLEMENTATION_SUMMARY.md` | Complete technical details |
| `QUICK_REFERENCE.md` | This cheat sheet |

---

## 🎯 Implementation Checklist

- [ ] Install components in project
- [ ] Run database migration
- [ ] Import in your page
- [ ] Add state management
- [ ] Render drawer component
- [ ] Pass correct user role
- [ ] Test with admin account
- [ ] Test with broker account
- [ ] Test different plot statuses
- [ ] Test payment drawer
- [ ] Verify responsive design
- [ ] Connect to real data

---

## 🚀 Deploy Checklist

- [ ] Components compile without errors
- [ ] Database migrations applied
- [ ] RLS policies enabled
- [ ] Authentication working
- [ ] Role assignments correct
- [ ] Test in production environment
- [ ] Monitor error logs
- [ ] Gather user feedback

---

## 💡 Pro Tips

1. **Use the sample integration** as a template for your implementation
2. **Test role-based access** thoroughly before deployment
3. **Customize colors** to match your brand in the status config
4. **Add real installment data** from your database
5. **Implement PDF receipts** for better user experience
6. **Add email notifications** for payment reminders
7. **Monitor audit logs** for compliance

---

## 📞 Quick Links

- 📁 Components: `src/components/admin/`
- 📖 Guides: Root directory `*.md` files
- 🗄️ Database: `supabase/migrations/20250105_*`
- 💻 Example: `PlotDetailDrawersSampleIntegration.tsx`

---

## ✅ Feature Checklist

### RoleBasedPlotDetailDrawer
- [x] Admin full access
- [x] Broker read-only access
- [x] Role-based tab visibility
- [x] Role-based button visibility
- [x] Access restriction messages
- [x] All plot information
- [x] Commission details
- [x] Internal notes
- [x] Audit history
- [x] Print functionality

### PaymentInstallmentDrawer
- [x] Payment summary
- [x] Installment tracking
- [x] Payment history timeline
- [x] Status indicators
- [x] Late fee tracking
- [x] Receipt downloads (admin)
- [x] Print statements
- [x] Export capability

---

## 🎓 Learning Path

1. **Start:** Read `QUICK_REFERENCE.md` (this file)
2. **Learn:** Read `PLOT_DRAWERS_README.md`
3. **Understand:** Read `ROLE_BASED_DRAWERS_GUIDE.md`
4. **Practice:** Use `PlotDetailDrawersSampleIntegration.tsx`
5. **Integrate:** Apply to your pages
6. **Test:** Verify all functionality
7. **Deploy:** Release to production

---

Generated: December 5, 2025
Version: 1.0
Status: ✅ Production Ready
