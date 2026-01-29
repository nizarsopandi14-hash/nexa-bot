require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');

const app = express();
const port = 3000;

// --- CONFIGURATION ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(session({ 
    secret: 'nexa-secret-123', 
    resave: false, 
    saveUninitialized: true 
}));

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // PENTING untuk list Role/Channel
    ] 
});

// --- ROUTES ---

// Step 1: Login Email (Lobby)
app.get('/', (req, res) => {
    res.render('lobby_email'); 
});

// Step 2: Login Discord (Lobby1)
app.get('/lobby1', (req, res) => {
    res.render('lobby_discord');
});

app.get('/login', (req, res) => {
    const url = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
    res.redirect(url);
});

app.get('/auth/discord', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('/');
    try {
        const params = new URLSearchParams({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.REDIRECT_URI,
        });
        const tokenRes = await axios.post('https://discord.com/api/oauth2/token', params);
        const userRes = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenRes.data.access_token}` }
        });
        req.session.user = userRes.data;
        res.redirect('/dashboard');
    } catch (e) {
        res.send("Gagal Login Discord. Cek console!");
    }
});

// API untuk ambil data Channel & Role saat server dipilih
app.get('/api/server-data/:guildId', async (req, res) => {
    try {
        const guild = client.guilds.cache.get(req.params.guildId);
        if (!guild) return res.json({ channels: [], roles: [] });

        const channels = guild.channels.cache
            .filter(c => c.type === 0) // Text Channels
            .map(c => ({ id: c.id, name: c.name }));

        const roles = guild.roles.cache
            .filter(r => r.name !== '@everyone')
            .map(r => ({ id: r.id, name: r.name }));

        res.json({ channels, roles });
    } catch (err) {
        res.status(500).json({ error: "Gagal mengambil data server" });
    }
});

app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/lobby1');
    const myServers = client.guilds.cache.filter(g => g.ownerId === process.env.OWNER_ID);
    
    res.render('dashboard', {
        user: req.session.user,
        servers: myServers,
        leaderboard: [] 
    });
});

client.once('ready', () => {
    console.log(`✅ Nexa Ready: http://localhost:${port}`);
});

// Ganti baris login kamu menjadi seperti ini:
client.login(process.env.TOKEN).catch(err => {
    console.error("Gagal Login! Pastikan TOKEN di Variables Railway sudah benar.");
});