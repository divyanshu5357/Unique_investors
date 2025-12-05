# WhatsApp Contact Form Integration Guide

## Overview
This setup enables WhatsApp notifications when someone submits the contact form.

**Current Implementation:** WhatsApp Manual Link Method
- ✅ No API configuration needed
- ✅ Works immediately
- ✅ No external dependencies
- ✅ Perfect for Vercel deployment

## Setup Instructions

### Method: WhatsApp Manual Link (Current - No Setup Required)

The system automatically generates a WhatsApp link that opens the chat in your browser. No API setup needed!

**How It Works:**

1. **User submits contact form**
   - Provides name, email, phone, message

2. **System generates WhatsApp link**
   - Formats message with all details
   - Creates wa.me link with pre-filled message
   - Link: `https://wa.me/918810317477?text=<message>`

3. **User sends message**
   - Clicks link to open WhatsApp
   - Message appears pre-filled
   - User clicks Send

**Environment Variables Needed:**
```bash
# No API credentials needed!
# System works out of the box
```

---

### Previous Methods (Not Currently Active)

#### Method 1: Twilio WhatsApp API (Legacy)
If you want to re-enable automatic message sending via Twilio:

1. Go to https://www.twilio.com/
2. Create account and enable WhatsApp Sandbox
3. Get Account SID and Auth Token
4. Add to `.env.local`:
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155552671
```

#### Method 2: Meta WhatsApp Business API (Legacy)
If you want to re-enable via Meta's official API:

1. Go to https://developers.facebook.com/
2. Create Business Account
3. Set up WhatsApp Business Account
4. Get Phone Number ID and Access Token
5. Add to `.env.local`:
```bash
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_ACCESS_TOKEN=your_access_token_here
```

---

## How It Works

### When Contact Form is Submitted:

1. **Form Data Captured**
   - Name, Email, Phone, Message validated
   
2. **Message Formatted**
   - Structured with contact details
   - Emojis added for clarity
   - URL encoded for WhatsApp link

3. **WhatsApp Link Generated**
   - wa.me link created with pre-filled message
   - Can be displayed or copied

4. **User Action**
   - Click link to open WhatsApp
   - Pre-filled message appears
   - User clicks Send

---

## Testing

### Manual Link Method (Current):
1. Fill out contact form
2. Submit form
3. See WhatsApp link displayed or in browser console
4. Click link to open WhatsApp
5. Message appears pre-filled
6. Click Send

---

## Message Format Example

```
📬 New Contact Form Submission

👤 Name: John Doe
📧 Email: john@example.com
📞 Phone: +91 9876543210

💬 Message:
I'm interested in the Green Enclave project. 
Can you provide more details about payment terms?
```

---

## Troubleshooting

### WhatsApp Link Not Working
- Verify phone number is correct in route
- Check message formatting (no special chars that break URLs)
- Ensure wa.me link is properly encoded

### Message Not Pre-filled
- Check if message is being URL encoded correctly
- Some special characters may cause issues
- Try again with simpler message text

### General:
- Check browser console for error messages
- Verify contact form data validation passes
- Check server logs for API route errors

---

## Security Notes

⚠️ **Important:**
- Manual link method has no sensitive data
- No API keys are needed or stored
- Phone number can be changed in code
- Consider storing phone number as environment variable for flexibility

---

## File Locations

- **Contact Form:** `src/app/contact/page.tsx`
- **Server Action:** `src/lib/actions.ts` → `submitContactForm()`
- **WhatsApp API Route:** `src/app/api/send-whatsapp/route.ts`
- **Environment Variables:** `.env.local`

---

## Next Steps

1. ✅ No setup required - system works immediately
2. Test the contact form on your site
3. Click the WhatsApp link to verify
4. Message should appear pre-filled
5. Send to confirm everything works

For questions or to add API integration later, refer to:
- WhatsApp wa.me documentation: https://www.whatsapp.com/
- Previous implementation: Check git history for Twilio/Meta code
