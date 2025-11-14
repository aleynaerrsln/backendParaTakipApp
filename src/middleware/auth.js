// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// JWT_SECRET'ı tanımla
const JWT_SECRET = global.JWT_SECRET || 'super-gizli-anahtar-123456789';

const auth = async (req, res, next) => {
  try {
    // Token'ı header'dan al
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token bulunamadı' });
    }

    // Token'ı doğrula
    const decoded = jwt.verify(token, JWT_SECRET);

    // userId'yi mongoose ObjectId'ye çevir
    req.user = {
      userId: new mongoose.Types.ObjectId(decoded.userId)
    };

    next();
  } catch (error) {
    console.error('Auth middleware hatası:', error);
    res.status(401).json({ error: 'Geçersiz token' });
  }
};

module.exports = auth;