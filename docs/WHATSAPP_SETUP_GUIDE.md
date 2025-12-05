# WhatsApp Contact Form Integration Guide

## Overview
This setup enables automatic WhatsApp notifications when someone submits the contact form. The system supports three methods with fallbacks:

1. **Twilio WhatsApp API** (Most Reliable)
2. **Meta WhatsApp Business API** (Direct)
3. **WhatsApp Manual Link** (Fallback)

## Setup Instructions

### Method 1: Using Twilio (Recommended)

#### Step 1: Create Twilio Account
1. Go to https://www.twilio.com/
2. Sign up for a free account
3. Verify your email and phone number

#### Step 2: Enable WhatsApp Sandbox
1. In Twilio Console, go to **Messaging > Try it out > Send an SMS**
2. Navigate to **Messaging > Explore > Sandbox**
3. Create a WhatsApp Sandbox
4. Your sandbox number will look like: `whatsapp:+14155552671`

#### Step 3: Add Your Phone Number
1. Send `join <JOIN_CODE>` to the Twilio WhatsApp sandbox number
2. You'll receive the JOIN_CODE in your Twilio Console

#### Step 4: Get Twilio Credentials
1. Go to **Account > API keys & tokens**
2. Copy your:
   - **Account SID**
   - **Auth Token**

#### Step 5: Set Environment Variables
Add to `.env.local`:
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155552671
```

---

### Method 2: Using Meta WhatsApp Business API

#### Step 1: Create Meta Business Account
1. Go to https://developers.facebook.com/
2. Create a business account

#### Step 2: Set Up WhatsApp Business Account
1. In Business Manager, go to **WhatsApp > Getting Started**
2. Create a WhatsApp Business Account
3. Add your phone number (+91 88103 17477)

#### Step 3: Get Access Token
1. Navigate to **Settings > System Users**
2. Create a system user with Admin role
3. Generate an access token with `whatsapp_business_messaging` scope
4. Copy the access token and Phone Number ID

#### Step 4: Set Environment Variables
Add to `.env.local`:
```bash
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_ACCESS_TOKEN=your_access_token_here
```

---

### Method 3: WhatsApp Manual Link (No Setup Required)
The system automatically generates a WhatsApp link that opens the chat in your browser. No API setup needed!

---

## How It Works

### When Contact Form is Submitted:

1. **Form Data Captured**
   - Name, Email, Phone, Message stored in database
   
2. **WhatsApp Processing** (in order of availability):
   - ✅ Tries Twilio API → Sends direct message
   - ✅ Tries Meta API → Sends direct message
   - ✅ Falls back to WhatsApp link → Generate manual link

3. **Notification Delivered**
   - You receive WhatsApp message with:
     - Sender's name
     - Email address
     - Phone number
     - Full message

---

## Testing

### Without API Setup:
1. Fill out contact form
2. Check browser console (Dev Tools)
3. You'll see the WhatsApp link that opens the message

### With Twilio Setup:
1. Fill out contact form
2. Check your WhatsApp inbox
3. Message should arrive within seconds

### With Meta API Setup:
1. Fill out contact form
2. Check your WhatsApp inbox
3. Message should arrive within seconds

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

### Messages Not Being Sent

**Twilio Issues:**
- Verify Account SID and Auth Token are correct
- Check that phone number is verified in sandbox
- Ensure `TWILIO_WHATSAPP_FROM` includes `whatsapp:` prefix
- Check Twilio Console logs for errors

**Meta API Issues:**
- Verify Phone Number ID is correct
- Check access token expiration
- Ensure token has `whatsapp_business_messaging` scope
- Check Meta Business Platform logs

**General:**
- Check browser console for error messages
- Verify `.env.local` variables are set correctly
- Restart development server after adding env variables

---

## Security Notes

⚠️ **Important:**
- Never commit `.env.local` to GitHub
- Keep API credentials confidential
- Rotate access tokens regularly
- Use environment variables in production

---

## File Locations

- **Contact Form:** `src/app/contact/page.tsx`
- **Server Action:** `src/lib/actions.ts` → `submitContactForm()`
- **WhatsApp API Route:** `src/app/api/send-whatsapp/route.ts`
- **Environment Variables:** `.env.local`

---

## Next Steps

1. Choose your preferred method (Twilio recommended)
2. Set up the account and get credentials
3. Add environment variables to `.env.local`
4. Test by submitting the contact form
5. Monitor your WhatsApp for incoming messages

For questions or issues, refer to:
- Twilio Docs: https://www.twilio.com/docs/whatsapp
- Meta WhatsApp API: https://developers.facebook.com/docs/whatsapp
