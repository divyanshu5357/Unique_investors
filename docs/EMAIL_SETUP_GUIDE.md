# 📧 Email Configuration Guide for Unique Investor

## 🎯 Two Ways to Configure Email

### **Option 1: Quick Setup (For Testing - 2 minutes)** ⚡
Use Supabase's built-in email service (development only)

### **Option 2: Production Setup (10 minutes)** 🚀
Use a professional email service like SendGrid or Gmail

---

## 🟢 OPTION 1: Quick Test Setup (Supabase Default)

### For Local Development Testing:

Your local Supabase instance uses **Inbucket** - a built-in email testing server.

#### Step 1: Start Local Supabase (if using local setup)
```bash
cd supabase
supabase start
```

#### Step 2: View Test Emails
- Open: **http://localhost:54324** (Inbucket web interface)
- All password reset emails will appear here
- No configuration needed!

### For Production (Supabase Cloud):

1. **Login to Supabase Dashboard**: https://app.supabase.com
2. **Select your project**
3. Go to: **Authentication** → **URL Configuration**
4. Update settings:
   ```
   Site URL: http://localhost:9003
   Additional Redirect URLs:
   - http://localhost:9003/reset-password
   - https://yourdomain.com/reset-password
   ```
5. Click **Save**

**Note**: Supabase will use their default email service (limited to ~3-4 emails per hour per IP for testing)

---

## 🟡 OPTION 2: Production Email Setup

For production, you need a proper email service. Here are the best options:

---

### 🥇 **RECOMMENDED: SendGrid** (Free: 100 emails/day)

#### Why SendGrid?
- ✅ Free tier: 100 emails per day (enough for most startups)
- ✅ Easy setup
- ✅ Reliable delivery
- ✅ Great documentation
- ✅ No credit card needed for free tier

#### Setup Steps:

**1. Create SendGrid Account**
- Visit: https://sendgrid.com/
- Sign up for free account
- Verify your email

