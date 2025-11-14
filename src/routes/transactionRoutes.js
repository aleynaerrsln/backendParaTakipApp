// backend/src/routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

// Özet bilgileri getir (Gelir/Gider/Bakiye) - Tarih filtreli
router.get('/summary', auth, async (req, res) => {
  try {
    console.log('📊 Summary isteği geldi, userId:', req.user.userId);
    
    const userId = req.user.userId;
    const { startDate, endDate, filter } = req.query;

    let matchQuery = { userId: userId };

    // Tarih filtresi varsa ekle
    if (startDate && endDate) {
      matchQuery.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (filter) {
      const now = new Date();
      let start;

      switch (filter) {
        case 'today':
          start = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          start = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          start = new Date(now.getFullYear(), 0, 1);
          break;
      }

      if (start) {
        matchQuery.date = { $gte: start };
      }
    }

    // Toplam gelir
    const incomeResult = await Transaction.aggregate([
      { $match: { ...matchQuery, type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalIncome = incomeResult.length > 0 ? incomeResult[0].total : 0;

    // Toplam gider
    const expenseResult = await Transaction.aggregate([
      { $match: { ...matchQuery, type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalExpense = expenseResult.length > 0 ? expenseResult[0].total : 0;

    // Bakiye
    const balance = totalIncome - totalExpense;

    console.log('✅ Summary başarılı:', { totalIncome, totalExpense, balance });

    res.json({
      totalIncome,
      totalExpense,
      balance
    });
  } catch (error) {
    console.error('❌ Özet hatası:', error);
    res.status(500).json({ error: 'Özet bilgileri alınamadı' });
  }
});

// Tüm işlemleri getir (tarih filtreli)
router.get('/', auth, async (req, res) => {
  try {
    console.log('📋 Transactions isteği geldi, userId:', req.user.userId);
    
    const userId = req.user.userId;
    const { startDate, endDate, filter } = req.query;

    let query = { userId };

    // Tarih filtresi varsa ekle
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (filter) {
      // Hazır filtreler (bugün, bu hafta, bu ay)
      const now = new Date();
      let start;

      switch (filter) {
        case 'today':
          start = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          start = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          start = new Date(now.getFullYear(), 0, 1);
          break;
      }

      if (start) {
        query.date = { $gte: start };
      }
    }

    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .limit(100);

    console.log('✅ Transactions başarılı, adet:', transactions.length);

    res.json(transactions);
  } catch (error) {
    console.error('❌ İşlemler hatası:', error);
    res.status(500).json({ error: 'İşlemler alınamadı' });
  }
});

// Yeni işlem ekle
router.post('/', auth, async (req, res) => {
  try {
    console.log('➕ Yeni işlem ekleme isteği:', req.body);
    
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

    console.log('✅ İşlem eklendi:', transaction._id);

    res.status(201).json({
      message: 'İşlem eklendi',
      transaction
    });
  } catch (error) {
    console.error('❌ İşlem ekleme hatası:', error);
    res.status(500).json({ error: 'İşlem eklenemedi' });
  }
});

// İşlem güncelle
router.put('/:id', auth, async (req, res) => {
  try {
    console.log('✏️ İşlem güncelleme isteği:', req.params.id);
    
    const userId = req.user.userId;
    const transactionId = req.params.id;
    const { description, amount, type, category } = req.body;

    // İşlemi bul
    const transaction = await Transaction.findOne({ 
      _id: transactionId, 
      userId 
    });

    if (!transaction) {
      return res.status(404).json({ error: 'İşlem bulunamadı' });
    }

    // Güncelle
    if (description) transaction.description = description;
    if (amount) transaction.amount = amount;
    if (type) transaction.type = type;
    if (category) transaction.category = category;

    await transaction.save();

    console.log('✅ İşlem güncellendi:', transactionId);

    res.json({
      message: 'İşlem güncellendi',
      transaction
    });
  } catch (error) {
    console.error('❌ İşlem güncelleme hatası:', error);
    res.status(500).json({ error: 'İşlem güncellenemedi' });
  }
});

// İşlem sil
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('🗑️ İşlem silme isteği:', req.params.id);
    
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

    console.log('✅ İşlem silindi:', transactionId);

    res.json({ message: 'İşlem silindi' });
  } catch (error) {
    console.error('❌ İşlem silme hatası:', error);
    res.status(500).json({ error: 'İşlem silinemedi' });
  }
});

// Kategori bazlı harcama özeti (Pasta grafik için)
router.get('/category-summary', auth, async (req, res) => {
  try {
    console.log('📊 Kategori özeti isteği');
    
    const userId = req.user.userId;
    const { startDate, endDate, type } = req.query;

    let matchQuery = { userId: userId };

    // Sadece gider veya gelir
    if (type) {
      matchQuery.type = type;
    }

    // Tarih filtresi
    if (startDate && endDate) {
      matchQuery.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Kategoriye göre grupla
    const categoryData = await Transaction.aggregate([
      { $match: matchQuery },
      { 
        $group: { 
          _id: '$category', 
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        } 
      },
      { $sort: { total: -1 } }
    ]);

    console.log('✅ Kategori özeti:', categoryData);

    res.json(categoryData);
  } catch (error) {
    console.error('❌ Kategori özeti hatası:', error);
    res.status(500).json({ error: 'Kategori özeti alınamadı' });
  }
});

// Aylık trend (Çizgi grafik için)
router.get('/monthly-trend', auth, async (req, res) => {
  try {
    console.log('📈 Aylık trend isteği');
    
    const userId = req.user.userId;
    const { months } = req.query;
    const monthCount = parseInt(months) || 6;

    // Son X ayın verisi
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthCount);

    const trendData = await Transaction.aggregate([
      { 
        $match: { 
          userId: userId,
          date: { $gte: startDate }
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    console.log('✅ Aylık trend:', trendData);

    res.json(trendData);
  } catch (error) {
    console.error('❌ Aylık trend hatası:', error);
    res.status(500).json({ error: 'Aylık trend alınamadı' });
  }
});
// İstatistikler (Statistics)
router.get('/statistics', auth, async (req, res) => {
  try {
    console.log('📊 İstatistik isteği');
    
    const userId = req.user.userId;

    // Bugünün tarihi
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Toplam işlem sayısı
    const totalTransactions = await Transaction.countDocuments({ userId });

    // En çok harcama yapılan kategoriler (Top 5)
    const topCategories = await Transaction.aggregate([
      { $match: { userId: userId, type: 'expense' } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ]);

    // Günlük ortalama harcama
    const dailyExpenses = await Transaction.aggregate([
      { $match: { userId: userId, type: 'expense', date: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const dailyAverage = dailyExpenses.length > 0 ? dailyExpenses[0].total : 0;

    // Haftalık ortalama harcama
    const weeklyExpenses = await Transaction.aggregate([
      { $match: { userId: userId, type: 'expense', date: { $gte: weekStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const weeklyAverage = weeklyExpenses.length > 0 ? weeklyExpenses[0].total / 7 : 0;

    // Aylık ortalama harcama (bu ay)
    const monthlyExpenses = await Transaction.aggregate([
      { $match: { userId: userId, type: 'expense', date: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const currentMonthTotal = monthlyExpenses.length > 0 ? monthlyExpenses[0].total : 0;

    // Geçen ay toplam
    const lastMonthExpenses = await Transaction.aggregate([
      { $match: { userId: userId, type: 'expense', date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const lastMonthTotal = lastMonthExpenses.length > 0 ? lastMonthExpenses[0].total : 0;

    // En büyük gelir
    const biggestIncome = await Transaction.findOne({ userId, type: 'income' }).sort({ amount: -1 });

    // En büyük gider
    const biggestExpense = await Transaction.findOne({ userId, type: 'expense' }).sort({ amount: -1 });

    const statistics = {
      totalTransactions,
      topCategories,
      dailyAverage,
      weeklyAverage,
      currentMonthTotal,
      lastMonthTotal,
      monthComparison: currentMonthTotal - lastMonthTotal,
      biggestIncome: biggestIncome ? biggestIncome.amount : 0,
      biggestExpense: biggestExpense ? biggestExpense.amount : 0
    };

    console.log('✅ İstatistikler:', statistics);

    res.json(statistics);
  } catch (error) {
    console.error('❌ İstatistik hatası:', error);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

module.exports = router;