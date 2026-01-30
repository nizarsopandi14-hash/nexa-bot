const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Database Dummy
const users = [{ email: "admin@nexa.com", password: bcrypt.hashSync("nexa123", 10), username: "Nexa Admin" }];
const guildPlayers = new Map();

// --- DISCORD BOT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// --- PASSPORT CONFIG ---
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: ['identify', 'guilds']
}, (at, rt, profile, done) => {
    return done(null, { id: profile.id, username: profile.username, avatar: profile.avatar });
}));

// --- EXPRESS SETTINGS ---
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: 'nexa_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());

const isAuthenticated = (req, res, next) => req.isAuthenticated() ? next() : res.redirect('/');

// --- ROUTES ---
app.get('/', (req, res) => res.render('index', { user: req.user }));
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/dashboard'));
app.get('/dashboard', isAuthenticated, (req, res) => res.render('dashboard', { user: req.user }));
app.get('/logout', (req, res) => req.logout(() => res.redirect('/')));

// API untuk ambil daftar Server
app.get('/api/guilds', isAuthenticated, (req, res) => {
    const guilds = client.guilds.cache.map(g => ({ id: g.id, name: g.name }));
    res.json(guilds);
});

// --- SOCKET.IO LOGIC ---
io.on('connection', (socket) => {
    socket.on('joinGuild', async (guildId) => {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;
        const channels = guild.channels.cache.filter(c => c.type === 2).map(c => ({ id: c.id, name: c.name }));
        socket.emit('voiceChannels', channels);
    });

    socket.on('playSongWeb', async ({ guildId, voiceChannelId, query }) => {
        const guild = client.guilds.cache.get(guildId);
        const channel = guild.channels.cache.get(voiceChannelId);
        
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });

        const player = createAudioPlayer();
        const search = await play.search(query, { limit: 1 });
        const stream = await play.stream(search[0].url);
        const resource = createAudioResource(stream.stream, { inputType: stream.type });

        player.play(resource);
        connection.subscribe(player);
        socket.emit('musicStatus', `Playing: ${search[0].title}`);
    });
});

// --- RUN ---
client.login(process.env.DISCORD_TOKEN).then(() => {
    console.log("✅ Bot Nexa Ready");
}).catch(() => console.log("❌ Token Salah"));

server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server Nexa jalan di port ${PORT}`);
});
