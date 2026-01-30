const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, entersState } = require('@discordjs/voice');
const play = require('play-dl');
const express = require('express');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const http = require('http'); // Tambah ini
const { Server } = require('socket.io'); // Tambah ini

const app = express();
const server = http.createServer(app); // Gunakan HTTP Server untuk Socket.IO
const io = new Server(server); // Inisialisasi Socket.IO
const PORT = process.env.PORT || 3000;

// --- DATABASE DUMMY (Untuk Login Email) ---
const users = [{ email: "admin@nexa.com", password: bcrypt.hashSync("nexa123", 10), username: "Nexa Admin" }];

// --- DISCORD BOT ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// --- MUSIC PLAYER STATE ---
const guildPlayers = new Map(); // Map untuk menyimpan player dan koneksi per guild

// --- PASSPORT CONFIG ---
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: ['identify', 'guilds'] // Tambah 'guilds' untuk deteksi server
}, (accessToken, refreshToken, profile, done) => {
    // Jika login via Discord, cek apakah user sudah ada di dummy database (opsional)
    let user = users.find(u => u.discordId === profile.id);
    if (!user) {
        user = {
            id: profile.id,
            discordId: profile.id,
            username: profile.username,
            avatar: profile.avatar,
            provider: 'discord'
        };
        users.push(user);
    }
    return done(null, user);
}));

passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    const user = users.find(u => u.email === email);
    if (!user) return done(null, false, { message: 'Email tidak terdaftar' });
    if (!bcrypt.compareSync(password, user.password)) return done(null, false, { message: 'Password salah' });
    return done(null, { id: user.email, username: user.username, email: user.email, provider: 'local' }); // Sesuaikan format user
}));

// --- EXPRESS SETUP ---
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: 'nexa_ultra_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());

// --- MIDDLEWARE untuk memeriksa login
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    res.redirect('/');
};

// --- ROUTES ---
app.get('/', (req, res) => res.render('index', { user: req.user }));
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/dashboard'));
app.post('/login-email', passport.authenticate('local', { successRedirect: '/dashboard', failureRedirect: '/' }));
app.get('/dashboard', isAuthenticated, (req, res) => res.render('dashboard', { user: req.user }));
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/');
    });
});

// --- MUSIC BOT COMMANDS ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    const guildId = message.guild.id;
    let current = guildPlayers.get(guildId);

    if (command === 'play') {
        const query = args.join(' ');
        if (!query) return message.reply('Apa yang mau diputar?');

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('Masuk voice dulu!');

        try {
            if (!current || !current.connection) {
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guildId,
                    adapterCreator: message.guild.voiceAdapterCreator,
                });
                const player = createAudioPlayer();
                connection.subscribe(player);
                current = { connection, player, queue: [], currentSong: null, volume: 0.5 };
                guildPlayers.set(guildId, current);

                player.on(AudioPlayerStatus.Idle, () => {
                    if (current.queue.length > 0) {
                        playSong(guildId, current.queue.shift());
                    } else {
                        current.connection.destroy();
                        guildPlayers.delete(guildId);
                    }
                });
                player.on('error', error => console.error(`Error with audio player: ${error.message}`));
            }

            const streamInfo = await play.search(query, { limit: 1 });
            if (!streamInfo.length) return message.reply('Tidak ditemukan.');
            const song = streamInfo[0];

            if (current.currentSong === null && current.queue.length === 0) {
                playSong(guildId, song);
                message.reply(`🎶 Memutar: **${song.title}**`);
            } else {
                current.queue.push(song);
                message.reply(`✅ Ditambahkan ke antrian: **${song.title}**`);
            }
        } catch (err) {
            console.error('Play error:', err);
            message.reply('Gagal memutar.');
        }
    } else if (command === 'stop') {
        if (current && current.connection) {
            current.connection.destroy();
            guildPlayers.delete(guildId);
            message.reply('⏹️ Musik dihentikan.');
        } else {
            message.reply('Tidak ada musik yang diputar.');
        }
    } else if (command === 'skip') {
        if (current && current.player) {
            current.player.stop();
            message.reply('⏩ Lagu dilewati.');
        } else {
            message.reply('Tidak ada musik yang bisa dilewati.');
        }
    }
});

