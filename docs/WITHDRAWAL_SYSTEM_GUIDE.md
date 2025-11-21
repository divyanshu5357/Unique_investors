# Withdrawal System Guide

## Overview
The withdrawal system allows brokers to request withdrawals from their commission balance. All withdrawals are **manually processed** by admins with transaction proof - there is **no automatic payment gateway integration**.

## How It Works

### For Brokers

#### 1. Check Available Balance
- Navigate to **Broker → Wallets** or **Broker → Transactions**
- View your total balance (Direct Sale + Downline Sale commissions)
- Note: Pending withdrawal requests are deducted from available balance

#### 2. Request Withdrawal
**From Performance Page:**
- Go to **Broker → Performance**
- Click "Withdraw" button on eligible commissions (75% plot payment + commission paid)

**From Transactions Page:**
- Go to **Broker → Transactions**
- Click "Request Withdrawal" button
- Enter withdrawal amount (must not exceed available balance)
- Add optional note (e.g., preferred payment method, bank details)
- Submit request

#### 3. Track Request Status
- View all withdrawal requests in **Broker → Transactions** tab
- Status types:
  - **Pending**: Awaiting admin review
  - **Approved**: Admin approved and payment completed
  - **Rejected**: Admin rejected (reason provided)

#### 4. Withdrawal Rules
- ✅ Can request withdrawal when:
  - Total balance > 0
  - No pending requests for the same amount
  - Plot payment ≥ 75% (for performance page withdrawals)
  
- ❌ Cannot request withdrawal when:
  - Insufficient available balance
  - Already have pending withdrawal that covers the amount

### For Admins

#### 1. View All Requests
- Navigate to **Admin → Transactions**
- See all withdrawal requests from all brokers
- Filter by status: Pending, Approved, Rejected

#### 2. Review Request
For each pending request, you can see:
- Broker name and email
- Requested amount
- Request date
- Optional note from broker (may include payment preferences)

#### 3. Approve Request
**Manual Process:**
1. Process payment outside the system (bank transfer, UPI, cheque, cash)
2. Collect transaction proof (receipt, transaction ID, screenshot)
3. In admin panel, click "Approve" on the request
4. Select payment type: Cash, Cheque, or Online Transfer
5. Upload/paste proof image URL (optional but recommended)
6. Submit approval

**What Happens:**
- Broker's wallet balance is deducted by withdrawal amount
- Transaction record created with "withdrawal" type
- Broker receives notification of approval
- Request status changes to "Approved"

#### 4. Reject Request
**When to Reject:**
- Insufficient funds in company account
- Broker has pending issues/disputes
- Invalid withdrawal amount
- Any other valid reason

**Process:**
1. Click "Reject" on the request
2. Enter rejection reason (will be shown to broker)
3. Submit rejection

**What Happens:**
- No balance deduction
- Broker sees rejection reason
- Broker can submit new request

## Payment Methods

The system supports three payment types (selected during approval):

### 1. Cash
- Admin pays broker in cash
- Record cash transaction details
- Upload photo of payment receipt (optional)

### 2. Cheque
- Admin issues cheque to broker
- Record cheque number and bank details
- Upload photo of cheque (optional)

### 3. Online Transfer
- Admin transfers via bank/UPI/wallet
- Record transaction ID
- Upload screenshot of successful transfer (recommended)

## Security Features

### Rate Limiting
- Withdrawal requests are rate-limited: 10 requests per hour per IP
- Prevents spam and abuse

### Balance Validation
- System checks available balance (total - pending withdrawals)
- Cannot request more than available balance
- Prevents duplicate pending requests

### Transaction Proof
- Admins should upload proof for every approval
- Creates audit trail for accounting
- Helps resolve disputes

### RLS Policies
- Brokers can only see their own withdrawal requests
- Admins can see all requests
- Only admins can approve/reject requests

## Best Practices

### For Brokers
1. ✅ **Add bank details in note**: Include your preferred payment method and account details
2. ✅ **Request realistic amounts**: Don't request more than your available balance
3. ✅ **Check status regularly**: Monitor your requests in Transactions page
4. ✅ **Keep payment proof**: Ask admin for transaction proof after approval

### For Admins
1. ✅ **Upload proof always**: Always upload transaction proof when approving
2. ✅ **Process promptly**: Review withdrawal requests within 24-48 hours
3. ✅ **Verify balances**: Double-check broker balance before approving
4. ✅ **Provide clear rejection reasons**: Help brokers understand why request was rejected
5. ✅ **Maintain records**: Keep offline records of all payment transactions

## Troubleshooting

### "Insufficient available balance" Error
**Problem**: Broker sees this when requesting withdrawal
**Solution**: 
- Check if there are pending withdrawal requests
- Available balance = Total balance - Pending withdrawals
- Wait for pending requests to be processed first

### Commission Not Showing
**Problem**: Broker sold plot but commission not in wallet
**Solution**:
- Commission is only added when plot status = "Sold" (75% payment received)
- Check plot status in Performance page
- Admin may need to run commission calculation manually

### Withdrawal Request Disappeared
**Problem**: Broker submitted request but can't see it
**Solution**:
- Check both tabs in Transactions page (Transactions & Withdrawal Requests)
- Refresh the page
- Check if it was rejected (will still be visible with rejection reason)

### Payment Not Received After Approval
**Problem**: Request approved but broker didn't receive payment
**Solution**:
- Contact admin directly
- Check transaction proof uploaded by admin
- Verify bank details provided in withdrawal note

## Database Tables

### withdrawal_requests
Stores all withdrawal requests with:
- `broker_id`: Who requested
- `amount`: Withdrawal amount
- `status`: pending/approved/rejected
- `payment_type`: cash/cheque/online_transfer (after approval)
- `proof_image_url`: Transaction proof URL
- `rejection_reason`: Reason if rejected
- `processed_by`: Admin who processed
- `requested_at`, `processed_at`: Timestamps

### transactions
Records all financial transactions including:
- Withdrawals (when approved)
- Commission credits
- Direct sale commissions
- Downline commissions

### wallets
Stores broker balances:
- `direct_sale_balance`: From direct sales (6%)
- `downline_sale_balance`: From downline sales (2% + 0.5%)
- `total_balance`: Sum of both

## Future Enhancements (Not Currently Implemented)

These features could be added in the future:
- ⏳ Automatic payment gateway integration
- ⏳ Email notifications for withdrawal status changes
- ⏳ Bulk approval for multiple requests
- ⏳ Scheduled automatic payouts (e.g., every Friday)
- ⏳ Minimum withdrawal amount requirement
- ⏳ Withdrawal fee/charges configuration
- ⏳ Broker bank account verification
- ⏳ Multi-currency support

## Support

If you encounter issues:
1. Check this guide first
2. Review your transaction history
3. Contact system administrator
4. Check Supabase logs for errors

---

**Last Updated**: November 2024
**System Version**: 1.0
**Manual Processing**: ✅ Yes (No automatic payments)
