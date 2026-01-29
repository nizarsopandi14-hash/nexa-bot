const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// FIX: Gunakan path.resolve agar lokasi folder VIEWS absolut
const viewsPath = path.resolve(__dirname, 'views');
app.set('view engine', 'ejs');
app.set('views', viewsPath);

// Sajikan file statis (CSS/Gambar)
app.use(express.static(path.resolve(__dirname, 'public')));

app.get('/', (req, res) => {
    // Render index.ejs
    res.render('index', (err, html) => {
        if (err) {
            console.error("❌ Gagal render index:", err.message);
            // Jika index.ejs hilang, coba lempar ke lobby_discord sebagai cadangan
            return res.render('lobby_discord'); 
        }
        res.send(html);
    });
});

// Tambahkan route lain agar tidak 404
app.get('/dasboard', (req, res) => res.render('dasboard'));
app.get('/lobby_discord', (req, res) => res.render('lobby_discord'));

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// Login Bot & Jalankan Server
const token = (process.env.TOKEN || '').replace(/['"]+/g, '');
if (token) {
    client.login(token).catch(err => console.error("❌ Login Gagal"));
}

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server on port ${port}`);
});