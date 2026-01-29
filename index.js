const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// FIX: Menggunakan __dirname agar tidak error di Railway
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index'); 
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Website aktif di port ${port}`);
});

// Auto-clean token dari tanda kutip
const token = (process.env.TOKEN || '').replace(/['"]+/g, '');

client.login(token).catch(err => {
    console.error("❌ LOGIN GAGAL: Periksa TOKEN di tab Variables!");
});