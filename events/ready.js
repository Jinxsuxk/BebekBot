const { Events, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const {checkReminders} = require('../checkRm/checkRm')
const {startMinuteInterval} = require('../checkRm/startInterval')

const STARTUP_DELAY = 1000 //5 * 60 * 1000;

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.APP_ID;
// const guildId = process.env.SERVER_ID;

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`✅ Ready! Logged in as ${client.user.tag}`);
        console.log(`⏳ Warming up for ${STARTUP_DELAY / 1000} seconds...`);

        client.isReadyForCommands = false;

        setTimeout(() => {
            client.isReadyForCommands = true;
            console.log("🚀 Bot is now fully ready!");
        }, STARTUP_DELAY);
        startMinuteInterval(() => checkReminders(client));

        const commands = [];
        const foldersPath = path.join(__dirname, '..', 'commands');
        const commandFolders = fs.readdirSync(foldersPath);

        for (const folder of commandFolders) {
            const commandsPath = path.join(foldersPath, folder);
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                } else {
                    console.log(`[⚠️] The command at ${filePath} is missing "data" or "execute".`);
                }
            }
        }

        const rest = new REST().setToken(token);

        try {
            console.log(`🔄 Refreshing ${commands.length} application (/) commands...`);

            // Global commands
            const data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands },
            );

            // Guild commands
            /*
            const data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands },
            );
            */

            console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            console.error(`❌ Failed to reload commands:`, error);
        }
    },
};
