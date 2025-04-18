require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ] 
});

let lastVideoId = null;

async function checkNewVideo() {
    try {
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

        if (!latestVideo || latestVideo.id.kind !== 'youtube#video') return;

        const videoId = latestVideo.id.videoId;

        if (videoId !== lastVideoId) {
            lastVideoId = videoId;
            const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
            channel.send(`@everyone 📢 Nowy film na kanale: https://www.youtube.com/watch?v=${videoId}`);
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