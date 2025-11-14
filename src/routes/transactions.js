// backend/routes/transactions.js
const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

// Özet bilgileri getir (Gelir/Gider/Bakiye)
router.get('/summary', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Toplam gelir
    const incomeResult = await Transaction.aggregate([
      { $match: { userId: userId, type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalIncome = incomeResult.length > 0 ? incomeResult[0].total : 0;

    // Toplam gider
    const expenseResult = await Transaction.aggregate([
      { $match: { userId: userId, type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalExpense = expenseResult.length > 0 ? expenseResult[0].total : 0;

    // Bakiye
    const balance = totalIncome - totalExpense;

    res.json({
      totalIncome,
      totalExpense,
      balance
    });
  } catch (error) {
    console.error('Özet hatası:', error);
    res.status(500).json({ error: 'Özet bilgileri alınamadı' });
  }
});

// Tüm işlemleri getir
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const transactions = await Transaction.find({ userId })
      .sort({ date: -1 }) // En yeni işlemler önce
      .limit(50); // Son 50 işlem

    res.json(transactions);
  } catch (error) {
    console.error('İşlemler hatası:', error);
    res.status(500).json({ error: 'İşlemler alınamadı' });
  }
});

// Yeni işlem ekle
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { description, amount, type, category, date } = req.body;

    // Validasyon
    if (!description || !amount || !type) {
      return res.status(400).json({ 
        error: 'Açıklama, tutar ve tür gerekli' 
      });
    }

    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ 
        error: 'Tür income veya expense olmalı' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ 
        error: 'Tutar 0\'dan büyük olmalı' 
      });
    }

    // Yeni işlem oluştur
    const transaction = new Transaction({
      userId,
      description,
      amount,
      type,
      category: category || 'Diğer',
      date: date || new Date()
    });

    await transaction.save();

    res.status(201).json({
      message: 'İşlem eklendi',
      transaction
    });
  } catch (error) {
    console.error('İşlem ekleme hatası:', error);
    res.status(500).json({ error: 'İşlem eklenemedi' });
  }
});

// İşlem sil
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const transactionId = req.params.id;

    const transaction = await Transaction.findOne({ 
      _id: transactionId, 
      userId 
    });

    if (!transaction) {
      return res.status(404).json({ error: 'İşlem bulunamadı' });
    }

    await Transaction.deleteOne({ _id: transactionId });

    res.json({ message: 'İşlem silindi' });
  } catch (error) {
    console.error('İşlem silme hatası:', error);
    res.status(500).json({ error: 'İşlem silinemedi' });
  }
});

module.exports = router;