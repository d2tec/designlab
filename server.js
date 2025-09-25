import express from 'express'
import cors from 'cors'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
dotenv.config()

const app = express()
const PORT = process.env.PORT || 8787

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body || {}
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing fields' })
    }

    const smtpPort = Number(process.env.SMTP_PORT || 587)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    // Verify SMTP connection and authentication up-front for clearer errors
    try {
      await transporter.verify()
      console.log('[mail] SMTP verified with host:', process.env.SMTP_HOST)
    } catch (verifyErr) {
      console.error('[mail] SMTP verify failed:', verifyErr.message)
      return res.status(500).json({ error: 'Email service not configured correctly', details: verifyErr.message })
    }

    const toAddress = process.env.TO_EMAIL || process.env.FROM_EMAIL || process.env.SMTP_USER
    const fromAddress = process.env.FROM_EMAIL || process.env.SMTP_USER

    const mailOptions = {
      from: `Portfolio Contact <${fromAddress}>`,
      to: toAddress,
      subject: `Portfolio inquiry from ${name}`,
      replyTo: email,
      text: message,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif; line-height:1.5;">
          <h2 style="margin:0 0 12px;">New portfolio inquiry</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space:pre-wrap;">${message.replace(/</g,'&lt;')}</p>
        </div>
      `,
    }

    console.log('[mail] sending to:', toAddress)
    const info = await transporter.sendMail(mailOptions)
    console.log('[mail] sent id:', info.messageId, 'response:', info.response)

    res.json({ ok: true, id: info.messageId })
  } catch (err) {
    console.error('[mail] send error:', err && err.message ? err.message : err)
    res.status(500).json({ error: 'Failed to send message', details: err && err.toString ? err.toString() : err })
  }
})

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})


