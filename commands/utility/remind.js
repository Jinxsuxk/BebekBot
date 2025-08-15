const { SlashCommandBuilder} = require('discord.js')
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
        const date = chrono.parseDate(timeInput)
        if (!date) {
            return interaction.reply({ content: '❌ I could not understand that time.', ephemeral: true });
        }
        const delay = date.getTime() - Date.now()
        if (delay <= 0) {
            return interaction.reply({ content: '❌ That time is in the past.', ephemeral: true });
        }

        await interaction.reply(`✅ I will remind you to **${message}** at **${date}**`)

        setTimeout(() => {
            interaction.user.send(`⏰ Reminder: **${message}** (requested at ${interaction.createdAt})`);
        }, delay);
    }
}