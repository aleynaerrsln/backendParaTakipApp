// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');

const JWT_SECRET = 'super-gizli-anahtar-123456789';

// Kayıt
exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validasyon
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Tüm alanları doldurun' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Şifre en az 6 karakter olmalı' 
      });
    }

    // Email kontrolü
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Bu email zaten kullanılıyor' 
      });
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kullanıcı oluştur
    const user = await User.create({
      email,
      password: hashedPassword,
      name
    });

    // Token oluştur
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Kayıt başarılı',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Kayıt sırasında hata oluştu' 
    });
  }
};

// Giriş
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasyon
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email ve şifre gerekli' 
      });
    }

    // Kullanıcı var mı?
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        error: 'Email veya şifre hatalı' 
      });
    }

    // Şifre doğru mu?
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Email veya şifre hatalı' 
      });
    }

    // Token oluştur
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Giriş sırasında hata oluştu' 
    });
  }
};

// Şifre sıfırlama kodu gönder
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email gerekli' 
      });
    }

    // Kullanıcıyı bul
    const user = await User.findOne({ email });
    
    if (!user) {
      // Güvenlik için kullanıcı bulunamasa bile başarılı mesajı dön
      return res.json({
        message: 'Eğer email kayıtlıysa, sıfırlama kodu gönderildi',
        success: true
      });
    }

    // Reset token oluştur
    const resetCode = user.getResetPasswordToken();
    await user.save();

    // EMAIL GÖNDER
    const emailService = require('../services/emailService');
    const emailResult = await emailService.sendPasswordResetEmail(email, resetCode);

    if (emailResult.success) {
      console.log(`✅ Şifre sıfırlama emaili gönderildi: ${email}`);
      
      res.json({
        message: 'Şifre sıfırlama kodu email adresinize gönderildi',
        success: true
      });
    } else {
      console.error(`❌ Email gönderilemedi: ${email}`, emailResult.error);
      
      // Email gönderilmezse de kod console'da görünsün (development için)
      console.log(`🔐 Password Reset Code for ${email}: ${resetCode}`);
      
      res.status(500).json({
        error: 'Email gönderilemedi. Lütfen daha sonra tekrar deneyin.',
        success: false
      });
    }

  } catch (error) {
    console.error('Forgot password hatası:', error);
    res.status(500).json({ 
      error: 'Şifre sıfırlama işlemi başarısız' 
    });
  }
};

// Şifreyi sıfırla
exports.resetPassword = async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;

    // Validasyon
    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ 
        error: 'Tüm alanlar gerekli' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Yeni şifre en az 6 karakter olmalı' 
      });
    }

    // Kodu hashle
    const hashedCode = crypto
      .createHash('sha256')
      .update(resetCode)
      .digest('hex');

    // Kullanıcıyı token ve süre ile bul
    const user = await User.findOne({
      email,
      resetPasswordToken: hashedCode,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        error: 'Geçersiz veya süresi dolmuş kod' 
      });
    }

    // Yeni şifreyi hashle ve kaydet
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    res.json({
      message: 'Şifre başarıyla sıfırlandı',
      success: true
    });

  } catch (error) {
    console.error('Reset password hatası:', error);
    res.status(500).json({ 
      error: 'Şifre sıfırlama başarısız' 
    });
  }
};
// Şifre değiştir (Authenticated user için)
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    // Validasyon
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Mevcut şifre ve yeni şifre gerekli' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Yeni şifre en az 6 karakter olmalı' 
      });
    }

    // Kullanıcıyı bul
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'Kullanıcı bulunamadı' 
      });
    }

    // Mevcut şifreyi kontrol et
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Mevcut şifre hatalı' 
      });
    }

    // Yeni şifreyi hashle ve kaydet
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({
      message: 'Şifre başarıyla değiştirildi',
      success: true
    });

  } catch (error) {
    console.error('Change password hatası:', error);
    res.status(500).json({ 
      error: 'Şifre değiştirme başarısız' 
    });
  }
};
// Şifre değiştir (Authenticated user için)
exports.changePassword = async (req, res) => {
  try {
    console.log('🔐 Şifre değiştirme isteği geldi, userId:', req.userId);
    
    const userId = req.userId; // ✅ req.user.userId DEĞİL!
    const { currentPassword, newPassword } = req.body;

    console.log('Request body:', { currentPassword: '***', newPassword: '***' });

    // Validasyon
    if (!currentPassword || !newPassword) {
      console.log('❌ Validasyon hatası: Eksik alan');
      return res.status(400).json({ 
        error: 'Mevcut şifre ve yeni şifre gerekli' 
      });
    }

    if (newPassword.length < 6) {
      console.log('❌ Validasyon hatası: Şifre çok kısa');
      return res.status(400).json({ 
        error: 'Yeni şifre en az 6 karakter olmalı' 
      });
    }

    // Kullanıcıyı bul
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ Kullanıcı bulunamadı:', userId);
      return res.status(404).json({ 
        error: 'Kullanıcı bulunamadı' 
      });
    }

    console.log('✅ Kullanıcı bulundu:', user.email);

    // Mevcut şifreyi kontrol et
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      console.log('❌ Mevcut şifre hatalı');
      return res.status(401).json({ 
        error: 'Mevcut şifre hatalı' 
      });
    }

    console.log('✅ Mevcut şifre doğru');

    // Yeni şifreyi hashle ve kaydet
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    console.log('✅ Şifre başarıyla değiştirildi');

    res.json({
      message: 'Şifre başarıyla değiştirildi',
      success: true
    });

  } catch (error) {
    console.error('❌ Change password hatası:', error);
    res.status(500).json({ 
      error: 'Şifre değiştirme başarısız: ' + error.message
    });
  }
};
// Profil güncelle (Authenticated user için)
exports.updateProfile = async (req, res) => {
  try {
    console.log('👤 Profil güncelleme isteği, userId:', req.userId);
    
    const userId = req.userId;
    const { name, email } = req.body;

    // Kullanıcıyı bul
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'Kullanıcı bulunamadı' 
      });
    }

    // Email değişikliği varsa, başka kullanıcı kullanıyor mu kontrol et
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ 
          error: 'Bu email zaten kullanılıyor' 
        });
      }
      user.email = email;
    }

    // İsim güncellemesi
    if (name) {
      user.name = name;
    }

    await user.save();

    console.log('✅ Profil güncellendi:', user.email);

    res.json({
      message: 'Profil başarıyla güncellendi',
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('❌ Update profile hatası:', error);
    res.status(500).json({ 
      error: 'Profil güncelleme başarısız: ' + error.message
    });
  }
};

// Hesabı sil (Authenticated user için)
exports.deleteAccount = async (req, res) => {
  try {
    console.log('🗑️ Hesap silme isteği, userId:', req.userId);
    
    const userId = req.userId;

    // Kullanıcıyı bul ve sil
    const user = await User.findByIdAndDelete(userId);
    
    if (!user) {
      return res.status(404).json({ 
        error: 'Kullanıcı bulunamadı' 
      });
    }

    console.log('✅ Hesap silindi:', user.email);

    res.json({
      message: 'Hesap başarıyla silindi',
      success: true
    });

  } catch (error) {
    console.error('❌ Delete account hatası:', error);
    res.status(500).json({ 
      error: 'Hesap silme başarısız: ' + error.message
    });
  }
};