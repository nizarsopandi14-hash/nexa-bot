require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const DiscordStrategy = require('passport-discord').Strategy;

const app = express();

// --- KONFIGURASI EXPRESS ---
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'nexa_secret_key',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// --- MOCK DATABASE (Ganti dengan MongoDB/PostgreSQL nanti) ---
const users = []; 

// --- STRATEGI 1: LOGIN EMAIL (LOCAL) ---
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    // Logika cari user di DB
    let user = users.find(u => u.email === email);
    if (!user) {
        user = { id: Date.now(), email: email, discordId: null };
        users.push(user);
    }
    return done(null, user);
}));

// --- STRATEGI 2: LOGIN DISCORD ---
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: "https://nexa-bot-production.up.railway.app/auth/discord/callback",
    scope: ['identify', 'email']
}, (accessToken, refreshToken, profile, done) => {
    // Data Discord profile.id disimpan ke user yang sedang login
    return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// --- MIDDLEWARE PROTEKSI ---
function checkAuth(req, res, next) {
    if (!req.isAuthenticated()) return res.redirect('/login');
    next();
}

function checkDiscord(req, res, next) {
    // Cek apakah di session sudah ada data discord
    if (!req.user.discordId && !req.session.discordProfile) {
        return res.redirect('/connect-discord');
    }
    next();
}

// --- ROUTES ---

// 1. Halaman Login Email
app.get('/login', (req, res) => res.send('<h2>Login Email</h2><form action="/login" method="POST"><input name="email" placeholder="Email" required><button>Next</button></form>'));

app.post('/login', passport.authenticate('local', {
    successRedirect: '/connect-discord',
    failureRedirect: '/login'
}));

// 2. Halaman Jembatan ke Discord
app.get('/connect-discord', checkAuth, (req, res) => {
    res.send('<h2>Email Berhasil!</h2><p>Sekarang hubungkan Discord Anda:</p><a href="/auth/discord">Klik Login Discord</a>');
});

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    // Simpan profil discord ke session user
    req.session.discordProfile = req.user; 
    res.redirect('/dashboard');
});

// 3. DASHBOARD (Hanya bisa diakses jika Email & Discord OK)
app.get('/dashboard', checkAuth, checkDiscord, (req, res) => {
    res.send(`
        <h1>Selamat Datang di Dashboard Nexa!</h1>
        <p>Email: ${req.user.email || 'Terverifikasi'}</p>
        <p>Discord ID: ${req.session.discordProfile.id}</p>
        <a href="/logout">Logout</a>
    `);
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/login'));
});

app.listen(process.env.PORT || 3000, () => console.log("Nexa Bot Web Running..."));