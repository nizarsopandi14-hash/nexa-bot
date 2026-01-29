const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Paksa Express mencari folder views secara absolut
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    // Coba render index, jika gagal pindah ke lobby_discord
    res.render('index', (err, html) => {
        if (err) {
            console.error("DEBUG: index.ejs tidak ketemu, mencoba lobby_discord...");
            return res.render('lobby_discord', (err2, html2) => {
                if (err2) return res.status(500).send("Semua file views hilang!");
                res.send(html2);
            });
        }
        res.send(html);
    });
});

app.get('/dasboard', (req, res) => res.render('dasboard'));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Bersihkan TOKEN dari tanda kutip otomatis
const token = (process.env.TOKEN || '').replace(/['"]+/g, '');

if (token) {
    client.login(token).catch(e => console.error("❌ Login Gagal"));
}

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server on port ${port}`);
});