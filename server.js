require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors({
  origin: '*', // Restrict to your Netlify domain in production e.g. 'https://yoursite.netlify.app'
  methods: ['POST', 'GET']
}));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'IT Onboarding Email Server', time: new Date().toISOString() });
});

// ── Department SMTP senders ───────────────────────────────────────────────────
// Each department sends from its own Office 365 account
// These are loaded from environment variables (see .env.example)
const SENDERS = {
  management: {
    user: process.env.EMAIL_MANAGEMENT,
    pass: process.env.PASS_MANAGEMENT,
    name: 'Mohammed Al-Raihan'
  },
  it: {
    user: process.env.EMAIL_IT,
    pass: process.env.PASS_IT,
    name: 'IT Department (Sujeer)'
  },
  hr: {
    user: process.env.EMAIL_HR,
    pass: process.env.PASS_HR,
    name: 'HR Department (Abdullah Al-Salmi)'
  },
  access: {
    user: process.env.EMAIL_ACCESS,
    pass: process.env.PASS_ACCESS,
    name: 'Access Control (Salem Bin Sawad)'
  },
  pos: {
    user: process.env.EMAIL_POS,
    pass: process.env.PASS_POS,
    name: 'POS (Mona)'
  }
};

// ── Create transporter for a given department ─────────────────────────────────
function getTransporter(dept) {
  const sender = SENDERS[dept];
  if (!sender || !sender.user || !sender.pass) {
    throw new Error(`No credentials configured for department: ${dept}`);
  }
  return nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: sender.user,
      pass: sender.pass
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    }
  });
}

// ── Send email endpoint ───────────────────────────────────────────────────────
// POST /send-email
// Body: { fromDept, to, subject, html, text }
app.post('/send-email', async (req, res) => {
  const { fromDept, to, subject, html, text } = req.body;

  // Validate
  if (!fromDept || !to || !subject) {
    return res.status(400).json({ error: 'fromDept, to, and subject are required.' });
  }
  if (!SENDERS[fromDept]) {
    return res.status(400).json({ error: `Unknown department: ${fromDept}` });
  }

  const sender = SENDERS[fromDept];
  if (!sender.user || !sender.pass) {
    return res.status(500).json({ error: `Email credentials not configured for: ${fromDept}` });
  }

  try {
    const transporter = getTransporter(fromDept);
    const toAddresses = Array.isArray(to) ? to.join(', ') : to;

    const info = await transporter.sendMail({
      from: `"${sender.name}" <${sender.user}>`,
      to: toAddresses,
      subject,
      text: text || '',
      html: html || text || ''
    });

    console.log(`[${new Date().toISOString()}] Email sent: ${info.messageId} | From: ${fromDept} | To: ${toAddresses} | Subject: ${subject}`);
    res.json({ success: true, messageId: info.messageId });

  } catch (err) {
    console.error(`[${new Date().toISOString()}] Email error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Send bulk emails endpoint (multiple recipients as separate emails) ─────────
// POST /send-bulk
// Body: { emails: [{ fromDept, to, subject, html, text }, ...] }
app.post('/send-bulk', async (req, res) => {
  const { emails } = req.body;
  if (!Array.isArray(emails) || !emails.length) {
    return res.status(400).json({ error: 'emails array is required.' });
  }

  const results = [];
  for (const mail of emails) {
    try {
      const sender = SENDERS[mail.fromDept];
      if (!sender || !sender.user || !sender.pass) {
        results.push({ to: mail.to, success: false, error: `No credentials for ${mail.fromDept}` });
        continue;
      }
      const transporter = getTransporter(mail.fromDept);
      const toAddr = Array.isArray(mail.to) ? mail.to.join(', ') : mail.to;
      const info = await transporter.sendMail({
        from: `"${sender.name}" <${sender.user}>`,
        to: toAddr,
        subject: mail.subject,
        text: mail.text || '',
        html: mail.html || mail.text || ''
      });
      console.log(`[${new Date().toISOString()}] Bulk email sent: ${info.messageId} | To: ${toAddr}`);
      results.push({ to: mail.to, success: true, messageId: info.messageId });
    } catch (err) {
      console.error(`Bulk email error for ${mail.to}:`, err.message);
      results.push({ to: mail.to, success: false, error: err.message });
    }
  }

  const allOk = results.every(r => r.success);
  res.status(allOk ? 200 : 207).json({ results });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`IT Onboarding Email Server running on port ${PORT}`);
  console.log(`Configured senders:`);
  Object.entries(SENDERS).forEach(([dept, s]) => {
    console.log(`  ${dept}: ${s.user ? s.user : '⚠ NOT CONFIGURED'}`);
  });
});
