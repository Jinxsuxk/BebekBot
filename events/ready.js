const {Events} = require('discord.js')

const STARTUP_DELAY = 5 * 60 * 1000;
module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client){
        console.log(`Ready! Logged in as ${client.user.tag}`)
        console.log(`⏳ Warming up for ${STARTUP_DELAY / 1000} seconds...`);

        client.isReadyForCommands = false

        setTimeout(() => {
            client.isReadyForCommands = true;
            console.log("🚀 Bot is now fully ready!");
        }, STARTUP_DELAY);
    },
};