"""
email.py — Email delivery via Gmail SMTP for password reset and transactional emails.

Uses Python's built-in smtplib + email.mime for zero external dependencies.
Requires SMTP_USER and SMTP_PASSWORD (Gmail App Password) in environment.

Gmail App Password setup:
  1. Enable 2-Step Verification on the Gmail account
  2. Go to myaccount.google.com → Security → App passwords
  3. Create an app password → paste the 16-char code into SMTP_PASSWORD
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import settings
from app.utils.logging import get_logger

logger = get_logger(__name__)


def send_reset_email(to: str, reset_url: str, user_name: str = "") -> bool:
    """
    Send a password reset email via Gmail SMTP.

    Args:
        to:         Recipient email address.
        reset_url:  Full URL to the reset-password page with token.
        user_name:  Optional user display name for personalisation.

    Returns:
        True if email was sent successfully, False otherwise.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP credentials not set — printing reset link to console instead.")
        logger.info("PASSWORD RESET LINK for %s: %s", to, reset_url)
        return True  # Don't fail in development

    greeting = f"Hi {user_name}," if user_name else "Hi,"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#F5F0E8; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F0E8; padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#FFFFFF; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">

              <!-- Header -->
              <tr>
                <td style="background-color:#8B4513; padding:24px 32px; text-align:center;">
                  <h1 style="margin:0; color:#FFFFFF; font-size:20px; font-weight:600; letter-spacing:0.5px;">
                    TraceHealth
                  </h1>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px 32px 24px;">
                  <p style="margin:0 0 16px; color:#1A1A1A; font-size:15px; line-height:1.6;">
                    {greeting}
                  </p>
                  <p style="margin:0 0 24px; color:#555555; font-size:14px; line-height:1.6;">
                    We received a request to reset your password. Click the button below to choose a new password. This link expires in <strong>15 minutes</strong>.
                  </p>

                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding:8px 0 24px;">
                        <a href="{reset_url}"
                           style="display:inline-block; background-color:#8B4513; color:#FFFFFF; text-decoration:none;
                                  padding:12px 32px; border-radius:8px; font-size:14px; font-weight:600;
                                  letter-spacing:0.3px;">
                          Reset Password
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin:0 0 8px; color:#999999; font-size:12px; line-height:1.5;">
                    If you didn't request this, you can safely ignore this email. Your password won't change.
                  </p>

                  <!-- Fallback link -->
                  <p style="margin:16px 0 0; color:#999999; font-size:11px; line-height:1.5; word-break:break-all;">
                    Can't click the button? Copy this link:<br>
                    <a href="{reset_url}" style="color:#8B4513;">{reset_url}</a>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:16px 32px 24px; border-top:1px solid #E0D8CC;">
                  <p style="margin:0; color:#999999; font-size:11px; text-align:center; line-height:1.5;">
                    TraceHealth &mdash; AI-Powered Health Screening<br>
                    This is an automated message. Please do not reply.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Reset your TraceHealth password"
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"] = to

        # Plain-text fallback
        plain_text = (
            f"{greeting}\n\n"
            f"We received a request to reset your TraceHealth password.\n"
            f"Click the link below to choose a new password (expires in 15 minutes):\n\n"
            f"{reset_url}\n\n"
            f"If you didn't request this, you can safely ignore this email.\n\n"
            f"— TraceHealth Team"
        )
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to, msg.as_string())

        logger.info("Reset email sent to %s via SMTP", to)
        return True
    except Exception as e:
        logger.error("Failed to send reset email to %s: %s", to, str(e))
        return False
