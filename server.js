require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'IT Onboarding Email Server',
    sender: process.env.SMTP_EMAIL || 'NOT CONFIGURED',
    host: process.env.SMTP_HOST || 'NOT CONFIGURED',
    time: new Date().toISOString()
  });
});

app.post('/send-email', async (req, res) => {
  const { to, subject, html, text, fromLabel } = req.body;

  if (!to || !subject) {
    return res.status(400).json({ error: 'to and subject are required.' });
  }

  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    return res.status(500).json({ error: 'SMTP_EMAIL and SMTP_PASSWORD are not configured.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const toAddresses = Array.isArray(to) ? to.join(', ') : to;
    const info = await transporter.sendMail({
      from: `"${fromLabel || 'Onboarding System'}" <${process.env.SMTP_EMAIL}>`,
      to: toAddresses,
      subject,
      text: text || '',
      html: html || text || ''
    });

    console.log(`✅ Email sent: ${info.messageId} | To: ${toAddresses} | Subject: ${subject}`);
    res.json({ success: true, messageId: info.messageId });

  } catch (err) {
    console.error(`❌ Email error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📧 SMTP Host: ${process.env.SMTP_HOST || 'smtp-relay.brevo.com'}`);
  console.log(`📧 SMTP Port: ${process.env.SMTP_PORT || '587'}`);
  console.log(`📧 Sender: ${process.env.SMTP_EMAIL || 'NOT CONFIGURED'}\n`);
});
