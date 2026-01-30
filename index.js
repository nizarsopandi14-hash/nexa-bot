require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
const { Client, GatewayIntentBits } = require('discord.js'); //
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- PINDAHKAN KE SINI (INITIALIZATION) ---
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

// ... (Kode Middleware Session & Passport kamu tetap di sini) ...

// --- SEKARANG BARU BOLEH PAKAI client.on ---
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith("!ask")) {
        const prompt = message.content.replace("!ask ", "");
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            message.reply(response.text());
        } catch (error) {
            console.error("Gemini Error:", error);
            message.reply("Maaf, otak AI-ku lagi loading...");
        }
    }
});

// LOGIN BOT DI PALING BAWAH
const token = process.env.TOKEN;
if (token) {
    client.login(token).catch(err => console.log("Token salah:", err));
}

app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Nexa Web & Bot Online on port ${port}`);
});
