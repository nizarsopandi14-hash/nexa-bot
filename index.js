const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Set view engine
app.set('view engine', 'ejs');

// INI KUNCINYA: Mencoba mencari folder views di berbagai lokasi
const paths = [
    path.join(__dirname, 'views'),
    path.join(__dirname, '..', 'views'),
    path.join(process.cwd(), 'views')
];

app.get('/', (req, res) => {
    // Kita coba render 'lobby_discord' saja dulu karena tadi 'index' bermasalah
    res.render('lobby_discord', (err, html) => {
        if (err) {
            // Jika lobby_discord juga gagal, kita tampilkan semua file yang terdeteksi
            console.error("❌ Semua file view gagal dimuat:", err.message);
            return res.status(500).send(`
                <h1>File Tidak Ditemukan!</h1>
                <p>Error: ${err.message}</p>
                <p>Pastikan file .ejs ada di dalam folder bernama <b>views</b></p>
            `);
        }
        res.send(html);
    });
});

app.get('/auth/discord', (req, res) => {
    // GANTI link di bawah ini dengan link OAuth2 dari Discord Developer Portal kamu
    const discordInviteUrl = "https://nexa-bot-production.up.railway.app/auth/discord";
    
    res.redirect(discordInviteUrl);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server on port ${port}`);
});

// Login Bot (Simple)
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const token = (process.env.TOKEN || '').replace(/['"]+/g, '');

if (token) client.login(token).catch(() => {});
