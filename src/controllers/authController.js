// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

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