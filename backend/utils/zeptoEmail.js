import fetch from 'node-fetch';

const PLAY_STORE_URL = process.env.PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.academy.tree_campus';
const COURSES_URL = process.env.COURSES_URL || 'https://courses.treecampus.in';

/**
 * Send email via Zoho ZeptoMail API
 * @param {Object} options
 * @param {string} options.toEmail - Recipient email address
 * @param {string} options.toName - Recipient name
 * @param {string} options.subject - Email subject
 * @param {string} options.htmlContent - HTML body content
 */
export const sendZeptoMail = async ({ toEmail, toName, subject, htmlContent }) => {
  const url = (process.env.ZEPTO_URL || 'https://api.zeptomail.com/v1.1/email').trim();
  const token = (process.env.ZEPTO_TOKEN || '').trim();
  const senderEmail = (process.env.ZEPTO_SENDER_EMAIL || 'contact@treecampus.in').trim();
  const senderName = (process.env.ZEPTO_SENDER_NAME || 'Treecampus').trim();

  if (!token) {
    throw new Error('ZeptoMail token (ZEPTO_TOKEN) is missing in .env');
  }

  // Ensure authorization header has the proper prefix
  let authHeader = token;
  if (!token.startsWith('Zoho-encz') && !token.startsWith('SendMail-Token')) {
    authHeader = `Zoho-enczapikey ${token}`;
  }

  const replyToEmail = (process.env.ZEPTO_REPLY_TO || 'contact@treecampus.in').trim();

  const payload = {
    from: {
      address: senderEmail,
      name: senderName
    },
    to: [
      {
        email_address: {
          address: toEmail,
          name: toName || 'Learner'
        }
      }
    ],
    reply_to: [
      {
        address: replyToEmail,
        name: `${senderName} Support`
      }
    ],
    subject: subject,
    htmlbody: htmlContent
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let responseData = {};
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      console.error(`❌ [ZeptoMail] HTTP ${response.status}:`, responseText);
      throw new Error(`ZeptoMail failed with status ${response.status}: ${responseData.message || responseText}`);
    }

    console.log(`✅ [ZeptoMail] Email sent successfully to ${toEmail}`);
    return responseData;
  } catch (error) {
    console.error(`❌ [ZeptoMail] Error sending to ${toEmail}:`, error.message);
    throw error;
  }
};

/**
 * Generate Welcome Email HTML
 * @param {string} toName - User's name
 * @returns {string} - Rendered HTML email
 */
