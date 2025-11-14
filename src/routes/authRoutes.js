// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Kayıt
router.post('/register', async (req, res) => {
  try {
    console.log('📝 Kayıt isteği geldi:', req.body.email);
    
    const { email, password, name } = req.body;

    // Validasyon
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Tüm alanlar gerekli' });
    }

    // Email kontrolü
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Bu email zaten kayıtlı' });
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Yeni kullanıcı oluştur
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

 const token = jwt.sign(
  { userId: user._id },
  global.JWT_SECRET,
  { expiresIn: '7d' }
);

    console.log('✅ Kullanıcı kaydedildi:', user.email);

    res.status(201).json({
      message: 'Kullanıcı oluşturuldu',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('❌ Kayıt hatası:', error);
    res.status(500).json({ error: 'Kayıt başarısız' });
  }
});

// Giriş
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Giriş isteği geldi:', req.body.email);
    
    const { email, password } = req.body;

    // Validasyon
    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre gerekli' });
    }

    // Kullanıcıyı bul
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Email veya şifre hatalı' });
    }

    // Şifreyi kontrol et
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email veya şifre hatalı' });
    }

const token = jwt.sign(
  { userId: user._id },
  global.JWT_SECRET,
  { expiresIn: '7d' }
);
    console.log('✅ Giriş başarılı:', user.email);

    res.json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('❌ Giriş hatası:', error);
    res.status(500).json({ error: 'Giriş başarısız' });
  }
});

// Kullanıcı bilgilerini getir
router.get('/me', auth, async (req, res) => {
  try {
    console.log('👤 Kullanıcı bilgisi isteği');
    
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    console.log('✅ Kullanıcı bulundu:', user.email);

    res.json(user);
  } catch (error) {
    console.error('❌ Kullanıcı bilgisi hatası:', error);
    res.status(500).json({ error: 'Kullanıcı bilgisi alınamadı' });
  }
});

module.exports = router;