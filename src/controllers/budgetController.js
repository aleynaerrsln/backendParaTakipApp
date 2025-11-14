// src/controllers/budgetController.js
const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// Hedef oluştur
exports.createBudget = async (req, res) => {
  try {
    const { amount, period, startDate, type } = req.body;
    const userId = req.userId;

    // Validasyon
    if (!amount || !period || !startDate) {
      return res.status(400).json({ 
        error: 'Tutar, periyot ve başlangıç tarihi gerekli' 
      });
    }

    // Eski aktif hedefi pasif yap
    await Budget.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );

    // Bitiş tarihini hesapla
    const start = new Date(startDate);
    let endDate;
    
    switch(period) {
      case 'gunluk':
        endDate = new Date(start);
        endDate.setDate(endDate.getDate() + 1);
        break;
      case 'haftalik':
        endDate = new Date(start);
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'aylik':
        endDate = new Date(start);
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      default:
        return res.status(400).json({ error: 'Geçersiz periyot' });
    }

    // Hedef oluştur
    const budget = await Budget.create({
      userId,
      amount,
      period,
      startDate: start,
      endDate,
      type: type || 'limit',
      isActive: true
    });

    res.status(201).json({
      message: 'Hedef başarıyla oluşturuldu',
      budget
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Hedef oluşturulurken hata oluştu' 
    });
  }
};

// Hedefleri listele
exports.getBudgets = async (req, res) => {
  try {
    const userId = req.userId;

    const budgets = await Budget.find({ userId })
      .sort({ createdAt: -1 });

    res.json({
      count: budgets.length,
      budgets
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Hedefler getirilirken hata oluştu' 
    });
  }
};

// Aktif hedefi getir
exports.getActiveBudget = async (req, res) => {
  try {
    const userId = req.userId;

    const budget = await Budget.findOne({ 
      userId, 
      isActive: true 
    });

    if (!budget) {
      return res.status(404).json({ 
        error: 'Aktif hedef bulunamadı' 
      });
    }

    res.json({ budget });
  } catch (error) {
    res.status(500).json({ 
      error: 'Hedef getirilirken hata oluştu' 
    });
  }
};

// Günlük bütçe hesapla
exports.calculateDailyBudget = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    // Aktif hedefi getir
    const budget = await Budget.findOne({ 
      userId, 
      isActive: true 
    });

    if (!budget) {
      return res.status(404).json({ 
        error: 'Aktif hedef bulunamadı' 
      });
    }

    // Hedef dönemindeki toplam harcamayı hesapla
    const totalExpenseResult = await Transaction.aggregate([
      {
        $match: {
          userId,
          type: 'expense',
          date: {
            $gte: budget.startDate,
            $lte: budget.endDate
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const totalExpense = totalExpenseResult[0]?.total || 0;

    // Kalan bütçe
    const remainingBudget = budget.amount - totalExpense;

    // Kalan gün sayısı
    const today = new Date();
    const endDate = new Date(budget.endDate);
    const remainingDays = Math.max(1, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));

    // Günlük harcama limiti
    const dailyLimit = remainingBudget / remainingDays;

    // Hedefin ne kadarı tamamlandı
    const completionPercentage = (totalExpense / budget.amount) * 100;

    // Hedef aşıldı mı?
    const isOverBudget = totalExpense > budget.amount;

    // Tavsiye mesajı
    let recommendation;
    if (isOverBudget) {
      recommendation = `Hedefi ${(totalExpense - budget.amount).toFixed(2)} TL aştınız!`;
    } else if (dailyLimit <= 0) {
      recommendation = 'Hedefine ulaştın! Artık harcama yapmamalısın.';
    } else {
      recommendation = `Hedefine ulaşmak için günde ${dailyLimit.toFixed(2)} TL harcayabilirsin!`;
    }

    res.json({
      budget: {
        total: budget.amount,
        period: budget.period,
        startDate: budget.startDate,
        endDate: budget.endDate,
        type: budget.type
      },
      spent: totalExpense,
      remaining: remainingBudget,
      remainingDays,
      dailyLimit: Math.max(0, dailyLimit),
      completionPercentage: Math.min(100, completionPercentage),
      isOverBudget,
      recommendation
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      error: 'Hesaplama sırasında hata oluştu' 
    });
  }
};

// Hedef güncelle
exports.updateBudget = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { amount, period, startDate, type, isActive } = req.body;

    // Bitiş tarihini hesapla
    let endDate;
    if (period && startDate) {
      const start = new Date(startDate);
      switch(period) {
        case 'gunluk':
          endDate = new Date(start);
          endDate.setDate(endDate.getDate() + 1);
          break;
        case 'haftalik':
          endDate = new Date(start);
          endDate.setDate(endDate.getDate() + 7);
          break;
        case 'aylik':
          endDate = new Date(start);
          endDate.setMonth(endDate.getMonth() + 1);
          break;
      }
    }

    const updateData = {};
    if (amount) updateData.amount = amount;
    if (period) updateData.period = period;
    if (startDate) updateData.startDate = startDate;
    if (endDate) updateData.endDate = endDate;
    if (type) updateData.type = type;
    if (typeof isActive !== 'undefined') updateData.isActive = isActive;

    const budget = await Budget.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!budget) {
      return res.status(404).json({ 
        error: 'Hedef bulunamadı' 
      });
    }

    res.json({
      message: 'Hedef güncellendi',
      budget
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Hedef güncellenirken hata oluştu' 
    });
  }
};

// Hedef sil
exports.deleteBudget = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const budget = await Budget.findOneAndDelete({ 
      _id: id, 
      userId 
    });

    if (!budget) {
      return res.status(404).json({ 
        error: 'Hedef bulunamadı' 
      });
    }

    res.json({
      message: 'Hedef silindi'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Hedef silinirken hata oluştu' 
    });
  }
};