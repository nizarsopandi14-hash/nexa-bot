const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const play = require('play-dl');
const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- DATABASE DUMMY (Ganti dengan Database asli nanti) ---
const users = []; 

// --- BOT DISCORD ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates]
});

// --- PASSPORT CONFIG ---
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// 1. Login Discord
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: ['identify']
}, (at, rt, profile, done) => done(null, profile)));

// 2. Login Email (Local)
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    const user = users.find(u => u.email === email);
    if (!user) return done(null, false, { message: 'Email tidak terdaftar' });
    if (!bcrypt.compareSync(password, user.password)) return done(null, false, { message: 'Password salah' });
    return done(null, user);
}));

// --- EXPRESS SETUP ---
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(session({ 
    secret: 'nexa_ultra_secret', 
    resave: false, 
    saveUninitialized: false,
    cookie: { secure: false } 
}));
app.use(passport.initialize());
app.use(passport.session());

// --- ROUTES ---
app.get('/', (req, res) => res.render('index', { user: req.user }));

// Route Login Discord
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/dashboard'));

// Route Login Email
app.post('/login-email', passport.authenticate('local', {
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

// --- MUSIC BOT COMMAND ---
client.on('messageCreate', async (msg) => {
    if (msg.content.startsWith('!play')) {
        const url = msg.content.split(' ')[1];
        if (!url || !msg.member.voice.channel) return;
        const connection = joinVoiceChannel({
            channelId: msg.member.voice.channel.id,
            guildId: msg.guild.id,
            adapterCreator: msg.guild.voiceAdapterCreator,
        });
        const stream = await play.stream(url);
        const player = createAudioPlayer();
        player.play(createAudioResource(stream.stream, { inputType: stream.type }));
        connection.subscribe(player);
        msg.reply('🎶 Nexa Playing!');
    }
});

client.login(process.env.DISCORD_TOKEN).catch(() => console.log("Token Bot Salah!"));
app.listen(PORT, () => console.log(`Nexa Online on ${PORT}`));
    console.log(`✅ Nexa Web aktif di https://nexa-bot-production.up.railway.app`);
});



