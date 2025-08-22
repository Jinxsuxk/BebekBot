const { SlashCommandBuilder, MessageFlags} = require('discord.js')
const chrono = require('chrono-node')
const supabase = require('../../database/db')
const {DateTime} = require('luxon')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remind')
        .setDescription('Set a reminder')
        .setContexts([0, 1, 2])
        .addStringOption(option =>
            option.setName('time')
                .setDescription('When to remind')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('What to remind you about')
                .setRequired(true)),
    async execute(interaction){
        const userId = interaction.user.id;
        const {data: userData, error} = await supabase
            .from('users')
            .select('timezone')
            .eq('user_id', userId)
            .single();
        if (error) console.error(error);
        if (!userData) {
            return interaction.reply({
                content: "❌ You haven't set your timezone yet. Please use `/settimezone` first.",
                flags: MessageFlags.Ephemeral
            });
        }
        const userTimezone = userData.timezone;
        const timeInput = interaction.options.getString('time');
        const message = interaction.options.getString('message')

        const date = chrono.parseDate(timeInput, new Date());
        if (!date) return interaction.reply({ content: '❌ I could not understand that time.', flags: MessageFlags.Ephemeral });

        const userDate = DateTime.fromJSDate(date, { zone: userTimezone });
        const utcDate = userDate.toUTC();
        const unix = Math.floor(utcDate.toSeconds());

        const { error: insertError } = await supabase.from('reminders').insert({
            user_id: userId,
            message: message,
            remind_at: utcDate.toISO()
        });

        if (insertError) {
            console.error(insertError);
            return interaction.reply({ content: "❌ Failed to save reminder.", flags: MessageFlags.Ephemeral });
        }        

        await interaction.reply(`✅ I will remind you to **${message}** at <t:${unix}:F>`);

    }
}