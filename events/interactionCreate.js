const {Events, MessageFlags, DiscordAPIError} = require('discord.js')
const cooldowns = new Map()
const cooldown = 5000

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        console.log('Interaction received:', interaction.commandName);
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.client.isReadyForCommands) {
            return interaction.reply({
                content: '⚡ Bot is restarting, please try again in a few minutes.',
                flags: MessageFlags.Ephemeral
            });
        }
        const userId = interaction.user.id;
        const now = Date.now();
        if (cooldowns.has(userId)) {
            const expiration = cooldowns.get(userId) + cooldown;
            if (now < expiration) {
                const remaining = Math.ceil((expiration - now) / 1000);
                return interaction.reply({
                    content: `⏳ Please wait ${remaining}s before using any command again.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }
        cooldowns.set(userId, now);
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction)
        } catch (error) {
            console.error(error);
            if (error instanceof DiscordAPIError && error.code === 10062) {
                try {
                    await interaction.channel.send({
                        content: "⚠️ Please wait a moment — the server is restarting."
                    });
                } catch (innerErr) {
                    console.error("Failed to send 10062 fallback message:", innerErr);
                }
                return;
            }

            // General error fallback
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: '❌ There was an error while executing this command!',
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await interaction.reply({
                    content: '❌ There was an error while executing this command!',
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    }
}