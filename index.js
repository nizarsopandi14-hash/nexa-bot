const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Inisialisasi Bot Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Konfigurasi Passport (Login Discord)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));

// Express Middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(session({
    secret: 'nexa_secret_key',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// --- ROUTES WEBSITE ---
app.get('/', (req, res) => {
    res.render('index', { user: req.user });
});

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => {
    res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');
    res.render('dashboard', { user: req.user });
});

app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
});

// --- BOT COMMANDS (UPGRADE MUSIC LINK) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        const url = args[0];
        if (!url) return message.reply('❌ Masukkan link musiknya!');

        const channel = message.member.voice.channel;
        if (!channel) return message.reply('❌ Kamu harus di Voice Channel!');

        try {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            // Mendukung YouTube & Spotify link via play-dl
            let stream = await play.stream(url);
            const resource = createAudioResource(stream.stream, { inputType: stream.type });
            const player = createAudioPlayer();

            player.play(resource);
            connection.subscribe(player);

            message.reply(`🎶 **Nexa AI** sedang memutar: ${url}`);

            player.on(AudioPlayerStatus.Idle, () => {
                setTimeout(() => {
                    if (player.state.status === AudioPlayerStatus.Idle) connection.destroy();
                }, 300000); // Cabut setelah 5 menit idle
            });

        } catch (err) {
            console.error(err);
            message.reply('❌ Error memproses link tersebut.');
        }
    }
});

// Jalankan Bot & Web
client.login(process.env.DISCORD_TOKEN);
app.listen(PORT, () => console.log(`Website Nexa online di port ${PORT}`));
