const { SlashCommandBuilder, MessageFlags} = require('discord.js')
const chrono = require('chrono-node')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remind')
        .setDescription('Set a reminder')
        .addStringOption(option =>
            option.setName('time')
                .setDescription('When to remind')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('What to remind you about')
                .setRequired(true)),
    async execute(interaction){
        const timeInput = interaction.options.getString('time');
        const message = interaction.options.getString('message')
        const date = chrono.parseDate(timeInput, new Date(), { timezone: 0 });
        const delay = date.getTime() - Date.now()
        const unix = Math.floor(date.getTime() / 1000)

        if (!date) {
            return interaction.reply({ content: '❌ I could not understand that time.', flags: MessageFlags.Ephemeral });
        }
        if (delay <= 0) {
            return interaction.reply({ content: '❌ That time is in the past.', flags: MessageFlags.Ephemeral });
        }
        await interaction.reply(`✅ I will remind you to **${message}** at <t:${unix}:F> (<t:${unix}:R>)`);

        setTimeout(() => {
            interaction.user.send(`⏰ Reminder: **${message}** (requested at ${interaction.createdAt})`);
        }, delay);
    }
}