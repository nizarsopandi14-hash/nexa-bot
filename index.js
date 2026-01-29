const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const path = require('path');
const session = require('express-session');

// Setup Express untuk Dashboard
const app = express();
const port = process.env.PORT || 3000;

// PERBAIKAN: Menggunakan __dirname agar tidak ReferenceError
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Setup Session (Penting untuk dashboard yang butuh login)
app.use(session({
    secret: 'nexa-secret',
    resave: false,
    saveUninitialized: false
}));

// Route Utama Website
app.get('/', (req, res) => {
    res.render('index'); 
});

// Setup Discord Bot dengan Intents Lengkap
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers
    ]
});

client.on('ready', () => {
    console.log(`✅ DISCORD: ${client.user.tag} siap digunakan!`);
});

// Jalankan Server HTTP (Website)
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 WEBSITE: Dashboard Nexa berjalan di port ${port}`);
});

// Kode ini akan otomatis membersihkan tanda kutip jika tidak sengaja terbaca
const cleanToken = process.env.TOKEN ? process.env.TOKEN.replace(/['"]+/g, '') : null;

if (!cleanToken) {
    console.error("❌ ERROR: TOKEN tidak ditemukan di Variables Railway!");
} else {
    client.login(cleanToken).catch(err => {
        console.error("❌ ERROR LOGIN: Token salah atau tidak valid!");
    });
}