export const generateWelcomeEmailHtml = (toName) => {
  const name = toName || 'Learner';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Treecampus</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');

    * {
      font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    }
    body, table, td, tr, p, a, div, span, h1, h2, h3, h4, strong, b {
      font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: #f3f6f4;
      color: #17202dff;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f3f6f4;
      padding: 30px 10px;
    }
    .main {
      background-color: #ffffff;
      max-width: 600px;
      margin: 0 auto;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    }
    .header {
      background: linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0 0 6px 0;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.4px;
      line-height: 1.25;
    }
    .header p {
      margin: 0;
      font-size: 14px;
      color: #D8F3DC;
      font-weight: 500;
      letter-spacing: 0.1px;
    }
    .content {
      padding: 28px 24px;
    }
    .greeting {
      font-size: 21px;
      font-weight: 800;
      color: #1B4332;
      margin-bottom: 12px;
      letter-spacing: -0.3px;
    }
    .intro-text {
      font-size: 15.5px;
      line-height: 1.65;
      color: #334155;
      margin-bottom: 20px;
      letter-spacing: -0.1px;
    }
    .top-cta-table {
      width: 100%;
      margin: 22px 0 28px 0;
    }
    .cta-btn-primary {
      display: inline-block;
      background: linear-gradient(135deg, #FF6B35 0%, #E85D04 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 13px 22px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 4px 14px rgba(255, 107, 53, 0.3);
      letter-spacing: 0.2px;
      white-space: nowrap;
    }
    .cta-btn-secondary {
      display: inline-block;
      background: #F0F4F2;
      color: #1B4332 !important;
      text-decoration: none;
      padding: 12px 20px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 700;
      border: 1px solid #C8D6CF;
      letter-spacing: 0.2px;
      white-space: nowrap;
    }
    .features-card {
      background-color: #F8FAF9;
      border: 1px solid #E5EBE7;
      border-radius: 12px;
      padding: 20px;
      margin-top: 10px;
      margin-bottom: 22px;
    }
    .feature-item {
      display: table;
      width: 100%;
      margin-bottom: 14px;
    }
    .feature-item:last-child {
      margin-bottom: 0;
    }
    .feature-icon {
      display: table-cell;
      width: 36px;
      vertical-align: top;
      font-size: 22px;
    }
    .feature-text {
      display: table-cell;
      vertical-align: middle;
      font-size: 14px;
      line-height: 1.5;
      color: #334155;
    }
    .feature-text strong {
      color: #1B4332;
      font-weight: 700;
    }
    .footer {
      background-color: #1B4332;
      padding: 22px 24px;
      text-align: center;
      color: #D8F3DC;
      font-size: 12px;
      line-height: 1.6;
    }
    .footer-brand {
      font-weight: 700;
      font-size: 14px;
      color: #ffffff;
      margin-bottom: 6px;
    }
    .footer a {
      color: #52B788;
      text-decoration: underline;
    }
  </style>
</head>
<body style="font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div class="wrapper" style="font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div class="main" style="font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <!-- HEADER -->
      <div class="header">
        <div style="margin-bottom: 14px;">
          <img src="https://res.cloudinary.com/dbbll23jz/image/upload/v1765170258/tree_logo_ek4uw3.png" alt="Treecampus" width="70" height="70" style="display: inline-block; width: 70px; height: 70px; object-fit: contain; border-radius: 14px; background: #ffffff; padding: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.12);" />
        </div>
        <h1>Welcome to Treecampus 🎓</h1>
        <p>No-Cost English Learning Platform</p>
      </div>

      <!-- CONTENT -->
      <div class="content" style="font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div class="greeting">Hi ${name},</div>
        <p class="intro-text">
          Congratulations on taking your first step towards confident, fluent English! Your Treecampus account is ready. 
          Everything you need to master English speaking, grammar, and vocabulary is available <strong>at no cost</strong> on our website and mobile app.
        </p>

        <!-- PROMINENT TOP CTAs (Side by Side) -->
        <div style="text-align: center; margin: 20px 0 24px 0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td align="center" style="padding: 6px 8px; vertical-align: middle;">
                <a href="${PLAY_STORE_URL}" target="_blank" class="cta-btn-primary">
                  📲 Open Treecampus App
                </a>
              </td>
              <td align="center" style="padding: 6px 8px; vertical-align: middle;">
                <a href="${COURSES_URL}" target="_blank" class="cta-btn-secondary">
                  🌐 Visit Website
                </a>
              </td>
            </tr>
          </table>
        </div>

        <!-- FEATURES LIST -->
        <div class="features-card">
          <div style="font-weight: 700; color: #1B4332; font-size: 15px; margin-bottom: 14px; border-bottom: 1px solid #E5EBE7; padding-bottom: 8px;">
            🌟 What You Get With Treecampus:
          </div>

          <div class="feature-item">
            <div class="feature-icon">📚</div>
            <div class="feature-text">
              <strong>30-Day Spoken English Course:</strong> Step-by-step video lessons and daily speaking practice at no cost.
            </div>
          </div>

          <div class="feature-item">
            <div class="feature-icon">🤖</div>
            <div class="feature-text">
              <strong>Spokee (3D AI English Teacher):</strong> Real-time conversational speaking practice available 24/7.
            </div>
          </div>

          <div class="feature-item">
            <div class="feature-icon">🎥</div>
            <div class="feature-text">
              <strong>Daily Live Classes at No Cost:</strong> Join interactive live Zoom sessions with experienced teachers.
            </div>
          </div>

          <div class="feature-item">
            <div class="feature-icon">🎮</div>
            <div class="feature-text">
              <strong>Gamified Learning:</strong> Play vocabulary booster games and lock-and-key quizzes to learn while having fun.
            </div>
          </div>

          <div class="feature-item">
            <div class="feature-icon">🏆</div>
            <div class="feature-text">
              <strong>Verifiable Certificate at No Cost:</strong> Complete the course to earn your recognized certificate.
            </div>
          </div>
        </div>

        <div style="text-align: center; font-size: 13px; color: #556960; margin-top: 16px;">
          Happy Learning with Treecampus! 🚀
        </div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div class="footer-brand">Treecampus</div>
        <div>Democratizing Quality Education at No Cost for Every Indian Learner</div>
        <div style="margin-top: 8px; font-size: 11px; opacity: 0.8;">
          You received this email because you are a registered user of Treecampus.
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Send Welcome Email to a newly registered user
 * @param {string} email - User email
 * @param {string} name - User name
 */
export const sendWelcomeEmail = async (email, name) => {
  if (!email) {
    console.warn('⚠️ [ZeptoMail] sendWelcomeEmail called without email address');
    return null;
  }

  const subject = `Welcome to Treecampus, ${name || 'Friend'}! Start Learning on the App`;
  const htmlContent = generateWelcomeEmailHtml(name);

  return sendZeptoMail({
    toEmail: email,
    toName: name,
    subject: subject,
    htmlContent: htmlContent
  });
};

/**
 * Generate Course Enrollment Nudge HTML Email (All English, No-Cost messaging)
 * @param {string} toName - User's name
 * @returns {string} - Rendered HTML email
 */
export const generateCourseEnrollmentNudgeEmailHtml = (toName) => {
  const name = toName || 'Learner';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Start Your First Course on Treecampus</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');

    * {
      font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    }
    body, table, td, tr, p, a, div, span, h1, h2, h3, h4, strong, b {
      font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: #f3f6f4;
      color: #334155;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f3f6f4;
      padding: 30px 10px;
    }
    .main {
      background-color: #ffffff;
      max-width: 600px;
      margin: 0 auto;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    }
    .header {
      background: linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0 0 6px 0;
      font-size: 25px;
      font-weight: 800;
      letter-spacing: -0.4px;
      line-height: 1.25;
    }
    .header p {
      margin: 0;
      font-size: 14px;
      color: #D8F3DC;
      font-weight: 500;
      letter-spacing: 0.1px;
    }
    .content {
      padding: 28px 24px;
    }
    .greeting {
      font-size: 21px;
      font-weight: 800;
      color: #1B4332;
      margin-bottom: 12px;
      letter-spacing: -0.3px;
    }
    .intro-text {
      font-size: 15.5px;
      line-height: 1.65;
      color: #334155;
      margin-bottom: 20px;
      letter-spacing: -0.1px;
    }
    .cta-btn-primary {
      display: inline-block;
      background: linear-gradient(135deg, #FF6B35 0%, #E85D04 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 13px 22px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 4px 14px rgba(255, 107, 53, 0.3);
      letter-spacing: 0.2px;
      white-space: nowrap;
    }
    .cta-btn-secondary {
      display: inline-block;
      background: #F0F4F2;
      color: #1B4332 !important;
      text-decoration: none;
      padding: 12px 20px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 700;
      border: 1px solid #C8D6CF;
      letter-spacing: 0.2px;
      white-space: nowrap;
    }
    .course-card {
      background: linear-gradient(180deg, #FAFDFB 0%, #F3F8F5 100%);
      border: 1.5px solid #D8E6DE;
      border-radius: 14px;
      padding: 22px;
      margin-bottom: 22px;
    }
    .course-badge {
      display: inline-block;
      background-color: #E8F5E9;
      color: #2D6A4F;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 4px 10px;
      border-radius: 20px;
      margin-bottom: 10px;
    }
    .course-title {
      font-size: 18px;
      font-weight: 800;
      color: #1B4332;
      margin-bottom: 8px;
      letter-spacing: -0.2px;
    }
    .course-desc {
      font-size: 14px;
      color: #475569;
      line-height: 1.55;
      margin-bottom: 16px;
    }
    .highlight-item {
      display: table;
      width: 100%;
      margin-bottom: 10px;
    }
    .highlight-item:last-child {
      margin-bottom: 0;
    }
    .highlight-icon {
      display: table-cell;
      width: 28px;
      vertical-align: top;
      font-size: 18px;
    }
    .highlight-text {
      display: table-cell;
      vertical-align: middle;
      font-size: 14px;
      color: #334155;
      line-height: 1.5;
    }
    .highlight-text strong {
      color: #1B4332;
      font-weight: 700;
    }
    .stats-box {
      background-color: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 16px;
      margin: 20px 0;
      text-align: center;
    }
    .stats-grid {
      width: 100%;
      text-align: center;
    }
    .stat-number {
      font-size: 20px;
      font-weight: 800;
      color: #2D6A4F;
      letter-spacing: -0.3px;
    }
    .stat-label {
      font-size: 11px;
      color: #64748B;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 2px;
    }
    .footer {
      background-color: #1B4332;
      padding: 22px 24px;
      text-align: center;
      color: #D8F3DC;
      font-size: 12px;
      line-height: 1.6;
    }
    .footer-brand {
      font-weight: 700;
      font-size: 14px;
      color: #ffffff;
      margin-bottom: 6px;
    }
  </style>
</head>
<body style="font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div class="wrapper" style="font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div class="main" style="font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <!-- HEADER -->
      <div class="header">
        <div style="margin-bottom: 14px;">
          <img src="https://res.cloudinary.com/dbbll23jz/image/upload/v1765170258/tree_logo_ek4uw3.png" alt="Treecampus" width="70" height="70" style="display: inline-block; width: 70px; height: 70px; object-fit: contain; border-radius: 14px; background: #ffffff; padding: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.12);" />
        </div>
        <h1>Take the Next Step in English 🚀</h1>
        <p>Your Journey to Fluency Begins with Course 1</p>
      </div>

      <!-- CONTENT -->
      <div class="content" style="font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div class="greeting">Hi ${name},</div>
        <p class="intro-text">
          We noticed you recently joined Treecampus, but you haven't enrolled in your first course yet! 
          Thousands of students across India are practicing speaking every single day. 
          Every course on Treecampus is 100% <strong>at no cost</strong> — no subscription required.
        </p>

        <!-- SIDE-BY-SIDE CTAs -->
        <div style="text-align: center; margin: 20px 0 24px 0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td align="center" style="padding: 6px 8px; vertical-align: middle;">
                <a href="${PLAY_STORE_URL}" target="_blank" class="cta-btn-primary">
                  📲 Enroll on App
                </a>
              </td>
              <td align="center" style="padding: 6px 8px; vertical-align: middle;">
                <a href="${COURSES_URL}" target="_blank" class="cta-btn-secondary">
                  🌐 Enroll on Website
                </a>
              </td>
            </tr>
          </table>
        </div>

        <!-- FEATURED COURSE SPOTLIGHT -->
        <div class="course-card">
          <div class="course-badge">Recommended for You</div>
          <div class="course-title">30-Day Spoken English Mastery Program</div>
          <div class="course-desc">
            Designed specifically for beginner to intermediate learners. Speak English confidently in everyday situations, college seminars, and job interviews.
          </div>

          <div class="highlight-item">
            <div class="highlight-icon">🎯</div>
            <div class="highlight-text">
              <strong>Step-by-Step Lessons:</strong> Structured video lessons broken down into bite-sized 15-minute daily modules.
            </div>
          </div>

          <div class="highlight-item">
            <div class="highlight-icon">🤖</div>
            <div class="highlight-text">
              <strong>24/7 Practice with Spokee:</strong> Your 3D AI English Teacher to practice conversational speaking anytime without fear.
            </div>
          </div>

          <div class="highlight-item">
            <div class="highlight-icon">🎥</div>
            <div class="highlight-text">
              <strong>Daily Live Classes at No Cost:</strong> Join interactive live Zoom sessions with experienced teachers.
            </div>
          </div>

          <div class="highlight-item">
            <div class="highlight-icon">🏆</div>
            <div class="highlight-text">
              <strong>Verifiable Certificate at No Cost:</strong> Complete the course to earn your recognized certificate.
            </div>
          </div>
        </div>

        <!-- STATS SOCIAL PROOF -->
        <div class="stats-box">
          <table class="stats-grid" role="presentation" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" align="center">
                <div class="stat-number">100K+</div>
                <div class="stat-label">Active Learners</div>
              </td>
              <td width="33%" align="center" style="border-left: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0;">
                <div class="stat-number">4.8 ★</div>
                <div class="stat-label">Play Store Rating</div>
              </td>
              <td width="33%" align="center">
                <div class="stat-number">100%</div>
                <div class="stat-label">At No Cost</div>
              </td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #40514e; line-height: 1.5; text-align: center; margin-top: 20px;">
          It takes just <strong>10 seconds</strong> to click below and begin your first lesson. Start today!
        </p>

        <!-- SECONDARY CTAs AT BOTTOM -->
        <div style="text-align: center; margin: 20px 0 10px 0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td align="center" style="padding: 6px 8px; vertical-align: middle;">
                <a href="${PLAY_STORE_URL}" target="_blank" class="cta-btn-primary">
                  📲 Open App & Enroll
                </a>
              </td>
              <td align="center" style="padding: 6px 8px; vertical-align: middle;">
                <a href="${COURSES_URL}" target="_blank" class="cta-btn-secondary">
                  🌐 Enroll on Website
                </a>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div class="footer-brand">Treecampus</div>
        <div>Democratizing Quality Education at No Cost for Every Indian Learner</div>
        <div style="margin-top: 8px; font-size: 11px; opacity: 0.8;">
          You received this email because you are a registered user of Treecampus.
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Send Course Enrollment Nudge Email
 * @param {string} email - User email
 * @param {string} name - User name
 */
export const sendCourseEnrollmentNudgeEmail = async (email, name) => {
  if (!email) {
    console.warn('⚠️ [ZeptoMail] sendCourseEnrollmentNudgeEmail called without email address');
    return null;
  }

  const subject = `${name ? name + ', ready' : 'Ready'} to start your English course at no cost? 🎓`;
  const htmlContent = generateCourseEnrollmentNudgeEmailHtml(name);

  return sendZeptoMail({
    toEmail: email,
    toName: name,
    subject: subject,
    htmlContent: htmlContent
  });
};

/**
 * Generate 3 Daily Live Classes Announcement HTML Email (English, No-Cost)
 * @param {string} toName - User's name
 * @returns {string} - Rendered HTML email
 */
export const generateDailyLiveClassesEmailHtml = (toName) => {
  const name = toName || 'Learner';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Free Live Zoom Classes - Treecampus</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');

    * {
      font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    }
    body, table, td, tr, p, a, div, span, h1, h2, h3, h4, strong, b {
      font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: #f3f6f4;
      color: #334155;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f3f6f4;
      padding: 30px 10px;
    }
    .main {
      background-color: #ffffff;
      max-width: 600px;
      margin: 0 auto;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
    }
    .header {
      background: linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0 0 6px 0;
      font-size: 25px;
      font-weight: 800;
      letter-spacing: -0.4px;
      line-height: 1.25;
    }
    .header p {
      margin: 0;
      font-size: 14px;
      color: #D8F3DC;
      font-weight: 500;
      letter-spacing: 0.1px;
    }
    .content {
      padding: 28px 24px;
    }
    .greeting {
      font-size: 21px;
      font-weight: 800;
      color: #1B4332;
      margin-bottom: 12px;
      letter-spacing: -0.3px;
    }
    .intro-text {
      font-size: 15.5px;
      line-height: 1.65;
      color: #334155;
      margin-bottom: 20px;
      letter-spacing: -0.1px;
    }
    .cta-btn-primary {
      display: inline-block;
      background: linear-gradient(135deg, #FF6B35 0%, #E85D04 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 13px 22px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 4px 14px rgba(255, 107, 53, 0.3);
      letter-spacing: 0.2px;
      white-space: nowrap;
    }
    .cta-btn-secondary {
      display: inline-block;
      background: #F0F4F2;
      color: #1B4332 !important;
      text-decoration: none;
      padding: 12px 20px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 700;
      border: 1px solid #C8D6CF;
      letter-spacing: 0.2px;
      white-space: nowrap;
    }
    .class-card {
      background: linear-gradient(180deg, #FAFDFB 0%, #F3F8F5 100%);
      border: 1.5px solid #D8E6DE;
      border-radius: 14px;
      padding: 18px 20px;
      margin-bottom: 16px;
    }
    .live-pill {
      display: inline-block;
      background-color: #FEE2E2;
      color: #DC2626;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 4px 10px;
      border-radius: 20px;
      margin-bottom: 8px;
    }
    .class-title {
      font-size: 17px;
      font-weight: 800;
      color: #1B4332;
      margin-bottom: 6px;
      letter-spacing: -0.2px;
    }
    .class-meta {
      font-size: 13.5px;
      color: #2D6A4F;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .class-desc {
      font-size: 13.5px;
      color: #475569;
      line-height: 1.5;
    }
    .steps-card {
      background-color: #F8FAF9;
      border: 1px solid #E5EBE7;
      border-radius: 12px;
      padding: 18px;
      margin: 22px 0;
    }
    .step-item {
      display: table;
      width: 100%;
      margin-bottom: 10px;
    }
    .step-item:last-child {
      margin-bottom: 0;
    }
    .step-num {
      display: table-cell;
      width: 26px;
      height: 26px;
      background-color: #1B4332;
      color: #ffffff;
      border-radius: 50%;
      text-align: center;
      vertical-align: middle;
      font-size: 12px;
      font-weight: 800;
    }
    .step-text {
      display: table-cell;
      padding-left: 12px;
      vertical-align: middle;
      font-size: 14px;
      color: #334155;
      line-height: 1.5;
    }
    .footer {
      background-color: #1B4332;
      padding: 22px 24px;
      text-align: center;
      color: #D8F3DC;
      font-size: 12px;
      line-height: 1.6;
    }
    .footer-brand {
      font-weight: 700;
      font-size: 14px;
      color: #ffffff;
      margin-bottom: 6px;
    }
  </style>
</head>
<body style="font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div class="wrapper" style="font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div class="main" style="font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <!-- HEADER -->
      <div class="header">
        <div style="margin-bottom: 14px;">
          <img src="https://res.cloudinary.com/dbbll23jz/image/upload/v1765170258/tree_logo_ek4uw3.png" alt="Tree Campus" width="70" height="70" style="display: inline-block; width: 70px; height: 70px; object-fit: contain; border-radius: 14px; background: #ffffff; padding: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.12);" />
        </div>
        <h1>Daily Free Live Zoom Classes 🎥</h1>
        <p>Practice Spoken English Live with Expert Mentors</p>
      </div>

      <!-- CONTENT -->
      <div class="content" style="font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div class="greeting">Hi ${name},</div>
        <p class="intro-text">
          Did you know that Treecampus conducts <strong>3 interactive live Zoom classes every single day</strong>? 
          Whether you prefer learning from Hindi or Bengali, our expert language mentors are here to help you build fluent, confident speaking skills — <strong>100% at no cost</strong>!
        </p>

        <!-- TOP SIDE-BY-SIDE CTAs -->
        <div style="text-align: center; margin: 18px 0 24px 0;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            <tr>
              <td align="center" style="padding: 6px 8px; vertical-align: middle;">
                <a href="${PLAY_STORE_URL}" target="_blank" class="cta-btn-primary">
                  📲 Open Treecampus App
                </a>
              </td>
              <td align="center" style="padding: 6px 8px; vertical-align: middle;">
                <a href="${COURSES_URL}" target="_blank" class="cta-btn-secondary">
                  🌐 View on Website
                </a>
              </td>
            </tr>
          </table>
        </div>

        <!-- 3 LIVE CLASSES SCHEDULE -->
        <div style="margin-top: 10px; margin-bottom: 18px;">
          <div style="font-size: 16px; font-weight: 800; color: #1B4332; margin-bottom: 14px;">
            🌟 Pick Your Preferred Free Daily Live Class:
          </div>

          <!-- Class 1: Hindi to English 7:00 PM Free Zoom Class -->
          <div class="class-card">
            <span class="live-pill">🔴 Free Live Zoom Class</span>
            <div class="class-title">Hindi to English 7:00 PM Free Zoom Class</div>
            <div class="class-meta">
              ⏰ <strong>Daily at 7:00 PM IST</strong> &nbsp;|&nbsp; 🗣️ <strong>Medium:</strong> Hindi to English
            </div>
            <div class="class-desc">
              Ideal for students and working professionals. Live interactive spoken English practice, interview prep, and fluent workplace communication.
            </div>
          </div>

          <!-- Class 2: Bengali to English 3:00 PM Free Zoom Class -->
          <div class="class-card">
            <span class="live-pill">🔴 Free Live Zoom Class</span>
            <div class="class-title">Bengali to English 3:00 PM Free Zoom Class</div>
            <div class="class-meta">
              ⏰ <strong>Daily at 3:00 PM IST</strong> &nbsp;|&nbsp; 🗣️ <strong>Medium:</strong> Bengali to English
            </div>
            <div class="class-desc">
              Specially designed for Bengali speakers. Learn to speak English fluently, overcome hesitation, and master practical vocabulary directly in Bengali.
            </div>
          </div>

          <!-- Class 3: Hindi to English 5:00 PM Free Zoom Class -->
          <div class="class-card">
            <span class="live-pill">🔴 Free Live Zoom Class</span>
            <div class="class-title">Hindi to English 5:00 PM Free Zoom Class</div>
            <div class="class-meta">
              ⏰ <strong>Daily at 5:00 PM IST</strong> &nbsp;|&nbsp; 🗣️ <strong>Medium:</strong> Hindi to English
            </div>
            <div class="class-desc">
              Daily conversation scenarios, essential grammar fundamentals, and confidence-building speaking practice for beginners and learners.
            </div>
          </div>
        </div>

        <!-- HOW TO JOIN -->
        <div class="steps-card">
          <div style="font-weight: 700; color: #1B4332; font-size: 14px; margin-bottom: 12px;">
            💡 How to Join in 3 Easy Steps:
          </div>
          <div class="step-item">
            <div class="step-num">1</div>
            <div class="step-text">Open the <strong>Treecampus App</strong> or visit <a href="${COURSES_URL}" target="_blank" style="color: #2D6A4F; font-weight: 700;">courses.treecampus.in</a></div>
          </div>
          <div class="step-item">
            <div class="step-num">2</div>
            <div class="step-text">Navigate to the <strong>"Live Classes"</strong> section.</div>
          </div>
          <div class="step-item">
            <div class="step-num">3</div>
            <div class="step-text">Click <strong>"Join Live"</strong> at your chosen class time (3:00 PM, 5:00 PM, or 7:00 PM)!</div>
          </div>
        </div>

        <!-- BOTTOM DIRECT CTA -->
        <div style="text-align: center; margin: 20px 0 10px 0;">
          <a href="${PLAY_STORE_URL}" target="_blank" class="cta-btn-primary" style="padding: 14px 30px; font-size: 15px;">
            📲 Open App & Join Live Classes
          </a>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div class="footer-brand">Treecampus</div>
        <div>Democratizing Quality Education at No Cost for Every Indian Learner</div>
        <div style="margin-top: 8px; font-size: 11px; opacity: 0.8;">
          You received this email because you are a registered learner on Treecampus.
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Send 3 Daily Live Classes Announcement Email
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 */
export const sendDailyLiveClassesEmail = async (email, name) => {
  if (!email) {
    console.warn('⚠️ [ZeptoMail] sendDailyLiveClassesEmail called without email address');
    return null;
  }

  const subject = `Join Our 3 Daily Free Live Zoom Classes on Treecampus 🎥`;
  const htmlContent = generateDailyLiveClassesEmailHtml(name);

  return sendZeptoMail({
    toEmail: email,
    toName: name,
    subject: subject,
    htmlContent: htmlContent
  });
};



