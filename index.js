const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// --- BOT SETUP ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// --- LOGIN DISCORD (WEB) ---
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL, // Pastikan di Railway isinya https://nexa-bot-production.up.railway.app/auth/discord/callback
    scope: ['identify']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

app.set('view engine', 'ejs');
app.use(session({ secret: 'nexa_music_secret', resave: false, saveUninitialized: false }));
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

// --- MUSIC COMMANDS ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        const url = args[0];
        if (!url) return message.reply('❌ Masukkan link YouTube/Spotify!');

        const channel = message.member.voice.channel;
        if (!channel) return message.reply('❌ Kamu harus masuk Voice Channel dulu!');

        try {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            let stream = await play.stream(url);
            const resource = createAudioResource(stream.stream, { inputType: stream.type });
            const player = createAudioPlayer();

            player.play(resource);
            connection.subscribe(player);

            message.reply(`🎶 Sedang memutar musik dari link tersebut!`);

            player.on(AudioPlayerStatus.Idle, () => {
                // Cabut jika lagu selesai (opsional)
                // connection.destroy(); 
            });

        } catch (err) {
            console.error(err);
            message.reply('❌ Gagal memutar link. Pastikan link benar!');
        }
    }

    if (command === 'stop') {
        const connection = require('@discordjs/voice').getVoiceConnection(message.guild.id);
        if (connection) {
            connection.destroy();
            message.reply('⏹️ Musik dihentikan.');
        }
    }
});

// Ganti bagian client.login paling bawah dengan ini:
if (process.env.DISCORD_TOKEN) {
    client.login(process.env.DISCORD_TOKEN).catch(err => {
        console.error("Gagal login Discord: Token salah atau ditolak!");
    });
} else {
    console.error("Variabel DISCORD_TOKEN tidak ditemukan di Railway!");
}

app.listen(PORT, () => {
    console.log(`✅ Nexa Web aktif di https://nexa-bot-production.up.railway.app`);
});

