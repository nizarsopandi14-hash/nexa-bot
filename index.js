const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Setup EJS dan Static Files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Route Navigasi Website
app.get('/', (req, res) => res.render('index'));
app.get('/lobby_discord', (req, res) => res.render('lobby_discord'));
app.get('/dasboard', (req, res) => res.render('dasboard'));

// Setup Discord Bot
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.on('ready', () => {
    console.log(`✅ DISCORD: ${client.user.tag} Online!`);
});

// Jalankan Server
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 WEBSITE: Berjalan di port ${port}`);
});

// Login Aman (Auto-clean tanda kutip)
const token = (process.env.TOKEN || '').replace(/['"]+/g, '');
if (token) {
    client.login(token).catch(() => console.error("❌ TOKEN SALAH!"));
}