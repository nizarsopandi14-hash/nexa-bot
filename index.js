const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000; // Railway akan mengisi ini otomatis

// Setup folder views dan public agar website bisa tampil
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Route utama website kamu
app.get('/', (req, res) => {
    res.render('index'); // Membuka file views/index.ejs
});

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
    console.log(`✅ Bot ${client.user.tag} sukses meluncur!`);
});

// Jalankan Server Dashboard
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Dashboard Nexa aktif di port ${port}`);
});

// Login menggunakan TOKEN dari Variables Railway
client.login(process.env.TOKEN).catch(err => {
    console.error("❌ Gagal Login! Cek TOKEN di tab Variables Railway kamu.");
});