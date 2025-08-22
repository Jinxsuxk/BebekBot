const { SlashCommandBuilder, MessageFlags} = require('discord.js')
const chrono = require('chrono-node')
const supabase = require('../../database/db')

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

        const utcDate = new Date(date.toLocaleString("en-US", { timeZone: userTimezone }));
        const unix = Math.floor(utcDate.getTime() / 1000);

        const { error: insertError } = await supabase.from('reminders').insert({
            user_id: userId,
            message: message,
            remind_at: utcDate.toISOString()
        });

        if (insertError) {
            console.error(insertError);
            return interaction.reply({ content: "❌ Failed to save reminder.", flags: MessageFlags.Ephemeral });
        }        

        await interaction.reply(`✅ I will remind you to **${message}** at <t:${unix}:F>`);

    }
}