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

/**
 * Notify a user that their merchant application has been received and is under review.
 *
 * @param {string} email        - recipient email
 * @param {string} firstName    - user's first name (or fallback greeting)
 * @param {string} businessName - the business name they applied with
 */
async function sendMerchantApplicationReceivedEmail(
  email,
  firstName,
  businessName,
) {
  const dashboardUrl = `${APP_URL}/merchant`;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: "We've received your AfraPay merchant application",
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
                      Application received, ${firstName}!
                    </h2>
                    <p style="color:#374151;line-height:1.6;margin:0 0 20px;">
                      Thank you for submitting your merchant application for
                      <strong>${businessName}</strong>. Our team will review your
                      application and get back to you shortly.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                      style="background:#eff6ff;border-left:4px solid #1a56db;border-radius:4px;
                             padding:16px 20px;font-size:14px;color:#374151;margin-bottom:24px;">
                      <tr>
                        <td>
                          <strong style="display:block;margin-bottom:8px;color:#1e3a5f;">What happens next?</strong>
                          <ol style="margin:0;padding-left:20px;line-height:2;">
                            <li>Our team reviews your business details (usually within 1–2 business days)</li>
                            <li>You will receive an email once a decision has been made</li>
                            <li>If approved, you'll receive your AfraPay Till Number immediately</li>
                          </ol>
                        </td>
                      </tr>
                    </table>
                    <a href="${dashboardUrl}"
                      style="display:inline-block;background:#1a56db;color:#fff;
                             text-decoration:none;padding:14px 32px;border-radius:6px;
                             font-weight:600;font-size:15px;">
                      Check Application Status
                    </a>
                    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
                      If you did not submit this application, please contact
                      <a href="mailto:support@afrapayafrica.com" style="color:#1a56db;">support@afrapayafrica.com</a>.
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
    logger.warn(
      "Resend: failed to send merchant application received email (non-fatal)",
      {
        to: email,
        error: error.message,
      },
    );
    return null;
  }

  logger.info("Resend: merchant application received email sent", {
    to: email,
    id: data?.id,
  });
  return data;
}

/**
 * Notify a merchant owner that their application has been approved.
 *
 * @param {string} email        - recipient email
 * @param {string} firstName    - user's first name
 * @param {string} businessName - approved business name
 * @param {string} tillNumber   - assigned AfraPay Till Number
 */
async function sendMerchantApprovedEmail(
  email,
  firstName,
  businessName,
  tillNumber,
) {
  const merchantHubUrl = `${APP_URL}/merchant`;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `🎉 Congratulations! Your AfraPay merchant account is approved`,
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
                    <div style="text-align:center;margin-bottom:24px;">
                      <div style="display:inline-block;background:#dcfce7;border-radius:50%;
                                  width:64px;height:64px;line-height:64px;font-size:32px;text-align:center;">
                        ✓
                      </div>
                    </div>
                    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;text-align:center;">
                      You're approved, ${firstName}!
                    </h2>
                    <p style="color:#6b7280;text-align:center;margin:0 0 28px;font-size:15px;">
                      ${businessName} is now live on AfraPay
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0"
                      style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;
                             padding:20px 24px;margin-bottom:28px;">
                      <tr>
                        <td style="font-size:13px;color:#166534;font-weight:600;
                                   text-transform:uppercase;letter-spacing:.5px;">
                          Your AfraPay Till Number
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:32px;font-weight:700;color:#15803d;
                                   letter-spacing:4px;padding-top:8px;font-family:monospace;">
                          ${tillNumber}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:12px;color:#4ade80;padding-top:4px;">
                          Share this number with your customers to accept payments
                        </td>
                      </tr>
                    </table>
                    <p style="color:#374151;line-height:1.6;margin:0 0 24px;">
                      You can now start accepting payments through AfraPay. Visit your
                      Merchant Hub to view your dashboard, track sales, and manage payouts.
                    </p>
                    <a href="${merchantHubUrl}"
                      style="display:inline-block;background:#16a34a;color:#fff;
                             text-decoration:none;padding:14px 32px;border-radius:6px;
                             font-weight:600;font-size:15px;">
                      Open Merchant Hub
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;">
                      © ${new Date().getFullYear()} AfraPay. All rights reserved.
                      Questions? <a href="mailto:support@afrapayafrica.com" style="color:#1a56db;">Contact support</a>
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
    logger.warn("Resend: failed to send merchant approved email (non-fatal)", {
      to: email,
      error: error.message,
    });
    return null;
  }

  logger.info("Resend: merchant approved email sent", {
    to: email,
    id: data?.id,
  });
  return data;
}

/**
 * Notify a merchant owner that their application has been rejected.
 *
 * @param {string} email        - recipient email
 * @param {string} firstName    - user's first name
 * @param {string} businessName - business name that was rejected
 * @param {string} reason       - rejection reason / missing documents note
 */
async function sendMerchantRejectedEmail(
  email,
  firstName,
  businessName,
  reason,
) {
  const supportUrl = `${APP_URL}/support`;
  const reapplyUrl = `${APP_URL}/merchant`;
  const hasReason = reason && reason.trim().length > 0;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Update on your AfraPay merchant application",
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
                      Hi ${firstName}, an update on your application
                    </h2>
                    <p style="color:#374151;line-height:1.6;margin:0 0 20px;">
                      After reviewing your merchant application for
                      <strong>${businessName}</strong>, we were unable to approve it at this time.
                    </p>
                    ${
                      hasReason
                        ? `
                    <table width="100%" cellpadding="0" cellspacing="0"
                      style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;
                             padding:16px 20px;font-size:14px;color:#7f1d1d;margin-bottom:24px;">
                      <tr>
                        <td>
                          <strong style="display:block;margin-bottom:6px;">Reason for rejection:</strong>
                          <span style="line-height:1.6;">${reason.trim()}</span>
                        </td>
                      </tr>
                    </table>
                    `
                        : `
                    <table width="100%" cellpadding="0" cellspacing="0"
                      style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;
                             padding:16px 20px;font-size:14px;color:#7f1d1d;margin-bottom:24px;">
                      <tr>
                        <td>
                          Please contact our support team for more details on the decision and
                          guidance on resubmitting your application.
                        </td>
                      </tr>
                    </table>
                    `
                    }
                    <p style="color:#374151;line-height:1.6;margin:0 0 24px;">
                      You are welcome to address the points above and resubmit your application.
                      Our team is here to help you get set up successfully.
                    </p>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:12px;">
                          <a href="${reapplyUrl}"
                            style="display:inline-block;background:#1a56db;color:#fff;
                                   text-decoration:none;padding:12px 24px;border-radius:6px;
                                   font-weight:600;font-size:14px;">
                            Resubmit Application
                          </a>
                        </td>
                        <td>
                          <a href="${supportUrl}"
                            style="display:inline-block;background:#f3f4f6;color:#374151;
                                   text-decoration:none;padding:12px 24px;border-radius:6px;
                                   font-weight:600;font-size:14px;border:1px solid #e5e7eb;">
                            Contact Support
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                    <p style="margin:0;font-size:12px;color:#9ca3af;">
                      © ${new Date().getFullYear()} AfraPay. All rights reserved.
                      <a href="mailto:support@afrapayafrica.com" style="color:#1a56db;">support@afrapayafrica.com</a>
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
    logger.warn("Resend: failed to send merchant rejected email (non-fatal)", {
      to: email,
      error: error.message,
    });
    return null;
  }

  logger.info("Resend: merchant rejected email sent", {
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
  sendMerchantApplicationReceivedEmail,
  sendMerchantApprovedEmail,
  sendMerchantRejectedEmail,
};
