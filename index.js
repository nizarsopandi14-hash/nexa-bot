const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// MENCARI FOLDER VIEWS SECARA OTOMATIS
const possibleViewsPath = path.join(__dirname, 'views');
if (fs.existsSync(possibleViewsPath)) {
    app.set('views', possibleViewsPath);
    console.log("✅ Folder views ditemukan di:", possibleViewsPath);
} else {
    console.error("❌ ERROR: Folder views tidak ditemukan!");
}

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// ROUTE UTAMA
app.get('/', (req, res) => {
    res.render('index', (err, html) => {
        if (err) {
            console.error("❌ Gagal render index.ejs:", err.message);
            // Jika index gagal, coba paksa buka lobby_discord
            return res.render('lobby_discord', (err2, html2) => {
                if (err2) return res.status(500).send("File index.ejs dan lobby_discord.ejs tidak ditemukan di folder views.");
                res.send(html2);
            });
        }
        res.send(html);
    });
});

app.get('/dasboard', (req, res) => res.render('dasboard'));

// LOGIN BOT DISCORD
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const token = (process.env.TOKEN || '').replace(/['"]+/g, '');

if (token) {
    client.login(token).catch(e => console.error("❌ Token salah atau expired"));
}

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${port}`);
});