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

// Dummy User untuk Login Email (Contoh)
const users = [{ email: "admin@nexa.com", password: bcrypt.hashSync("nexa123", 10) }]; 

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates]
});

// --- PASSPORT SETUP ---
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope: ['identify']
}, (at, rt, profile, done) => done(null, profile)));

passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    const user = users.find(u => u.email === email);
    if (!user) return done(null, false);
    if (!bcrypt.compareSync(password, user.password)) return done(null, false);
    return done(null, user);
}));

// --- EXPRESS SETUP ---
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(session({ secret: 'nexa_secret', resave: false, saveUninitialized: false, cookie: { secure: false } }));
app.use(passport.initialize());
app.use(passport.session());

// --- ROUTES ---
app.get('/', (req, res) => res.render('index', { user: req.user }));
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/dashboard'));

app.post('/login-email', passport.authenticate('local', { successRedirect: '/dashboard', failureRedirect: '/' }));

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');
    res.render('dashboard', { user: req.user });
});

app.get('/logout', (req, res) => { req.logout(() => res.redirect('/')); });

// --- BOT MUSIC ---
client.on('messageCreate', async (msg) => {
    if (!msg.content.startsWith('!play') || msg.author.bot) return;
    const url = msg.content.split(' ')[1];
    if (!url || !msg.member.voice.channel) return msg.reply("Masuk voice dulu dan berikan link!");

    try {
        const connection = joinVoiceChannel({
            channelId: msg.member.voice.channel.id,
            guildId: msg.guild.id,
            adapterCreator: msg.guild.voiceAdapterCreator,
        });
        const stream = await play.stream(url);
        const player = createAudioPlayer();
        player.play(createAudioResource(stream.stream, { inputType: stream.type }));
        connection.subscribe(player);
        msg.reply('🎶 Nexa Music playing!');
    } catch (e) {
        console.error(e);
    }
});

// Ganti bagian paling bawah index.js
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Website NEXA siap di port ${PORT}`);
}).on('error', (err) => {
    console.error('❌ Gagal menjalankan server web:', err);
});

client.login(process.env.DISCORD_TOKEN).then(() => {
    console.log('✅ Bot Nexa berhasil login ke Discord!');
}).catch(err => {
    console.error('❌ Bot gagal login (Cek Token/Intents):', err.message);
});

