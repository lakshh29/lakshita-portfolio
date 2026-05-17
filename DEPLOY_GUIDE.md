# 🚀 Lakshita Portfolio — Deployment Guide
# Follow these steps exactly. Takes ~20 minutes total.

══════════════════════════════════════════════════
STEP 1 — CREATE MONGODB ATLAS DATABASE (Free)
══════════════════════════════════════════════════

1. Go to https://cloud.mongodb.com → Sign up (free)
2. Create a new Project → name it "portfolio"
3. Build a Database → choose FREE tier (M0)
4. Provider: AWS, Region: Mumbai (ap-south-1)
5. Cluster name: portfolio-cluster → Create

6. Security → Database Access → Add New User:
   - Username: portfolio-admin
   - Password: (generate a strong one, SAVE IT)
   - Role: "Atlas admin"

7. Security → Network Access → Add IP Address:
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - (Netlify functions use dynamic IPs so this is needed)

8. Database → Connect → Drivers → Node.js
   - Copy the connection string, looks like:
     mongodb+srv://portfolio-admin:<password>@portfolio-cluster.xxxxx.mongodb.net/
   - Replace <password> with your actual password
   - Add "portfolio" at the end:
     mongodb+srv://portfolio-admin:YOURPASS@portfolio-cluster.xxxxx.mongodb.net/portfolio

   → SAVE THIS AS: MONGODB_URI

══════════════════════════════════════════════════
STEP 2 — CREATE RESEND ACCOUNT (Free Email)
══════════════════════════════════════════════════

1. Go to https://resend.com → Sign up (free)
2. Go to API Keys → Create API Key
   - Name: "portfolio"
   - Permission: Full Access
   → SAVE THIS AS: RESEND_API_KEY (starts with re_)

3. (Optional but recommended) Add your domain:
   - Go to Domains → Add Domain
   - Follow DNS instructions for your domain
   - Then change "from" in contact.js to: noreply@yourdomain.com
   - Until then, Resend's test domain works for receiving emails

══════════════════════════════════════════════════
STEP 3 — GENERATE SECURITY KEYS
══════════════════════════════════════════════════

Run this in your terminal (needs Node.js installed):

  node -e "
    const jwt = require('crypto').randomBytes(64).toString('hex');
    const bcrypt = require('crypto').randomBytes(16).toString('hex');
    console.log('JWT_SECRET=' + jwt);
    console.log('Your random string for password:', bcrypt);
  "

Or use an online tool:
  → JWT_SECRET: Go to https://generate-secret.vercel.app/64 → copy the result

For ADMIN_PASSWORD_HASH:
  → Choose a strong password (e.g. "Lak$hita@2026!")
  → Run this to generate the bcrypt hash:

  node -e "
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('YOUR_CHOSEN_PASSWORD', 12);
    console.log('ADMIN_PASSWORD_HASH=' + hash);
  "

  If you don't have Node.js locally, go to https://bcrypt-generator.com
  → Enter your password, rounds: 12 → Generate

  SAVE:
  → JWT_SECRET      = (the 128 char hex string)
  → ADMIN_PASSWORD  = (your chosen password — memorize this)
  → ADMIN_PASSWORD_HASH = (the $2b$12$... hash)

══════════════════════════════════════════════════
STEP 4 — PUSH TO GITHUB
══════════════════════════════════════════════════

1. Go to https://github.com → New repository
   - Name: lakshita-portfolio
   - Private (recommended)
   - Do NOT initialize with README

2. In your terminal (or GitHub Desktop):

   cd /path/to/portfolio-folder
   git init
   git add .
   git commit -m "Initial portfolio"
   git remote add origin https://github.com/lakshh29/lakshita-portfolio.git
   git push -u origin main

══════════════════════════════════════════════════
STEP 5 — DEPLOY ON NETLIFY
══════════════════════════════════════════════════

1. Go to https://netlify.com → Sign up with GitHub (free)
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub → Select "lakshita-portfolio"
4. Build settings:
   - Build command: (leave EMPTY)
   - Publish directory: public
5. Click "Deploy site"

6. After deploy, go to:
   Site Settings → Environment Variables → Add a variable

   Add ALL of these:

   MONGODB_URI          = mongodb+srv://portfolio-admin:YOURPASS@...mongodb.net/portfolio
   RESEND_API_KEY       = re_xxxxxxxxxxxxxxxx
   JWT_SECRET           = (your 128 char hex string)
   ADMIN_PASSWORD_HASH  = $2b$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   OWNER_EMAIL          = your-email@gmail.com

7. After adding env vars → Deploys → Trigger deploy

══════════════════════════════════════════════════
STEP 6 — VERIFY EVERYTHING WORKS
══════════════════════════════════════════════════

✅ Portfolio: https://your-site.netlify.app
✅ Admin panel: https://your-site.netlify.app/admin
   → Login with your chosen password

✅ Test contact form:
   → Fill out the form on the portfolio
   → Check lakshitaajakhar@gmail.com for the email
   → Check admin panel → Messages

✅ Analytics start tracking immediately

══════════════════════════════════════════════════
STEP 7 — CUSTOM DOMAIN (Optional)
══════════════════════════════════════════════════

1. Buy a domain (e.g. lakshitajakhar.dev) from Namecheap or GoDaddy
2. Netlify → Domain Settings → Add custom domain
3. Follow the DNS configuration steps
4. SSL is automatic and free via Netlify

══════════════════════════════════════════════════
FILE STRUCTURE
══════════════════════════════════════════════════

portfolio/
├── netlify.toml                    ← Netlify config
├── package.json                    ← Dependencies
├── public/
│   └── index.html                  ← Your portfolio
├── admin/
│   └── index.html                  ← Admin dashboard
└── netlify/
    └── functions/
        ├── _db.js                  ← MongoDB connection
        ├── contact.js              ← Contact form API
        ├── analytics.js            ← Analytics API
        ├── auth.js                 ← Admin login API
        └── messages.js             ← Messages API

══════════════════════════════════════════════════
API ENDPOINTS (auto-created by Netlify)
══════════════════════════════════════════════════

POST /.netlify/functions/contact    → Submit contact form
POST /.netlify/functions/analytics  → Track page view
GET  /.netlify/functions/analytics  → Get stats (admin)
POST /.netlify/functions/auth       → Admin login
GET  /.netlify/functions/auth       → Verify token
GET  /.netlify/functions/messages   → List messages (admin)
PATCH /.netlify/functions/messages  → Mark as read (admin)
DELETE /.netlify/functions/messages → Delete message (admin)

══════════════════════════════════════════════════
TROUBLESHOOTING
══════════════════════════════════════════════════

❌ Contact form says "Failed to send":
   → Check MONGODB_URI and RESEND_API_KEY in Netlify env vars
   → Check Netlify Functions logs: Site → Functions tab

❌ Admin login says "Admin not configured":
   → ADMIN_PASSWORD_HASH env var is missing or wrong format
   → Must start with $2b$12$

❌ Emails not arriving:
   → Check spam folder
   → Resend free tier: confirm your email in Resend dashboard

❌ MongoDB connection timeout:
   → Make sure 0.0.0.0/0 is in Atlas Network Access
   → Check the connection string has the right password
