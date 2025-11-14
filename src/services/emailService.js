// backend/src/services/emailService.js
const nodemailer = require('nodemailer');

// Email transporter oluştur
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: global.EMAIL_CONFIG.user,
      pass: global.EMAIL_CONFIG.pass,
    },
  });
};

// Şifre sıfırlama emaili gönder
exports.sendPasswordResetEmail = async (email, resetCode) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Para Takip App" <${global.EMAIL_CONFIG.user}>`,
      to: email,
      subject: 'Şifre Sıfırlama Kodu - Para Takip',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: white;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .code-box {
              background: #f0f0f0;
              border: 2px dashed #667eea;
              padding: 20px;
              text-align: center;
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 5px;
              color: #667eea;
              margin: 20px 0;
              border-radius: 5px;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #777;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Şifre Sıfırlama</h1>
            </div>
            <div class="content">
              <p>Merhaba,</p>
              <p>Para Takip uygulaması için şifre sıfırlama talebinde bulundunuz. Aşağıdaki kodu kullanarak şifrenizi sıfırlayabilirsiniz:</p>
              
              <div class="code-box">
                ${resetCode}
              </div>
              
              <div class="warning">
                ⚠️ <strong>Önemli:</strong> Bu kod 10 dakika boyunca geçerlidir.
              </div>
              
              <p>Eğer bu talebi siz oluşturmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
              
              <p>İyi günler dileriz,<br><strong>Para Takip Ekibi</strong></p>
            </div>
            <div class="footer">
              <p>Bu otomatik bir emaildir, lütfen yanıtlamayın.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email gönderildi:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email gönderme hatası:', error);
    return { success: false, error: error.message };
  }
};