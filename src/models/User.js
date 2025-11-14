// src/models/User.js - GÜNCELLENECEK
const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  // YENİ ALANLAR - Password Reset için
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpire: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Password reset token oluşturma metodu
userSchema.methods.getResetPasswordToken = function() {
  // 6 haneli kod oluştur
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Token'ı hashle ve kaydet
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetCode)
    .digest('hex');
  
  // 10 dakika geçerlilik süresi
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  
  return resetCode; // Hashlanmamış kodu döndür (kullanıcıya göstermek için)
};

module.exports = mongoose.model('User', userSchema);