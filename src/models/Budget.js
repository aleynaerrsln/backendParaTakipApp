// src/models/Budget.js
const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  period: {
    type: String,
    required: true,
    enum: ['gunluk', 'haftalik', 'aylik']
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['limit', 'saving'],
    default: 'limit'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Bir kullanıcının aynı anda sadece 1 aktif hedefi olabilir
budgetSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Budget', budgetSchema);