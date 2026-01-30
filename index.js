const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const play = require('play-dl');
const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// --- VALIDASI FOLDER ---
const viewsPath = path.join(__dirname, 'views');
console.log(`Target folder views: ${viewsPath}`);

// --- BOT SETUP ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates]
});

// --- EXPRESS CONFIG ---
app.set('view engine', 'ejs');
app.set('views', viewsPath);
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'nexa_secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: ['identify', 'guilds']
}, (at, rt, profile, done) => done(null, profile)));

// --- ROUTES ---
app.get('/', (req, res) => {
    res.render('index', { user: req.user || null });
});

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { 
    successRedirect: '/dashboard', 
    failureRedirect: '/' 
}));

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');
    res.render('dashboard', { user: req.user });
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

// --- START SERVER ---
client.login(process.env.DISCORD_TOKEN).then(() => {
    console.log("✅ Bot Terhubung!");
}).catch(err => {
    console.log("❌ Bot Gagal Login: " + err.message);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server aktif di port ${PORT}`);
});
