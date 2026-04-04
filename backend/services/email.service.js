import nodemailer from "nodemailer"

const getEmailConfig = () => {
  const emailUser = process.env.EMAIL_USER?.trim();
  const emailPass = process.env.EMAIL_PASS?.replace(/\s+/g, "").trim();

  return { emailUser, emailPass };
}

const createTransporter = () => {
  const { emailUser, emailPass } = getEmailConfig();

  if (!emailUser || !emailPass) {
    throw new Error("Email service is not configured. Missing EMAIL_USER or EMAIL_PASS");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
}

const sendOtpEmail = async (email, otp) => {
  const { emailUser } = getEmailConfig();
  const transporter = createTransporter();

  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #075e54;">chatBlizz Web Verification</h2>
      <p>Hi there,</p>
      <p>Your one-time password (OTP) to verify your chatBlizz Web account is:</p>
      <h1 style="background: #e0f7fa; color: #000; padding: 10px 20px; display: inline-block; border-radius: 5px; letter-spacing: 2px;">
        ${otp}
      </h1>
      <p><strong>This OTP is valid for the next 5 minutes.</strong> Please do not share this code with anyone.</p>
      <p>If you didn't request this OTP, please ignore this email.</p>
      <p style="margin-top: 20px;">Thanks & Regards,<br/>WhatsApp Web Security Team</p>
      <hr style="margin: 30px 0;" />
      <small style="color: #777;">This is an automated message. Please do not reply.</small>
    </div>
  `;

  await transporter.sendMail({
    from: `chatBlizz web <${emailUser}>`,
    to: email,
    subject: "otp whatsapp verification code",
    html,
  })
}

export default sendOtpEmail;
