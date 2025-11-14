// src/controllers/transactionController.js
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// Harcama ekle
exports.createTransaction = async (req, res) => {
  try {
    const { amount, category, type, date, note, photoUrl } = req.body;
    const userId = req.userId;
    const mongoose = require('mongoose');
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Validasyon
    if (!amount || !category || !type) {
      return res.status(400).json({ 
        error: 'Tutar, kategori ve tip gerekli' 
      });
    }

    // Transaction oluştur
    const transaction = await Transaction.create({
      userId,
      amount,
      category,
      type,
      date: date || new Date(),
      note,
      photoUrl
    });

    res.status(201).json({
      message: 'İşlem başarıyla eklendi',
      transaction
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'İşlem eklenirken hata oluştu' 
    });
  }
};

// Tüm harcamaları listele
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.userId;
    const { type, category, startDate, endDate } = req.query;

    // Filtre oluştur
    let filter = { userId: userObjectId };
    
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Harcamaları getir (en yeni önce)
    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .limit(100);

    res.json({
      count: transactions.length,
      transactions
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'İşlemler getirilirken hata oluştu' 
    });
  }
};

// Tek harcama getir
exports.getTransaction = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const transaction = await Transaction.findOne({ 
      _id: id, 
      userId 
    });

    if (!transaction) {
      return res.status(404).json({ 
        error: 'İşlem bulunamadı' 
      });
    }

    res.json({ transaction });
  } catch (error) {
    res.status(500).json({ 
      error: 'İşlem getirilirken hata oluştu' 
    });
  }
};

// Harcama güncelle
exports.updateTransaction = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { amount, category, type, date, note, photoUrl } = req.body;

    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, userId },
      { amount, category, type, date, note, photoUrl },
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return res.status(404).json({ 
        error: 'İşlem bulunamadı' 
      });
    }

    res.json({
      message: 'İşlem güncellendi',
      transaction
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'İşlem güncellenirken hata oluştu' 
    });
  }
};

// Harcama sil
exports.deleteTransaction = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const transaction = await Transaction.findOneAndDelete({ 
      _id: id, 
      userId 
    });

    if (!transaction) {
      return res.status(404).json({ 
        error: 'İşlem bulunamadı' 
      });
    }

    res.json({
      message: 'İşlem silindi'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'İşlem silinirken hata oluştu' 
    });
  }
};

// İstatistikler
exports.getStatistics = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const { startDate, endDate } = req.query;

    // Filtre
    let filter = { userId };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Toplam gelir
    const incomeResult = await Transaction.aggregate([
      { $match: { ...filter, type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalIncome = incomeResult[0]?.total || 0;

    // Toplam gider
    const expenseResult = await Transaction.aggregate([
      { $match: { ...filter, type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalExpense = expenseResult[0]?.total || 0;

    // Kategorilere göre gider
    const expenseByCategory = await Transaction.aggregate([
      { $match: { ...filter, type: 'expense' } },
      { $group: { 
        _id: '$category', 
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }},
      { $sort: { total: -1 } }
    ]);

    res.json({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      expenseByCategory
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'İstatistikler getirilirken hata oluştu' 
    });
  }
};