async function playSong(guildId, song) {
    const current = guildPlayers.get(guildId);
    if (!current) return;

    try {
        current.currentSong = song;
        const stream = await play.stream(song.url);
        const resource = createAudioResource(stream.stream, { inputType: stream.type });
        current.player.play(resource);
        current.player.setVolume(current.volume); // Set volume
    } catch (err) {
        console.error('Error playing song:', err);
        current.currentSong = null;
        if (current.queue.length > 0) {
            playSong(guildId, current.queue.shift());
        } else {
            current.connection.destroy();
            guildPlayers.delete(guildId);
        }
    }
}


// --- SOCKET.IO untuk kontrol Web-to-Bot ---
io.on('connection', (socket) => {
    console.log('User connected to socket.io');

    socket.on('joinGuild', async (guildId) => {
        try {
            const guild = await client.guilds.fetch(guildId);
            const voiceChannels = guild.channels.cache.filter(c => c.type === GatewayIntentBits.GuildVoiceStates);
            socket.emit('voiceChannels', voiceChannels.map(c => ({ id: c.id, name: c.name })));

            const current = guildPlayers.get(guildId);
            if (current && current.currentSong) {
                socket.emit('nowPlaying', { title: current.currentSong.title, url: current.currentSong.url, volume: current.volume });
            } else {
                socket.emit('nowPlaying', null);
            }
        } catch (error) {
            console.error('Failed to fetch guild/channels:', error);
            socket.emit('error', 'Failed to fetch guild data.');
        }
    });

    socket.on('playSongWeb', async ({ guildId, voiceChannelId, query }) => {
        try {
            const guild = await client.guilds.fetch(guildId);
            const voiceChannel = guild.channels.cache.get(voiceChannelId);
            if (!voiceChannel) return socket.emit('musicError', 'Voice channel not found.');

            let current = guildPlayers.get(guildId);

            if (!current || !current.connection) {
                const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: guildId,
                    adapterCreator: guild.voiceAdapterCreator,
                });
                const player = createAudioPlayer();
                connection.subscribe(player);
                current = { connection, player, queue: [], currentSong: null, volume: 0.5 };
                guildPlayers.set(guildId, current);

                player.on(AudioPlayerStatus.Idle, () => {
                    if (current.queue.length > 0) {
                        playSong(guildId, current.queue.shift());
                    } else {
                        current.connection.destroy();
                        guildPlayers.delete(guildId);
                        io.to(guildId).emit('nowPlaying', null);
                    }
                });
                player.on('error', error => {
                    console.error(`Error with audio player: ${error.message}`);
                    io.to(guildId).emit('musicError', 'An error occurred during playback.');
                });
            }

            const streamInfo = await play.search(query, { limit: 1 });
            if (!streamInfo.length) return socket.emit('musicError', 'Song not found.');
            const song = streamInfo[0];

            if (current.currentSong === null && current.queue.length === 0) {
                await playSong(guildId, song);
                io.to(guildId).emit('nowPlaying', { title: song.title, url: song.url, volume: current.volume });
            } else {
                current.queue.push(song);
                io.to(guildId).emit('queueUpdate', current.queue.map(s => s.title));
            }

            socket.emit('musicStatus', `Playing: ${song.title}`);

        } catch (error) {
            console.error('Web Play error:', error);
            socket.emit('musicError', 'Failed to play song.');
        }
    });

    socket.on('stopSongWeb', ({ guildId }) => {
        const current = guildPlayers.get(guildId);
        if (current && current.connection) {
            current.connection.destroy();
            guildPlayers.delete(guildId);
            io.to(guildId).emit('nowPlaying', null);
            socket.emit('musicStatus', 'Music stopped.');
        }
    });

    socket.on('skipSongWeb', ({ guildId }) => {
        const current = guildPlayers.get(guildId);
        if (current && current.player) {
            current.player.stop();
            socket.emit('musicStatus', 'Song skipped.');
        }
    });

    socket.on('setVolumeWeb', ({ guildId, volume }) => {
        const current = guildPlayers.get(guildId);
        if (current && current.player) {
            current.volume = volume;
            current.player.setVolume(volume);
            io.to(guildId).emit('nowPlaying', { title: current.currentSong.title, url: current.currentSong.url, volume: current.volume });
            socket.emit('musicStatus', `Volume set to ${Math.round(volume * 100)}%`);
        }
    });
});


// --- START SERVER ---
client.login(process.env.DISCORD_TOKEN).catch(() => console.error("Bot gagal login! Cek token atau intents."));
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Nexa Dashboard & Bot ON di port ${PORT}`));
