// src/routes/budgetRoutes.js
const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const authMiddleware = require('../middleware/auth');

// Tüm route'lar authentication gerektirir
router.use(authMiddleware);

// POST /api/budgets - Hedef oluştur
router.post('/', budgetController.createBudget);

// GET /api/budgets - Hedefleri listele
router.get('/', budgetController.getBudgets);

// GET /api/budgets/active - Aktif hedefi getir
router.get('/active', budgetController.getActiveBudget);

// GET /api/budgets/calculate - Günlük bütçe hesapla
router.get('/calculate', budgetController.calculateDailyBudget);

// PUT /api/budgets/:id - Hedef güncelle
router.put('/:id', budgetController.updateBudget);

// DELETE /api/budgets/:id - Hedef sil
router.delete('/:id', budgetController.deleteBudget);

module.exports = router;