**2. Get API Key**
- Go to: **Settings** → **API Keys**
- Click: **Create API Key**
- Name: "Unique Investor Production"
- Choose: **Restricted Access**
- Enable: **Mail Send** → Full Access
- Click: **Create & View**
- **COPY THE API KEY** (you won't see it again!)

**3. Verify Sender Identity**
- Go to: **Settings** → **Sender Authentication**
- Choose one:
  - **Single Sender Verification** (easiest - verify one email)
  - **Domain Authentication** (professional - verify your domain)

For Single Sender:
- Click: **Verify a Single Sender**
- Fill in:
  ```
  From Name: Unique Investor
  From Email: noreply@yourdomain.com (or your Gmail)
  Reply To: support@yourdomain.com
  Company: Unique Investor
  Address: [Your address]
  ```
- Check email and click verification link

**4. Configure in Supabase**
- Login to: https://app.supabase.com
- Select your project
- Go to: **Project Settings** → **Auth**
- Scroll down to: **SMTP Settings**
- Enable: **Enable Custom SMTP**
- Fill in:
  ```
  Host: smtp.sendgrid.net
  Port: 587
  Username: apikey
  Password: [Paste your SendGrid API Key]
  Sender email: noreply@yourdomain.com
  Sender name: Unique Investor
  ```
- Click: **Save**

**5. Test It!**
- Go to your app: http://localhost:9003/forgot-password
- Enter your email
- Check your inbox (should arrive in 10-30 seconds)

---

### 🥈 **Gmail Setup** (For Testing - Not for Production)

#### ⚠️ Warning: Gmail has daily limits (500 emails/day) and is not recommended for production

#### Setup Steps:

**1. Enable 2-Factor Authentication**
- Go to: https://myaccount.google.com/security
- Enable: **2-Step Verification**

**2. Create App Password**
- Go to: https://myaccount.google.com/apppasswords
- Select: **Mail** and **Other (Custom name)**
- Name: "Unique Investor"
- Click: **Generate**
- **COPY THE 16-CHARACTER PASSWORD**

**3. Configure in Supabase**
- Login to: https://app.supabase.com
- Select your project
- Go to: **Project Settings** → **Auth**
- Scroll to: **SMTP Settings**
- Enable: **Enable Custom SMTP**
- Fill in:
  ```
  Host: smtp.gmail.com
  Port: 587
  Username: your-gmail@gmail.com
  Password: [Paste your 16-char App Password]
  Sender email: your-gmail@gmail.com
  Sender name: Unique Investor
  ```
- Click: **Save**

---

### 🥉 **AWS SES** (For Large Scale - Best Price)

#### Best for: Sending 50,000+ emails/month

**Pricing**: $0.10 per 1,000 emails (after free tier)

#### Quick Setup:

**1. Create AWS Account**
- Visit: https://aws.amazon.com/ses/

**2. Verify Email/Domain**
- Go to SES Console
- Click: **Verified identities** → **Create identity**
- Choose: **Email address** or **Domain**
- Complete verification

**3. Create SMTP Credentials**
- Go to: **SMTP Settings**
- Click: **Create SMTP credentials**
- Save the credentials

**4. Configure in Supabase**
```
Host: email-smtp.[region].amazonaws.com
Port: 587
Username: [Your SMTP username]
Password: [Your SMTP password]
Sender email: verified@yourdomain.com
Sender name: Unique Investor
```

**Note**: Start in "Sandbox Mode" (free), then request "Production Access"

---

## 🎨 Customize Email Templates

### Step 1: Go to Email Templates
- Supabase Dashboard → **Authentication** → **Email Templates**

### Step 2: Select "Reset Password"

### Step 3: Customize Template

Here's a beautiful template for your app:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f5dc;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #228B22;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .content p {
            color: #333;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        .button {
            display: inline-block;
            background-color: #228B22;
            color: white !important;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
        }
        .button:hover {
            background-color: #1a6b1a;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 20px 30px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #e0e0e0;
        }
        .security-notice {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .security-notice p {
            margin: 0;
            color: #856404;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 UNIQUE INVESTOR</h1>
        </div>
        <div class="content">
            <h2 style="color: #228B22;">Reset Your Password</h2>
            <p>Hello,</p>
            <p>We received a request to reset your password for your Unique Investor account.</p>
            <p>Click the button below to create a new password:</p>
            
            <div style="text-align: center;">
                <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
            </div>
            
            <div class="security-notice">
                <p><strong>⏰ Security Notice:</strong> This link will expire in 1 hour for your security.</p>
            </div>
            
            <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #228B22; font-size: 12px;">{{ .ConfirmationURL }}</p>
        </div>
        <div class="footer">
            <p><strong>Unique Investor</strong></p>
            <p>Where Dreams Come True</p>
            <p>📧 uniqueinvestor@yahoo.com | 🌐 www.uniqueinvestor.com</p>
            <p style="margin-top: 15px;">© 2025 Unique Investor. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
```

### Step 4: Save Template

---

## 🧪 Testing Your Email Setup

### Test Script:

```bash
# In your terminal
cd /Users/sakshisingh/Desktop/javascript/projects/Unique_investor/Unique_investors

# Start dev server
npm run dev

# Open browser
open http://localhost:9003/login
```

### Test Flow:
1. Click "Forgot password?"
2. Enter your email (one you have access to)
3. Submit
4. Check your inbox (wait 10-30 seconds)
5. Check spam folder if not in inbox
6. Click the reset link
7. Create new password
8. Try logging in with new password

---

## 🔍 Troubleshooting

### Problem: Email not received

**Check List:**
- [ ] Check spam/junk folder
- [ ] Verify SMTP credentials are correct
- [ ] Check sender email is verified
- [ ] Look at Supabase logs: Authentication → Logs
- [ ] Verify redirect URLs are configured
- [ ] Check email rate limits

### Problem: "SMTP Connection Failed"

**Solutions:**
- Verify Host and Port are correct
- Check username/password (no extra spaces)
- For Gmail: Ensure App Password is used (not regular password)
- For SendGrid: Use "apikey" as username, not your email

### Problem: Email arrives in spam

**Solutions:**
- Verify your sender domain (SendGrid/AWS SES)
- Add SPF and DKIM records to your domain
- Use a professional sender email (not @gmail.com)
- Warm up your sending domain gradually

### View Logs in Supabase:
1. Go to Supabase Dashboard
2. Navigate to: **Authentication** → **Logs**
3. Look for email-related errors
4. Common errors:
   - `SMTP connection failed` = Wrong credentials
   - `Invalid sender` = Email not verified
   - `Rate limit exceeded` = Too many requests

---

## 📊 Email Service Comparison

| Service | Free Tier | Delivery Rate | Setup Difficulty | Best For |
|---------|-----------|---------------|------------------|----------|
| **SendGrid** | 100/day | 99%+ | ⭐⭐ Easy | Most apps |
| **Gmail** | 500/day | 95% | ⭐ Easiest | Testing only |
| **AWS SES** | 62K/month* | 99%+ | ⭐⭐⭐⭐ Hard | Large scale |
| **Mailgun** | 5,000/month | 99%+ | ⭐⭐ Easy | Developers |
| **Postmark** | 100/month | 99%+ | ⭐⭐ Easy | Transactional |

*First 12 months, then $0.10/1000 emails

---

## 🎯 My Recommendation

**For Your App (Unique Investor):**

### Right Now (Development):
✅ Use **Supabase Default** or **Gmail** for testing

### When You Launch:
✅ Use **SendGrid Free Tier** (100 emails/day)
- Easy setup
- Professional
- Reliable
- Free

### When You Grow (1000+ users):
✅ Upgrade to **SendGrid Pro** ($15/month for 40K emails)
OR
✅ Switch to **AWS SES** ($0.10 per 1,000 emails)

---

## 🚀 Quick Start Commands

```bash
# 1. Start your app
npm run dev

# 2. Test password reset
open http://localhost:9003/forgot-password

# 3. Check Supabase logs (if issues)
# Go to: https://app.supabase.com → Authentication → Logs

# 4. Test local email (if using local Supabase)
open http://localhost:54324
```

---

## ✅ Configuration Checklist

Before going to production:

- [ ] Email service configured (SendGrid/Gmail/SES)
- [ ] Sender email verified
- [ ] SMTP credentials saved in Supabase
- [ ] Email template customized
- [ ] Site URL configured correctly
- [ ] Redirect URLs added
- [ ] Test email sent successfully
- [ ] Password reset flow works end-to-end
- [ ] Email arrives in inbox (not spam)
- [ ] Links work correctly

---

## 📞 Need Help?

If you get stuck:
1. Check the troubleshooting section above
2. Look at Supabase logs
3. Test with Supabase default email first
4. Ask me - I'm here to help! 😊

---

## 🎉 Next Steps

1. **Choose your email service** (I recommend SendGrid for production)
2. **Follow the setup guide** above
3. **Customize email template** (optional but recommended)
4. **Test the complete flow**
5. **Monitor delivery** for first few days

You're almost there! 🚀
