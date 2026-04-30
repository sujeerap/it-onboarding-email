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
    time: new Date().toISOString()
  });
});

function getTransporter() {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    throw new Error('SMTP_EMAIL and SMTP_PASSWORD are not set.');
  }
  return nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 25,
    secure: false,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    }
  });
}

app.post('/send-email', async (req, res) => {
  const { to, subject, html, text, fromLabel } = req.body;
  if (!to || !subject) {
    return res.status(400).json({ error: 'to and subject are required.' });
  }
  try {
    const transporter = getTransporter();
    const senderName = fromLabel || 'Employee Onboarding System';
    const toAddresses = Array.isArray(to) ? to.join(', ') : to;
    const info = await transporter.sendMail({
      from: `"${senderName}" <${process.env.SMTP_EMAIL}>`,
      to: toAddresses,
      subject,
      text: text || '',
      html: html || text || ''
    });
    console.log(`Email sent: ${info.messageId} | To: ${toAddresses}`);
    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('Email error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Sender: ${process.env.SMTP_EMAIL || 'NOT CONFIGURED'}`);
});
