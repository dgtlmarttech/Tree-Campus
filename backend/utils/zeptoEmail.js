import fetch from 'node-fetch';

const PLAY_STORE_URL = process.env.PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.academy.tree_campus';
const COURSES_URL = process.env.COURSES_URL || 'https://courses.treecampus.in';
const LIVE_CLASSES_URL = process.env.LIVE_CLASSES_URL || `${COURSES_URL}/live-classes`;
const APP_REDIRECT_URL = process.env.APP_REDIRECT_URL || `${COURSES_URL}/open-app`;

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
      color: #1E293B;
      margin-bottom: 20px;
      letter-spacing: -0.1px;
    }
    .top-cta-table {
      width: 100%;
      margin: 22px 0 28px 0;
    }
    .cta-btn-primary {
      display: block;
      max-width: 280px;
      width: 100%;
      background: linear-gradient(135deg, #FF6B35 0%, #E85D04 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 13px 20px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 4px 14px rgba(255, 107, 53, 0.3);
      letter-spacing: 0.2px;
      text-align: center;
      box-sizing: border-box;
      margin: 0 auto;
    }
    .cta-btn-secondary {
      display: block;
      max-width: 280px;
      width: 100%;
      background: #F0F4F2;
      color: #1B4332 !important;
      text-decoration: none;
      padding: 11px 20px;
      border-radius: 50px;
      font-size: 13.5px;
      font-weight: 700;
      border: 1px solid #C8D6CF;
      letter-spacing: 0.2px;
      text-align: center;
      box-sizing: border-box;
      margin: 0 auto;
    }
    @media only screen and (max-width: 480px) {
      .wrapper {
        padding: 14px 6px !important;
      }
      .content {
        padding: 20px 14px !important;
      }
      .cta-btn-primary, .cta-btn-secondary {
        max-width: 100% !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
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
      color: #1E293B;
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

        <!-- PROMINENT TOP CTAs (Stacked & Centered, 100% Mobile Safe) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 18px auto 22px auto;">
          <tr>
            <td align="center" style="padding-bottom: 10px;">
              <a href="${APP_REDIRECT_URL}" target="_blank" class="cta-btn-primary" style="display: block; max-width: 280px; width: 100%; background: linear-gradient(135deg, #FF6B35 0%, #E85D04 100%); color: #ffffff !important; text-decoration: none; padding: 13px 20px; border-radius: 50px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 14px rgba(255, 107, 53, 0.3); text-align: center; box-sizing: border-box; margin: 0 auto; letter-spacing: 0.2px;">
                📲 Open Treecampus App
              </a>
            </td>
          </tr>
          <tr>
            <td align="center">
              <a href="${COURSES_URL}" target="_blank" class="cta-btn-secondary" style="display: block; max-width: 280px; width: 100%; background: #F0F4F2; color: #1B4332 !important; text-decoration: none; padding: 11px 20px; border-radius: 50px; font-size: 13.5px; font-weight: 700; border: 1px solid #C8D6CF; text-align: center; box-sizing: border-box; margin: 0 auto; letter-spacing: 0.2px;">
                🌐 Visit Website
              </a>
            </td>
          </tr>
        </table>

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

        <div style="text-align: center; font-size: 13px; color: #334155; margin-top: 16px;">
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
      color: #1E293B;
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
      color: #1E293B;
      margin-bottom: 20px;
      letter-spacing: -0.1px;
    }
    .cta-btn-primary {
      display: block;
      max-width: 280px;
      width: 100%;
      background: linear-gradient(135deg, #FF6B35 0%, #E85D04 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 13px 20px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 4px 14px rgba(255, 107, 53, 0.3);
      letter-spacing: 0.2px;
      text-align: center;
      box-sizing: border-box;
      margin: 0 auto;
    }
    .cta-btn-secondary {
      display: block;
      max-width: 280px;
      width: 100%;
      background: #F0F4F2;
      color: #1B4332 !important;
      text-decoration: none;
      padding: 11px 20px;
      border-radius: 50px;
      font-size: 13.5px;
      font-weight: 700;
      border: 1px solid #C8D6CF;
      letter-spacing: 0.2px;
      text-align: center;
      box-sizing: border-box;
      margin: 0 auto;
    }
    @media only screen and (max-width: 480px) {
      .wrapper {
        padding: 14px 6px !important;
      }
      .content {
        padding: 20px 14px !important;
      }
      .cta-btn-primary, .cta-btn-secondary {
        max-width: 100% !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
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
      color: #334155;
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
      color: #1E293B;
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
      color: #475569;
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

        <!-- TOP CTAs (Stacked & Centered, 100% Mobile Safe) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 18px auto 22px auto;">
          <tr>
            <td align="center" style="padding-bottom: 10px;">
              <a href="${APP_REDIRECT_URL}" target="_blank" class="cta-btn-primary" style="display: block; max-width: 280px; width: 100%; background: linear-gradient(135deg, #FF6B35 0%, #E85D04 100%); color: #ffffff !important; text-decoration: none; padding: 13px 20px; border-radius: 50px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 14px rgba(255, 107, 53, 0.3); text-align: center; box-sizing: border-box; margin: 0 auto; letter-spacing: 0.2px;">
                📲 Enroll on App
              </a>
            </td>
          </tr>
          <tr>
            <td align="center">
              <a href="${COURSES_URL}" target="_blank" class="cta-btn-secondary" style="display: block; max-width: 280px; width: 100%; background: #F0F4F2; color: #1B4332 !important; text-decoration: none; padding: 11px 20px; border-radius: 50px; font-size: 13.5px; font-weight: 700; border: 1px solid #C8D6CF; text-align: center; box-sizing: border-box; margin: 0 auto; letter-spacing: 0.2px;">
                🌐 Enroll on Website
              </a>
            </td>
          </tr>
        </table>

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

        <p style="font-size: 14px; color: #334155; line-height: 1.5; text-align: center; margin-top: 20px;">
          It takes just <strong>10 seconds</strong> to click below and begin your first lesson. Start today!
        </p>

        <!-- SECONDARY CTAs AT BOTTOM (Stacked & Centered, 100% Mobile Safe) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px auto 10px auto;">
          <tr>
            <td align="center" style="padding-bottom: 10px;">
              <a href="${APP_REDIRECT_URL}" target="_blank" class="cta-btn-primary" style="display: block; max-width: 280px; width: 100%; background: linear-gradient(135deg, #FF6B35 0%, #E85D04 100%); color: #ffffff !important; text-decoration: none; padding: 13px 20px; border-radius: 50px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 14px rgba(255, 107, 53, 0.3); text-align: center; box-sizing: border-box; margin: 0 auto; letter-spacing: 0.2px;">
                📲 Open App & Enroll
              </a>
            </td>
          </tr>
          <tr>
            <td align="center">
              <a href="${COURSES_URL}" target="_blank" class="cta-btn-secondary" style="display: block; max-width: 280px; width: 100%; background: #F0F4F2; color: #1B4332 !important; text-decoration: none; padding: 11px 20px; border-radius: 50px; font-size: 13.5px; font-weight: 700; border: 1px solid #C8D6CF; text-align: center; box-sizing: border-box; margin: 0 auto; letter-spacing: 0.2px;">
                🌐 Enroll on Website
              </a>
            </td>
          </tr>
        </table>
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

const escapeEmailHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[character]);

export const generateCertificateExamReminderEmailHtml = ({ name, exams }) => {
  if (!Array.isArray(exams) || exams.length === 0) {
    throw new Error('Certificate exam reminder requires at least one eligible exam');
  }

  const safeName = escapeEmailHtml(name?.trim() || 'there');
  const safeAppUrl = escapeEmailHtml(APP_REDIRECT_URL);
  const baseUrl = COURSES_URL.replace(/\/+$/, '');
  const examCards = exams.map((exam, index) => {
    const safeCourseTitle = escapeEmailHtml(exam.courseTitle || 'your course');
    const examUrl = `${baseUrl}/courses/${encodeURIComponent(exam.courseId)}/assignment/${encodeURIComponent(exam.assignmentId)}`;
    const safeExamUrl = escapeEmailHtml(examUrl);
    const attemptsLeft = Math.max(0, Number(exam.remainingAttempts) || 0);
    const courseMessage = exam.hasAttempted
      ? `You have <strong>${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining</strong>. Review your lessons, then try again.`
      : 'Your exam is unlocked and ready when you are.';

    return `
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:0 0 16px;background-color:#F5FAF6;border:1px solid #D8E6DE;border-radius:14px;">
        <tr>
          <td style="padding:20px 22px;">
            <p style="margin:0 0 8px;color:#2D6A4F;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Eligible exam ${index + 1}</p>
            <p style="margin:0 0 10px;color:#1B4332;font-size:18px;font-weight:700;line-height:1.4;word-break:break-word;">${safeCourseTitle}</p>
            <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.6;">${courseMessage}</p>
            <a href="${safeExamUrl}" target="_blank" style="display:inline-block;padding:11px 20px;border:1px solid #E85D04;border-radius:50px;background-color:#E85D04;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;line-height:1.2;">${exam.hasAttempted ? 'Try this exam again' : 'Take this exam'}</a>
          </td>
        </tr>
      </table>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your certificate exams are ready</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>body,table,td,p,a,h1{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif!important;}</style>
</head>
<body style="margin:0;padding:0;background-color:#f3f6f4;color:#1E293B;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">You are eligible for ${exams.length} course exam${exams.length === 1 ? '' : 's'}. Take an exam to earn your Treecampus certificate.</div>
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f3f6f4;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
          <tr>
            <td align="center" style="padding:28px 24px 30px;background-color:#1B4332;background-image:linear-gradient(135deg,#1B4332 0%,#2D6A4F 100%);">
              <img src="https://res.cloudinary.com/dbbll23jz/image/upload/v1765170258/tree_logo_ek4uw3.png" alt="Treecampus" width="56" height="56" style="display:block;width:56px;height:56px;object-fit:contain;background:#ffffff;border-radius:12px;padding:5px;margin:0 auto 14px;">
              <p style="margin:0 0 8px;color:#D8F3DC;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">Your next milestone</p>
              <h1 style="margin:0;color:#ffffff;font-size:26px;line-height:1.3;font-weight:700;letter-spacing:-0.4px;">Your certificate exams are ready</h1>
              <p style="margin:10px 0 0;color:#E8F5E9;font-size:14px;line-height:1.5;">Choose an eligible course exam to get started.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 28px 32px;">
              <p style="margin:0 0 14px;color:#1B4332;font-size:20px;font-weight:700;">Hi ${safeName},</p>
              <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">You are eligible for the course exams below. Pass an exam to earn the certificate for that course.</p>
              ${examCards}
              <p style="margin:0 0 12px;color:#475569;font-size:12px;line-height:1.6;text-align:center;">Prefer learning on your phone?</p>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 16px;">
                <tr>
                  <td align="center" bgcolor="#F0F4F2" style="border:1px solid #C8D6CF;border-radius:50px;background-color:#F0F4F2;">
                    <a href="${safeAppUrl}" target="_blank" style="display:inline-block;padding:12px 24px;border-radius:50px;color:#1B4332;text-decoration:none;font-size:14px;font-weight:700;line-height:1.2;">Open Treecampus mobile app</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#475569;font-size:12px;line-height:1.6;text-align:center;">Sign in to Treecampus if prompted. The app link can open the app or take you to its download page.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 24px;background-color:#1B4332;color:#D8F3DC;font-size:12px;line-height:1.6;">
              <p style="margin:0 0 4px;color:#ffffff;font-size:14px;font-weight:800;">Treecampus</p>
              <p style="margin:0;">You received this reminder because you are eligible for these course exams and do not yet have certificates for them.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export const sendCertificateExamReminderEmail = async (
  email,
  name,
  exams
) => {
  if (!email) {
    console.warn('⚠️ [ZeptoMail] sendCertificateExamReminderEmail called without email address');
    return null;
  }

  const htmlContent = generateCertificateExamReminderEmailHtml({
    name,
    exams
  });

  return sendZeptoMail({
    toEmail: email,
    toName: name?.trim() || 'Treecampus User',
    subject: 'Your eligible certificate exams are ready | Treecampus',
    htmlContent
  });
};

export const sendAssignmentResultsEmail = async (email, name, results) => {
  if (!email) {
    console.warn('⚠️ [ZeptoMail] sendAssignmentResultsEmail called without email address');
    return null;
  }

  const safeName = escapeEmailHtml(name?.trim() || 'Learner');
  const safeCourseTitle = escapeEmailHtml(results?.courseTitle || 'your course');
  const score = Math.max(0, Number(results?.score) || 0);
  const passingScore = results?.passingScore == null ? null : Math.max(0, Number(results.passingScore) || 0);
  const isPassed = Boolean(results?.passed);
  const certificateBaseUrl = COURSES_URL.replace(/\/+$/, '');
  const certificateUrl = `${certificateBaseUrl}/certificate`;
  const statusColor = isPassed ? '#166534' : '#991B1B';
  const statusBackground = isPassed ? '#DCFCE7' : '#FEE2E2';
  const certificateSection = isPassed && results?.certificateId
    ? `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:20px auto 4px;">
        <tr>
          <td align="center" bgcolor="#E85D04" style="border-radius:50px;background-color:#E85D04;">
            <a href="${escapeEmailHtml(certificateUrl)}" target="_blank" style="display:inline-block;padding:13px 26px;border:1px solid #E85D04;border-radius:50px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;line-height:1.2;">View and download certificate</a>
          </td>
        </tr>
      </table>`
    : '';
  const resultMessage = isPassed
    ? 'Congratulations! You have successfully passed the assignment and earned your certificate.'
    : 'You can try again after reviewing the course material. Your remaining attempts will appear on the exam page.';

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assignment Results | Treecampus</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>body,table,td,p,a,h1,h2{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif!important;}</style>
</head>
<body style="margin:0;padding:0;background-color:#f3f6f4;color:#1E293B;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f3f6f4;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
          <tr>
            <td align="center" style="padding:28px 24px;background:linear-gradient(135deg,#1B4332 0%,#2D6A4F 100%);background-color:#1B4332;">
              <img src="https://res.cloudinary.com/dbbll23jz/image/upload/v1765170258/tree_logo_ek4uw3.png" alt="Treecampus" width="56" height="56" style="display:block;width:56px;height:56px;object-fit:contain;background:#ffffff;border-radius:12px;padding:5px;margin:0 auto 12px;">
              <p style="margin:0 0 7px;color:#D8F3DC;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">Assignment update</p>
              <h1 style="margin:0;color:#ffffff;font-size:26px;line-height:1.3;font-weight:700;">Your exam result</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 28px 32px;">
              <p style="margin:0 0 12px;color:#1B4332;font-size:20px;font-weight:700;">Hi ${safeName},</p>
              <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">Here are your results for <strong>${safeCourseTitle}</strong>.</p>
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:0 0 18px;background-color:#F8FAF9;border:1px solid #E2E8F0;border-radius:14px;">
                <tr>
                  <td width="50%" style="padding:18px;text-align:center;border-right:1px solid #E2E8F0;">
                    <p style="margin:0 0 7px;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Status</p>
                    <span style="display:inline-block;padding:7px 12px;border-radius:999px;background-color:${statusBackground};color:${statusColor};font-size:13px;font-weight:700;">${isPassed ? 'Passed' : 'Needs improvement'}</span>
                  </td>
                  <td width="50%" style="padding:18px;text-align:center;">
                    <p style="margin:0 0 7px;color:#64748B;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Your score</p>
                    <p style="margin:0;color:#1B4332;font-size:24px;font-weight:800;">${score}%</p>
                  </td>
                </tr>
              </table>
              ${passingScore !== null ? `<p style="margin:0 0 18px;color:#334155;font-size:14px;text-align:center;">Passing score: <strong>${passingScore}%</strong></p>` : ''}
              <p style="margin:0;color:#334155;font-size:15px;line-height:1.7;text-align:center;">${resultMessage}</p>
              ${certificateSection}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 24px;background-color:#1B4332;color:#D8F3DC;font-size:12px;line-height:1.6;">
              <p style="margin:0 0 4px;color:#ffffff;font-size:14px;font-weight:700;">Treecampus</p>
              <p style="margin:0;">Democratizing quality education at no cost for every learner.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendZeptoMail({
    toEmail: email,
    toName: name?.trim() || 'Treecampus Learner',
    subject: `Assignment result: ${results?.courseTitle || 'Your course'} | Treecampus`,
    htmlContent
  });
};

const generateSimpleZeptoEmailHtml = ({ name, title, intro, content, contentHtml, ctaLabel, ctaUrl }) => {
  const safeName = escapeEmailHtml(name?.trim() || 'Learner');
  const safeTitle = escapeEmailHtml(title);
  const safeIntro = escapeEmailHtml(intro);
  const safeContent = escapeEmailHtml(content);
  const safeCtaLabel = escapeEmailHtml(ctaLabel);
  const safeCtaUrl = ctaUrl ? escapeEmailHtml(ctaUrl) : '';
  const renderedContent = contentHtml || (safeContent ? `<p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.7;">${safeContent}</p>` : '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} | Treecampus</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:28px 12px;background:#f3f6f4;color:#1E293B;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,.06);">
        <tr><td align="center" style="padding:26px 24px;background:#1B4332;background-image:linear-gradient(135deg,#1B4332,#2D6A4F);">
          <img src="https://res.cloudinary.com/dbbll23jz/image/upload/v1765170258/tree_logo_ek4uw3.png" alt="Treecampus" width="56" height="56" style="display:block;width:56px;height:56px;background:#fff;border-radius:12px;padding:5px;margin:0 auto 12px;">
          <h1 style="margin:0;color:#fff;font-size:24px;line-height:1.3;">${safeTitle}</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 14px;color:#1B4332;font-size:20px;font-weight:700;">Hi ${safeName},</p>
          <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.7;">${safeIntro}</p>
          ${renderedContent}
          ${safeCtaUrl ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:20px auto 4px;"><tr><td align="center" bgcolor="#E85D04" style="border-radius:50px;background:#E85D04;"><a href="${safeCtaUrl}" target="_blank" style="display:inline-block;padding:13px 26px;border:1px solid #E85D04;border-radius:50px;color:#fff;text-decoration:none;font-size:14px;font-weight:700;">${safeCtaLabel}</a></td></tr></table>` : ''}
          <p style="margin:24px 0 0;color:#475569;font-size:13px;line-height:1.6;">Best regards,<br><strong style="color:#1B4332;">Treecampus Team</strong></p>
        </td></tr>
        <tr><td align="center" style="padding:18px 24px;background:#1B4332;color:#D8F3DC;font-size:12px;line-height:1.6;">
          <p style="margin:0 0 4px;color:#fff;font-size:14px;font-weight:700;">Treecampus</p>
          <p style="margin:0;">Democratizing quality education at no cost for every learner.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

export const sendOTPEmail = async (email, name, otp, subject = 'Your OTP Code') => {
  const htmlContent = generateSimpleZeptoEmailHtml({
    name,
    title: 'Verify your account',
    intro: 'Use the following OTP to continue. This code expires in 10 minutes.',
    contentHtml: `<div style="margin:4px 0 20px;"><span style="display:inline-block;padding:14px 22px;border-radius:10px;background:#F0F4F2;color:#1B4332;font-size:24px;font-weight:800;letter-spacing:5px;">${escapeEmailHtml(otp)}</span></div>`
  });
  return sendZeptoMail({ toEmail: email, toName: name, subject: subject, htmlContent });
};

export const sendPasswordResetEmail = async (email, name, resetUrl) => {
  const htmlContent = generateSimpleZeptoEmailHtml({
    name,
    title: 'Password reset request',
    intro: 'You requested to reset your password. Use the button below to set a new one.',
    content: 'This link expires in 1 hour. If you did not request this, you can safely ignore this email.',
    ctaLabel: 'Reset Password',
    ctaUrl: resetUrl
  });
  return sendZeptoMail({ toEmail: email, toName: name, subject: 'Password Reset Request | Treecampus', htmlContent });
};

export const sendVolunteerConfirmation = async (email, name) => sendZeptoMail({
  toEmail: email,
  toName: name,
  subject: 'Volunteer Registration Confirmation | Treecampus',
  htmlContent: generateSimpleZeptoEmailHtml({
    name,
    title: 'Volunteer registration received',
    intro: 'Thank you for registering as a volunteer with Treecampus.',
    content: 'We have received your application and will contact you shortly.'
  })
});

export const sendSchoolRegistrationConfirmation = async (email, name) => sendZeptoMail({
  toEmail: email,
  toName: name,
  subject: 'School Registration Confirmation | Treecampus',
  htmlContent: generateSimpleZeptoEmailHtml({
    name,
    title: 'School registration received',
    intro: 'Thank you for registering your school with Treecampus.',
    content: 'We have received your registration and will review it shortly.'
  })
});

export const sendAccountDeletionConfirmation = async (email, name) => sendZeptoMail({
  toEmail: email,
  toName: name,
  subject: 'Account Deletion Request | Treecampus',
  htmlContent: generateSimpleZeptoEmailHtml({
    name,
    title: 'Account deletion request',
    intro: 'We have received your account deletion request.',
    content: 'Your account will be processed within 30 days as per our policy.'
  })
});

export const sendTeacherApplicationConfirmation = async (email, name) => sendZeptoMail({
  toEmail: email,
  toName: name,
  subject: 'Teacher Application Received | Treecampus',
  htmlContent: generateSimpleZeptoEmailHtml({
    name,
    title: 'Teacher application received',
    intro: 'Thank you for applying to be an online educator at Treecampus.',
    content: 'Your application and demo materials are under review. We will notify you when there is an update.'
  })
});

export const sendTeacherStatusUpdate = async (email, name, status) => {
  const approved = status === 'approved';
  return sendZeptoMail({
    toEmail: email,
    toName: name,
    subject: `Teacher Application ${approved ? 'Approved' : 'Status Update'} | Treecampus`,
    htmlContent: generateSimpleZeptoEmailHtml({
      name,
      title: `Application ${approved ? 'approved' : 'status update'}`,
      intro: approved
        ? 'We are pleased to inform you that your application to join the Treecampus teaching faculty has been approved!'
        : 'Thank you for your interest. After careful review, we are unable to move forward with your application at this time.',
      content: approved
        ? 'Our team will contact you with onboarding details, schedule and teaching requirements.'
        : 'We appreciate your time and wish you all the best in your future endeavors.'
    })
  });
};

export const sendEmail = async (toEmail, toName, subject, type, context = {}) => {
  if (!toEmail) {
    console.warn('⚠️ [ZeptoMail] sendEmail called without email address');
    return null;
  }

  if (type === 'coupon') {
    const safeName = escapeEmailHtml(toName?.trim() || 'Learner');
    const safeCoupon = escapeEmailHtml(context.coupon);
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Treecampus Reward</title></head>
<body style="margin:0;padding:28px 12px;background:#f3f6f4;color:#1E293B;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">
      <tr><td align="center" style="padding:28px 24px;background:#1B4332;background-image:linear-gradient(135deg,#1B4332,#2D6A4F);">
        <img src="https://res.cloudinary.com/dbbll23jz/image/upload/v1765170258/tree_logo_ek4uw3.png" alt="Treecampus" width="56" height="56" style="display:block;width:56px;height:56px;background:#fff;border-radius:12px;padding:5px;margin:0 auto 12px;">
        <h1 style="margin:0;color:#fff;font-size:24px;">Congratulations, ${safeName}!</h1>
      </td></tr>
      <tr><td align="center" style="padding:28px;">
        <p style="margin:0 0 18px;color:#334155;font-size:16px;line-height:1.7;">You won an exclusive SastaSundar discount coupon.</p>
        <p style="margin:0 0 8px;color:#64748B;font-size:12px;font-weight:700;text-transform:uppercase;">Your coupon code</p>
        <div style="display:inline-block;margin:0 0 20px;padding:14px 24px;background:#F0F4F2;border:1px solid #C8D6CF;border-radius:10px;color:#1B4332;font-size:22px;font-weight:800;letter-spacing:1px;">${safeCoupon}</div>
        <br>
        <a href="https://www.sastasundar.com/" target="_blank" style="display:inline-block;margin:8px;padding:12px 22px;border-radius:50px;background:#E85D04;color:#fff;text-decoration:none;font-size:14px;font-weight:700;">Redeem Now</a>
        <p style="margin:18px 0 0;color:#475569;font-size:12px;line-height:1.6;">This coupon is for one-time use only, is non-transferable, and is subject to applicable terms and conditions.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;
    return sendZeptoMail({ toEmail, toName, subject, htmlContent });
  }

  if (type === 'reset') {
    return sendPasswordResetEmail(toEmail, toName, context.resetUrl);
  }

  if (type === 'verification') {
    const htmlContent = generateSimpleZeptoEmailHtml({
      name: toName,
      title: 'Verify your email address',
      intro: 'Thank you for registering with Treecampus.',
      content: 'Please verify your email address to continue.',
      ctaLabel: 'Verify Email Address',
      ctaUrl: context.verifyUrl
    });
    return sendZeptoMail({ toEmail, toName, subject, htmlContent });
  }

  throw new Error(`Unsupported ZeptoMail email type: ${type}`);
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
      color: #1E293B;
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
      color: #1E293B;
      margin-bottom: 20px;
      letter-spacing: -0.1px;
    }
    .cta-btn-primary {
      display: block;
      max-width: 280px;
      width: 100%;
      background: linear-gradient(135deg, #FF6B35 0%, #E85D04 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 13px 20px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 4px 14px rgba(255, 107, 53, 0.3);
      letter-spacing: 0.2px;
      text-align: center;
      box-sizing: border-box;
      margin: 0 auto;
    }
    .cta-btn-secondary {
      display: block;
      max-width: 280px;
      width: 100%;
      background: #F0F4F2;
      color: #1B4332 !important;
      text-decoration: none;
      padding: 11px 20px;
      border-radius: 50px;
      font-size: 13.5px;
      font-weight: 700;
      border: 1px solid #C8D6CF;
      letter-spacing: 0.2px;
      text-align: center;
      box-sizing: border-box;
      margin: 0 auto;
    }
    @media only screen and (max-width: 480px) {
      .wrapper {
        padding: 14px 6px !important;
      }
      .content {
        padding: 20px 14px !important;
      }
      .cta-btn-primary, .cta-btn-secondary {
        max-width: 100% !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
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
      color: #334155;
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
      color: #1E293B;
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

        <!-- TOP CTAs (Stacked & Centered, 100% Mobile Safe) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 18px auto 22px auto;">
          <tr>
            <td align="center" style="padding-bottom: 10px;">
              <a href="${APP_REDIRECT_URL}" target="_blank" class="cta-btn-primary" style="display: block; max-width: 280px; width: 100%; background: linear-gradient(135deg, #FF6B35 0%, #E85D04 100%); color: #ffffff !important; text-decoration: none; padding: 13px 20px; border-radius: 50px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 14px rgba(255, 107, 53, 0.3); text-align: center; box-sizing: border-box; margin: 0 auto; letter-spacing: 0.2px;">
                📲 Open Treecampus App
              </a>
            </td>
          </tr>
          <tr>
            <td align="center">
              <a href="${LIVE_CLASSES_URL}" target="_blank" class="cta-btn-secondary" style="display: block; max-width: 280px; width: 100%; background: #F0F4F2; color: #1B4332 !important; text-decoration: none; padding: 11px 20px; border-radius: 50px; font-size: 13.5px; font-weight: 700; border: 1px solid #C8D6CF; text-align: center; box-sizing: border-box; margin: 0 auto; letter-spacing: 0.2px;">
                🌐 View on Website
              </a>
            </td>
          </tr>
        </table>

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
            <div class="step-text">Open the <strong>Treecampus App</strong> or visit <a href="${LIVE_CLASSES_URL}" target="_blank" style="color: #2D6A4F; font-weight: 700;">courses.treecampus.in/live-classes</a></div>
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
          <a href="${APP_REDIRECT_URL}" target="_blank" class="cta-btn-primary" style="display: block; max-width: 280px; width: 100%; background: linear-gradient(135deg, #FF6B35 0%, #E85D04 100%); color: #ffffff !important; text-decoration: none; padding: 13px 20px; border-radius: 50px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 14px rgba(255, 107, 53, 0.3); text-align: center; box-sizing: border-box; margin: 0 auto; letter-spacing: 0.2px;">
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



