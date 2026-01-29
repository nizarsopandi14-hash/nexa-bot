const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

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
    console.log(`🚀 Website online di port ${port}`);
});

// Fungsi pembersih tanda kutip otomatis
const token = process.env.TOKEN ? process.env.TOKEN.replace(/['"]+/g, '') : '';

client.login(token).catch(err => {
    console.error("❌ Gagal Login: Token tidak valid atau ada tanda kutip.");
});