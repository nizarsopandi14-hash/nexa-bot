const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Pakai __dirname agar folder views terbaca
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
    console.log(`🚀 Server aktif di port ${port}`);
});

// Bersihkan token dari tanda kutip otomatis
const token = (process.env.TOKEN || '').replace(/['"]+/g, '');

if (token) {
    client.login(token).catch(err => console.error("❌ Gagal Login!"));
} else {
    console.error("❌ TOKEN kosong di Variables!");
}