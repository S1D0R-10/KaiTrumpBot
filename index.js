require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const fs = require('node:fs');
const path = require('node:path');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ] 
});

const STORAGE_FILE = 'lastVideo.json';
const SENT_VIDEOS_FILE = 'sentVideos.json';

function loadSentVideos() {
    try {
        if (fs.existsSync(SENT_VIDEOS_FILE)) {
            const data = JSON.parse(fs.readFileSync(SENT_VIDEOS_FILE, 'utf8'));
            return data.sentVideos || [];
        }
    } catch (err) {
        console.error("Błąd przy wczytywaniu historii wysłanych filmów:", err.message);
    }
    return [];
}

function saveSentVideo(videoId) {
    try {
        const sentVideos = loadSentVideos();
        if (!sentVideos.includes(videoId)) {
            sentVideos.push(videoId);
            // Zachowaj tylko ostatnie 100 wysłanych filmów
            if (sentVideos.length > 100) {
                sentVideos.shift();
            }
            fs.writeFileSync(SENT_VIDEOS_FILE, JSON.stringify({ sentVideos }));
        }
    } catch (err) {
        console.error("Błąd przy zapisywaniu historii wysłanych filmów:", err.message);
    }
}

function loadLastVideoId() {
    try {
        if (fs.existsSync(STORAGE_FILE)) {
            const data = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
            return data.lastVideoId;
        }
    } catch (err) {
        console.error("Błąd przy wczytywaniu lastVideoId:", err.message);
    }
    return null;
}

function saveLastVideoId(videoId) {
    try {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify({ lastVideoId: videoId }));
    } catch (err) {
        console.error("Błąd przy zapisywaniu lastVideoId:", err.message);
    }
}

let lastVideoId = loadLastVideoId();
const sentVideos = loadSentVideos();

async function checkNewVideo() {
    try {
        console.log("Sprawdzanie nowego filmu...");
        console.log("Ostatni wysłany film ID:", lastVideoId);
        
        const res = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
                key: process.env.YOUTUBE_API_KEY,
                channelId: process.env.YOUTUBE_CHANNEL_ID,
                part: 'snippet,id',
                order: 'date',
                maxResults: 1
            }
        });

        const latestVideo = res.data.items[0];

        if (!latestVideo || latestVideo.id.kind !== 'youtube#video') {
            console.log("Nie znaleziono nowego filmu");
            return;
        }

        const videoId = latestVideo.id.videoId;
        console.log("Znaleziony film ID:", videoId);

        // Sprawdź czy film nie był już wcześniej wysłany
        if (sentVideos.includes(videoId)) {
            console.log("Film był już wcześniej wysłany, pomijam");
            return;
        }

        if (videoId !== lastVideoId) {
            console.log("Wysyłanie nowego filmu...");
            lastVideoId = videoId;
            saveLastVideoId(videoId);
            saveSentVideo(videoId);
            const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
            await channel.send(`@everyone 📢 Nowy film na kanale: https://www.youtube.com/watch?v=${videoId}`);
            console.log("Film został wysłany pomyślnie");
        } else {
            console.log("Ten sam film co ostatnio, pomijam");
        }

    } catch (err) {
        console.error("Błąd przy sprawdzaniu filmu:", err.message);
    }
}

client.once('ready', () => {
    console.log(`Zalogowano jako ${client.user.tag}`);
    checkNewVideo(); // pierwsze sprawdzenie od razu
    setInterval(checkNewVideo, process.env.CHECK_INTERVAL_MINUTES * 60 * 1000);
});

client.login(process.env.DISCORD_TOKEN);