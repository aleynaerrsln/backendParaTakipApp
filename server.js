// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./src/routes/authRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const budgetRoutes = require('./src/routes/budgetRoutes');

const app = express();

// Ayarlar (direkt kod içinde)
const PORT = 5000;
const MONGODB_URI = 'mongodb+srv://aleynaerarslan2002_db_user:w8FoNXdT21IAF082@cluster0.8btcgjl.mongodb.net/para-takip-app?appName=Cluster0';

// JWT_SECRET'ı global olarak tanımla (middleware'ler için)
global.JWT_SECRET = 'super-gizli-anahtar-123456789';

// EMAIL AYARLARI - YENİ EKLENEN
global.EMAIL_CONFIG = {
  user: 'aleyna.erarslan2002@gmail.com',
  pass: 'uvqn qgxf pcxx mwuf'
};

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB bağlantısı
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB bağlandı'))
  .catch(err => console.error('❌ MongoDB hata:', err));

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Para Takip API çalışıyor! 🚀',
    status: 'success'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);

// Server başlat
app.listen(PORT, () => {
  console.log(`🚀 Server çalışıyor: http://localhost:${PORT}`);
});