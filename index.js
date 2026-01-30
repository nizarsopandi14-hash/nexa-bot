require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
const port = process.env.PORT || 3000;

// --- 1. KONFIGURASI EXPRESS ---
app.set('view engine', 'ejs'); // Pastikan Anda punya folder 'views'
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'nexa_bot_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set true jika menggunakan HTTPS penuh
}));

app.use(passport.initialize());
app.use(passport.session());

// --- 2. MOCK DATABASE (Simulasi) ---
// Di produksi, gunakan MongoDB atau PostgreSQL
const users = []; 

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Inisialisasi Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Contoh fungsi chat di bot Discord
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith("!ask")) {
        const prompt = message.content.replace("!ask ", "");
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            message.reply(response.text());
        } catch (error) {
            console.error("Gemini Error:", error);
            message.reply("Aduh, otak AI-ku lagi konslet nih.");
        }
    }
});

// --- 3. PASSPORT SERIALIZATION ---
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// --- 4. STRATEGI LOGIN EMAIL (LOKAL) ---
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    // Simulasi: Jika user belum ada, buat baru. Jika ada, login.
    let user = users.find(u => u.email === email);
    if (!user) {
        user = { id: Date.now(), email: email, discordId: null };
        users.push(user);
    }
    return done(null, user);
}));

// --- 5. STRATEGI LOGIN DISCORD ---
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: "https://nexa-bot-production.up.railway.app/auth/discord/callback",
    scope: ['identify', 'email']
}, (accessToken, refreshToken, profile, done) => {
    // Profile mengandung ID Discord user
    return done(null, profile);
}));

// --- 6. MIDDLEWARE PROTEKSI ---
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
}

// --- 7. ROUTES ---

// Halaman Utama / Login Email
app.get('/login', (req, res) => {
    res.send(`
        <h1>Nexa Bot Login</h1>
        <form action="/login" method="POST">
            <input type="email" name="email" placeholder="Masukkan Email" required>
            <input type="password" name="password" placeholder="Password" required>
            <button type="submit">Lanjut ke Discord</button>
        </form>
    `);
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/auth/discord',
    failureRedirect: '/login'
}));

// Route Login Discord
app.get('/auth/discord', passport.authenticate('discord'));

// Route Callback Discord (PENTING: Harus sama dengan di Discord Dev Portal)
app.get('/auth/discord/callback', 
    passport.authenticate('discord', { failureRedirect: '/login' }), 
    (req, res) => {
        res.redirect('/dashboard');
    }
);

// Halaman Dashboard
app.get('/dashboard', isAuthenticated, (req, res) => {
    // req.user di sini berisi data dari Discord setelah callback sukses
    res.send(`
        <h1>Dashboard Nexa Bot</h1>
        <p>Halo, <strong>${req.user.username}#${req.user.discriminator}</strong></p>
        <p>ID Discord Anda: ${req.user.id}</p>
        <hr>
        <p>Status Bot: Online 🚀</p>
        <a href="/logout">Logout</a>
    `);
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/login'));
});

// --- 8. BOT DISCORD LOGIC ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const token = process.env.TOKEN;

if (token) {
    client.login(token).catch(err => console.log("Token Bot Salah:", err));
}

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server berjalan di port ${port}`);
});

