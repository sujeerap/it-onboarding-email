require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'IT Onboarding Email Server',
    method: 'Resend API',
    configured: !!process.env.RESEND_API_KEY,
    time: new Date().toISOString()
  });
});

app.post('/send-email', async (req, res) => {
  const { to, subject, html, text, fromLabel } = req.body;

  if (!to || !subject) {
    return res.status(400).json({ error: 'to and subject are required.' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY is not configured.' });
  }

  try {
    const toList = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
    if (!toList.length) {
      return res.status(400).json({ error: 'No valid recipient email.' });
    }

    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    const senderName = fromLabel || 'Onboarding System';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${senderName} <${fromEmail}>`,
        to: toList,
        subject,
        html: html || text || '<p>No content</p>'
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Email sent: ${data.id} | To: ${toList.join(', ')} | Subject: ${subject}`);
      res.json({ success: true, messageId: data.id });
    } else {
      console.error(`❌ Resend error: ${JSON.stringify(data)}`);
      res.status(500).json({ error: data.message || JSON.stringify(data) });
    }

  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📧 Method: Resend HTTP API`);
  console.log(`🔑 API Key: ${process.env.RESEND_API_KEY ? '✅ Set' : '❌ NOT SET'}`);
  console.log(`📧 From: ${process.env.FROM_EMAIL || 'onboarding@resend.dev'}\n`);
});
