require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
const { Client, GatewayIntentBits } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- 1. INISIALISASI CLIENT & AI (WAJIB DI ATAS) ---
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

// --- 2. MOCK DATABASE ---
const users = []; 

// --- 3. KONFIGURASI EXPRESS & SESSION ---
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'nexa_bot_ultra_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Railway biasanya handle SSL di proxy, jadi false aman
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// --- 4. STRATEGI AUTHENTIKASI ---

// Email Login
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    let user = users.find(u => u.email === email);
    if (!user) {
        user = { id: Date.now(), email: email, discordId: null };
        users.push(user);
    }
    return done(null, user);
}));

// Discord Login
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: "https://nexa-bot-production.up.railway.app/auth/discord/callback",
    scope: ['identify', 'email']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

// --- 5. MIDDLEWARE PROTEKSI ---
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
}

// --- 6. ROUTES WEB ---

app.get('/login', (req, res) => {
    res.send(`
        <body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #1a1a1a; color: white;">
            <div style="background: #2a2a2a; padding: 2rem; border-radius: 10px; text-align: center;">
                <h1>Nexa Login</h1>
                <form action="/login" method="POST" style="display: flex; flex-direction: column; gap: 10px;">
                    <input type="email" name="email" placeholder="Email" required style="padding: 10px;">
                    <input type="password" name="password" placeholder="Password" required style="padding: 10px;">
                    <button type="submit" style="padding: 10px; background: #5865F2; color: white; border: none; cursor: pointer;">Next to Discord</button>
                </form>
            </div>
        </body>
    `);
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/auth/discord',
    failureRedirect: '/login'
}));

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', 
    passport.authenticate('discord', { failureRedirect: '/login' }), 
    (req, res) => res.redirect('/dashboard')
);

app.get('/dashboard', isAuthenticated, (req, res) => {
    res.send(`
        <body style="font-family: sans-serif; padding: 20px; background: #1a1a1a; color: white;">
            <h1>🚀 Nexa Dashboard</h1>
            <p>Welcome, <strong>${req.user.username}</strong></p>
            <p>ID: ${req.user.id}</p>
            <div style="background: #23272a; padding: 15px; border-radius: 5px;">
                <h3>Bot Status: <span style="color: #3ba55c;">Online</span></h3>
            </div>
            <br>
            <a href="/logout" style="color: #ff4747;">Logout</a>
        </body>
    `);
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/login'));
});

// --- 7. LOGIKA BOT DISCORD & GEMINI ---
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith("!ask")) {
        const prompt = message.content.replace("!ask ", "");
        try {
            const result = await model.generateContent(prompt);
            const response = result.response;
            message.reply(response.text());
        } catch (error) {
            console.error("Gemini Error:", error);
            message.reply("Maaf, ada kendala saat menghubungi otak AI.");
        }
    }
});

// --- 8. START SEMUA ---
const token = process.env.TOKEN;
if (token) {
    client.login(token).catch(err => console.log("Gagal login bot:", err));
}

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server nexa-bot ready di port ${port}`);
});
