require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- 1. INISIALISASI BOT & AI ---
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const app = express();
const port = process.env.PORT || 3000;

// --- 2. KONFIGURASI EXPRESS ---
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'nexa_ultra_secret',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// --- 3. STRATEGI AUTH (EMAIL & DISCORD) ---
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    // Database sementara
    const user = { id: Date.now(), email: email };
    return done(null, user);
}));

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: "https://nexa-bot-production.up.railway.app/auth/discord/callback",
    scope: ['identify', 'email']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

// --- 4. ROUTES ---

app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
    res.send(`
        <body style="background:#1a1a1a; color:white; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh;">
            <div style="background:#2a2a2a; padding:30px; border-radius:10px; text-align:center;">
                <h2>Nexa Login (Step 1: Email)</h2>
                <form action="/login" method="POST" style="display:flex; flex-direction:column; gap:10px;">
                    <input name="email" type="email" placeholder="Email" required style="padding:10px;">
                    <input name="password" type="password" placeholder="Password" required style="padding:10px;">
                    <button type="submit" style="padding:10px; background:#5865F2; color:white; border:none; cursor:pointer;">Login & Link Discord</button>
                </form>
            </div>
        </body>
    `);
});

app.post('/login', passport.authenticate('local', { successRedirect: '/auth/discord', failureRedirect: '/login' }));

// Route ini sekarang pakai Passport, tidak redirect manual lagi (anti-loop)
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', passport.authenticate('discord', {
    successRedirect: '/dashboard',
    failureRedirect: '/login'
}));

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    res.send(`<h1>Selamat Datang ${req.user.username}!</h1><p>Bot Nexa sedang aktif.</p><a href="/logout">Logout</a>`);
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/login'));
});

// --- 5. LOGIKA BOT AI ---
client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.content.startsWith("!ask")) return;
    const prompt = message.content.replace("!ask ", "");
    try {
        const result = await model.generateContent(prompt);
        message.reply(result.response.text());
    } catch (e) { message.reply("Gagal konek ke AI."); }
});

client.login(process.env.TOKEN).catch(() => console.log("Token Bot Error"));
app.listen(port, '0.0.0.0', () => console.log("Server Ready!"));
