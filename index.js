const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const play = require('play-dl');
const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi Login
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    // Pastikan variabel ini di Railway tidak diakhiri dengan /
    callbackURL: process.env.CALLBACK_URL, 
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

app.set('view engine', 'ejs');
app.use(session({ secret: 'nexa_bot_secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// --- ROUTES ---
app.get('/', (req, res) => {
    res.render('index', { user: req.user });
});

app.get('/auth/discord', passport.authenticate('discord'));

// Route callback tanpa slash tambahan di akhir link
app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), (req, res) => {
    res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');
    res.render('dashboard', { user: req.user });
});

// --- FITUR PLAY LINK (BOT) ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates]
});

client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!play')) {
        const args = message.content.split(' ');
        const url = args[1];
        if (!url) return message.reply('Kirim link-nya dong!');

        const connection = joinVoiceChannel({
            channelId: message.member.voice.channel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
        });

        const stream = await play.stream(url);
        const resource = createAudioResource(stream.stream, { inputType: stream.type });
        const player = createAudioPlayer();
        
        player.play(resource);
        connection.subscribe(player);
        message.reply(`Nexa Play: ${url}`);
    }
});

client.login(process.env.DISCORD_TOKEN);
app.listen(PORT, () => console.log(`Nexa Web Running on Port ${PORT}`));

// Jalankan Bot & Web
client.login(process.env.DISCORD_TOKEN);
app.listen(PORT, () => console.log(`Website Nexa online di port ${PORT}`));

