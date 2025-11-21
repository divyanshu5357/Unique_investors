# Password Reset Setup Guide

This document explains how to configure the password reset functionality in your application.

## ✅ Features Implemented

1. **Forgot Password Page** (`/forgot-password`)
   - User enters their email
   - System sends password reset link

2. **Reset Password Page** (`/reset-password`)
   - User creates new password
   - Password strength validation
   - Confirmation required

3. **Login Page Updated**
   - Added "Forgot password?" link

## 🔧 Supabase Configuration

### Step 1: Configure Email Templates

1. Go to your Supabase Dashboard
2. Navigate to **Authentication → Email Templates**
3. Select **Reset Password** template
4. Customize the template (optional):

```html
<h2>Reset Your Password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request this, please ignore this email.</p>
```

### Step 2: Configure Site URL

1. Go to **Authentication → URL Configuration**
2. Set **Site URL**: `https://yourdomain.com` (or `http://localhost:9003` for development)
3. Add **Redirect URLs**:
   - `https://yourdomain.com/reset-password`
   - `http://localhost:9003/reset-password`

### Step 3: Configure Email Settings

1. Go to **Project Settings → Auth**
2. Enable **Email Confirmations** (if not already enabled)
3. Set **Mailer autoconfirm**: OFF (for production)
4. For production, configure **SMTP Settings** with your email provider:
   - Gmail
   - SendGrid
   - AWS SES
   - Mailgun
   - etc.

## 📧 Email Provider Setup (Production)

### Option 1: Gmail (Development Only)
**Not recommended for production** - Use for testing only

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password
3. In Supabase → Project Settings → Auth → SMTP Settings:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - Username: your Gmail address
   - Password: your App Password

### Option 2: SendGrid (Recommended)
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create an API Key
3. Verify your sender domain
4. In Supabase SMTP Settings:
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - Username: `apikey`
   - Password: Your SendGrid API Key

### Option 3: AWS SES (Enterprise)
1. Set up AWS SES account
2. Verify your domain
3. Create SMTP credentials
4. Configure in Supabase

## 🔐 Password Requirements

The reset password page enforces these requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

## 🧪 Testing Locally

1. Start your development server:
```bash
npm run dev
```

2. Navigate to `http://localhost:9003/forgot-password`

3. Enter a registered email address

4. Check your email for the reset link

5. Click the link (opens `/reset-password`)

6. Enter and confirm your new password

7. Login with the new password

## 🚀 Testing Flow

```
┌─────────────┐
│ Login Page  │
└──────┬──────┘
       │
       │ Click "Forgot password?"
       ▼
┌─────────────────┐
│ Forgot Password │ ──► Enter email
└──────┬──────────┘
       │
       │ Email sent
       ▼
┌─────────────┐
│ Check Email │ ──► Receive reset link
└──────┬──────┘
       │
       │ Click link
       ▼
┌─────────────────┐
│ Reset Password  │ ──► Create new password
└──────┬──────────┘
       │
       │ Password updated
       ▼
┌─────────────┐
│ Login Page  │ ──► Login with new password
└─────────────┘
```

## 🔍 Troubleshooting

### Email not received?
1. Check spam/junk folder
2. Verify email configuration in Supabase
3. Check Supabase logs (Authentication → Logs)
4. Ensure SMTP settings are correct

### "Invalid or Expired Link" error?
1. Reset links expire after 1 hour (default)
2. Links can only be used once
3. Request a new reset link

### Password doesn't meet requirements?
- Ensure password has:
  - 8+ characters
  - Uppercase letter
  - Lowercase letter
  - Number

## 📝 Custom Email Templates

You can customize the email template in Supabase:

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        .button { 
            background-color: #228B22; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <h2>Reset Your Unique Investor Password</h2>
    <p>Hi there,</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <p>
        <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
    </p>
    <p>This link will expire in 1 hour for security reasons.</p>
    <p>If you didn't request this, you can safely ignore this email.</p>
    <p>Best regards,<br>Unique Investor Team</p>
</body>
</html>
```

## 🎯 Security Best Practices

1. **Rate Limiting**: Supabase automatically rate limits password reset requests
2. **Token Expiry**: Reset tokens expire after 1 hour
3. **One-Time Use**: Reset links can only be used once
4. **Password Strength**: Enforced on frontend and can be enforced on backend
5. **HTTPS Only**: Always use HTTPS in production

## 📚 Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Password Reset Flow](https://supabase.com/docs/guides/auth/passwords)
- [Email Templates Guide](https://supabase.com/docs/guides/auth/auth-email-templates)
