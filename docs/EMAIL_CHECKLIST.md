# ✅ Email Setup Checklist - Unique Investor

## 📋 Quick Checklist

Copy this and check off as you go:

---

## STEP 1: Supabase Dashboard Configuration ⏱️ 2 min

```
□ Login to Supabase: https://app.supabase.com
□ Select your project
□ Go to: Authentication → URL Configuration
□ Set Site URL: http://localhost:9003
□ Add Redirect URL: http://localhost:9003/reset-password
□ Click Save
```

---

## STEP 2: Choose Email Method

### Option A: Quick Test (Default Supabase Email)
```
□ Nothing to do - already configured!
□ Go to Step 3 to test
```

### Option B: Production (SendGrid - RECOMMENDED)
```
□ Sign up at: https://sendgrid.com/
□ Verify your email
□ Go to: Settings → API Keys
□ Create API Key (name: "Unique Investor")
□ Copy API Key (starts with SG.)
□ Go to: Settings → Sender Authentication
□ Verify a single sender email
□ Check email and verify
□ Go to Supabase → Project Settings → Auth
□ Enable Custom SMTP
□ Fill in:
   Host: smtp.sendgrid.net
   Port: 587
   Username: apikey
   Password: [Your SendGrid API Key]
   Sender email: [Your verified email]
   Sender name: Unique Investor
□ Click Save
```

---

## STEP 3: Test the Flow ⏱️ 1 min

```
□ Start dev server: npm run dev
□ Open: http://localhost:9003/login
□ Click: "Forgot password?"
□ Enter your email
□ Click: "Send Reset Link"
□ Check email inbox (wait 10-30 seconds)
□ Check spam folder if needed
□ Click reset link in email
□ Create new password
□ Verify new password works
□ Login successfully ✅
```

---

## STEP 4: Verify Everything Works

```
□ Email arrives in inbox (not spam)
□ Reset link opens correctly
□ Password requirements shown
□ Can create new password
□ Success message appears
□ Redirects to login
□ Can login with new password
```

---

## 🐛 If Something Goes Wrong

### Email Not Arriving?
```
□ Check spam/junk folder
□ Supabase → Authentication → Logs (check for errors)
□ Verify sender email in SendGrid (if using)
□ Check API key is correct
□ Verify redirect URL is saved
```

### "Invalid or Expired Link"?
```
□ Request new reset link (old one already used)
□ Use link within 1 hour
□ Check redirect URLs in Supabase
```

### SMTP Connection Error?
```
□ Check username is exactly: apikey (not your email)
□ Verify API key has no extra spaces
□ Check port is 587 (not 465 or 25)
□ Verify sender email is verified in SendGrid
```

---

## 📊 Current Status

Mark where you are:

```
□ Just started
□ Supabase URLs configured
□ Email service chosen
□ SendGrid account created (if using)
□ SMTP configured in Supabase
□ First test email sent
□ Email received successfully
□ Password reset works end-to-end
□ All done! ✅
```

---

## 🎯 Production Checklist (Before Launch)

```
□ Using production email service (not Supabase default)
□ Sender domain verified (if using custom domain)
□ Email template customized with branding
□ Site URL updated to production domain
□ Redirect URLs include production domain
□ Tested with multiple email providers (Gmail, Yahoo, Outlook)
□ Emails arriving in inbox (not spam)
□ Error monitoring set up
□ Rate limiting understood (SendGrid: 100/day free)
```

---

## 📱 Contact Support

If stuck after trying troubleshooting:

1. **Supabase Support**: 
   - Dashboard → Help & Support
   - https://supabase.com/docs/guides/auth

2. **SendGrid Support**:
   - https://docs.sendgrid.com/

3. **Me**: Ask for help anytime! 😊

---

## ⏱️ Time Estimate

- Quick Test Setup: **2 minutes**
- Production Setup (SendGrid): **10 minutes**
- Testing: **2 minutes**
- **Total: 12-15 minutes**

---

## 🎉 Success Looks Like:

```
✅ User clicks "Forgot password?"
✅ Enters email and submits
✅ Receives email within 10 seconds
✅ Email is in inbox (not spam)
✅ Clicks link, opens reset page
✅ Creates new strong password
✅ Success message shown
✅ Redirects to login
✅ Logs in with new password
✅ Access dashboard successfully
```

---

## 📚 Reference Documents

If you need more details:

- **FAST_EMAIL_SETUP.md** - Quick visual guide
- **EMAIL_SETUP_GUIDE.md** - Detailed instructions with troubleshooting
- **PASSWORD_RESET_SETUP.md** - Technical documentation
- **AUTH_COMPARISON.md** - Why Supabase is best choice

---

## 🚀 You Got This!

The email system is already built. You just need to configure it!

**Ready? Let's go!** Start with Step 1 above. ⬆️

---

*Last Updated: November 2025*
*App: Unique Investor v1.0*
