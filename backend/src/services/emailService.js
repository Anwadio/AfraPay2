/**
 * Email Service — powered by Resend
 * Provides transactional email helpers for auth flows.
 */

const { Resend } = require("resend");
const config = require("../config/environment");
const logger = require("../utils/logger");

const resend = new Resend(config.external.resend.apiKey);
const FROM = config.external.resend.fromEmail || "noreply@afrapayafrica.com";
const APP_URL = config.external.appUrl || "http://localhost:3000";

/**
 * Send email verification link to a newly registered user.
 *
 * The `verificationToken` is the raw URL-safe token that will be embedded
 * in the link. The controller is responsible for hashing + storing it
 * before calling this function.
 */
async function sendVerificationEmail(email, verificationToken, firstName) {
  // Link goes to the frontend verification page which calls the backend API.
  // APP_URL is the public frontend URL (e.g. http://localhost:3000 in dev).
  const verifyUrl = `${APP_URL}/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Verify your AfraPay email address",
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
        <body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0"
                style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
                <tr>
                  <td style="background:#1a56db;padding:28px 40px;">
                    <h1 style="color:#fff;margin:0;font-size:22px;">AfraPay</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px 40px;">
                    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;">
                      Hi ${firstName}, please verify your email
                    </h2>
                    <p style="color:#374151;line-height:1.6;margin:0 0 28px;">
                      Thanks for signing up! Click the button below to confirm your
                      email address. This link expires in <strong>24&nbsp;hours</strong>.
                    </p>
                    <a href="${verifyUrl}"
                      style="display:inline-block;background:#1a56db;color:#fff;
                             text-decoration:none;padding:14px 32px;border-radius:6px;
                             font-weight:600;font-size:15px;">
                      Verify Email Address
                    </a>
                    <p style="margin:28px 0 0;font-size:13px;color:#6b7280;">
                      Or copy this link:<br />
                      <a href="${verifyUrl}" style="color:#1a56db;word-break:break-all;">${verifyUrl}</a>
                    </p>
                    <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;">
                      If you did not create an AfraPay account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;">
                      © ${new Date().getFullYear()} AfraPay. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
  });

  if (error) {
    logger.error("Resend: failed to send verification email", {
      to: email,
      error: error.message,
    });
    throw new Error(`Email delivery failed: ${error.message}`);
  }

  logger.info("Resend: verification email sent", { to: email, id: data?.id });
  return data;
}

/**
 * Send a password-reset link.
 */
async function sendPasswordResetEmail(email, resetToken, firstName) {
  const resetUrl = `${APP_URL}/auth/reset-password/confirm?token=${encodeURIComponent(resetToken)}`;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Reset your AfraPay password",
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head><meta charset="UTF-8" /></head>
        <body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0"
                style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
                <tr>
                  <td style="background:#1a56db;padding:28px 40px;">
                    <h1 style="color:#fff;margin:0;font-size:22px;">AfraPay</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px 40px;">
                    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;">
                      Password reset request
                    </h2>
                    <p style="color:#374151;line-height:1.6;margin:0 0 28px;">
                      Hi ${firstName},<br /><br />
                      We received a request to reset your password. Click below to choose a
                      new password. This link expires in <strong>1&nbsp;hour</strong>.
                    </p>
                    <a href="${resetUrl}"
                      style="display:inline-block;background:#1a56db;color:#fff;
                             text-decoration:none;padding:14px 32px;border-radius:6px;
                             font-weight:600;font-size:15px;">
                      Reset Password
                    </a>
                    <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;">
                      If you did not request a password reset, no action is required.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;">
                      © ${new Date().getFullYear()} AfraPay. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
  });

  if (error) {
    logger.error("Resend: failed to send password-reset email", {
      to: email,
      error: error.message,
    });
    throw new Error(`Email delivery failed: ${error.message}`);
  }

  logger.info("Resend: password-reset email sent", { to: email, id: data?.id });
  return data;
}

/**
 * Send a 6-digit MFA OTP to the user's email address.
 * The raw OTP is passed in — hashing is the caller's responsibility.
 */
async function sendMFAOtpEmail(email, otp, firstName) {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Your AfraPay verification code",
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head><meta charset="UTF-8" /></head>
        <body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0"
                style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
                <tr>
                  <td style="background:#1a56db;padding:28px 40px;">
                    <h1 style="color:#fff;margin:0;font-size:22px;">AfraPay</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px 40px;">
                    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;">Hi ${firstName}, here is your verification code</h2>
                    <p style="color:#374151;line-height:1.6;margin:0 0 24px;">
                      Use the code below to complete your sign-in. It expires in <strong>10&nbsp;minutes</strong>.
                    </p>
                    <div style="background:#f3f4f6;border-radius:8px;padding:20px 32px;text-align:center;">
                      <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#1a56db;">${otp}</span>
                    </div>
                    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
                      If you did not attempt to sign in to AfraPay, please change your password immediately.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;">
                      &copy; ${new Date().getFullYear()} AfraPay. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
  });

  if (error) {
    logger.error("Resend: failed to send MFA OTP email", {
      to: email,
      error: error.message,
    });
    throw new Error(`Email delivery failed: ${error.message}`);
  }

  logger.info("Resend: MFA OTP email sent", { to: email, id: data?.id });
  return data;
}

/**
 * Send a login alert email when a new sign-in is detected.
 *
 * @param {string} email       - recipient email
 * @param {string} firstName   - user's first name
 * @param {object} loginInfo   - { ip, device, location, time }
 */
async function sendLoginAlertEmail(email, firstName, loginInfo = {}) {
  const { ip = "Unknown", device = "Unknown device", time } = loginInfo;
  const loginTime = time
    ? new Date(time).toUTCString()
    : new Date().toUTCString();

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: "New sign-in to your AfraPay account",
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head><meta charset="UTF-8" /></head>
        <body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0"
                style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
                <tr>
                  <td style="background:#1a56db;padding:28px 40px;">
                    <h1 style="color:#fff;margin:0;font-size:22px;">AfraPay</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px 40px;">
                    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;">
                      New sign-in detected
                    </h2>
                    <p style="color:#374151;line-height:1.6;margin:0 0 20px;">
                      Hi ${firstName},<br /><br />
                      We noticed a new sign-in to your AfraPay account. Here are the details:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                      style="background:#f9fafb;border-radius:8px;padding:16px 20px;font-size:14px;color:#374151;">
                      <tr>
                        <td style="padding:6px 0;font-weight:600;width:120px;">Time</td>
                        <td style="padding:6px 0;">${loginTime}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-weight:600;">Device</td>
                        <td style="padding:6px 0;">${device}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-weight:600;">IP Address</td>
                        <td style="padding:6px 0;">${ip}</td>
                      </tr>
                    </table>
                    <p style="color:#374151;line-height:1.6;margin:20px 0 0;">
                      If this was you, no action is needed. If you don't recognise this sign-in,
                      please <strong>change your password immediately</strong> and revoke the session
                      from your Security settings.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;">
                      © ${new Date().getFullYear()} AfraPay. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
  });

  if (error) {
    logger.warn("Resend: failed to send login alert email (non-fatal)", {
      to: email,
      error: error.message,
    });
    return null;
  }

  logger.info("Resend: login alert email sent", { to: email, id: data?.id });
  return data;
}

/**
 * Send a transaction alert email when a payment/transfer is processed.
 *
 * @param {string} email         - recipient email
 * @param {string} firstName     - user's first name
 * @param {object} txInfo        - { type, amount, currency, recipient?, status, txId }
 */
async function sendTransactionAlertEmail(email, firstName, txInfo = {}) {
  const {
    type = "transaction",
    amount = "0",
    currency = "USD",
    recipient = null,
    status = "completed",
    txId = "",
  } = txInfo;

  const typeLabel =
    type === "transfer"
      ? "Transfer"
      : type === "withdrawal"
        ? "Withdrawal"
        : type === "deposit"
          ? "Deposit"
          : "Payment";

  const statusColor =
    status === "completed"
      ? "#16a34a"
      : status === "failed"
        ? "#dc2626"
        : "#d97706";

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `AfraPay: ${typeLabel} of ${currency} ${amount} — ${status}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head><meta charset="UTF-8" /></head>
        <body style="font-family:sans-serif;background:#f4f4f5;margin:0;padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0"
                style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
                <tr>
                  <td style="background:#1a56db;padding:28px 40px;">
                    <h1 style="color:#fff;margin:0;font-size:22px;">AfraPay</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px 40px;">
                    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;">
                      ${typeLabel} alert
                    </h2>
                    <p style="color:#374151;line-height:1.6;margin:0 0 20px;">
                      Hi ${firstName},<br /><br />
                      A ${typeLabel.toLowerCase()} was processed on your account.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                      style="background:#f9fafb;border-radius:8px;padding:16px 20px;font-size:14px;color:#374151;">
                      <tr>
                        <td style="padding:6px 0;font-weight:600;width:120px;">Amount</td>
                        <td style="padding:6px 0;font-weight:700;font-size:18px;">${currency} ${amount}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-weight:600;">Type</td>
                        <td style="padding:6px 0;">${typeLabel}</td>
                      </tr>
                      ${recipient ? `<tr><td style="padding:6px 0;font-weight:600;">Recipient</td><td style="padding:6px 0;">${recipient}</td></tr>` : ""}
                      <tr>
                        <td style="padding:6px 0;font-weight:600;">Status</td>
                        <td style="padding:6px 0;font-weight:600;color:${statusColor};">${status.charAt(0).toUpperCase() + status.slice(1)}</td>
                      </tr>
                      ${txId ? `<tr><td style="padding:6px 0;font-weight:600;">Reference</td><td style="padding:6px 0;font-size:12px;font-family:monospace;">${txId}</td></tr>` : ""}
                    </table>
                    <p style="color:#374151;line-height:1.6;margin:20px 0 0;font-size:13px;">
                      If you did not authorise this transaction, please contact AfraPay support immediately.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;">
                      © ${new Date().getFullYear()} AfraPay. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
      </html>
    `,
  });

  if (error) {
    logger.warn("Resend: failed to send transaction alert email (non-fatal)", {
      to: email,
      error: error.message,
    });
    return null;
  }

  logger.info("Resend: transaction alert email sent", {
    to: email,
    id: data?.id,
  });
  return data;
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendMFAOtpEmail,
  sendLoginAlertEmail,
  sendTransactionAlertEmail,
};
