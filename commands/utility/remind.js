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
        if (interaction.context === 2) {
            return interaction.reply({
                content: "❌ Sorry, I cannot send reminders in group DMs. Please use a server channel or DM me directly.", 
                flags: MessageFlags.Ephemeral
            });
        }
        const userId = interaction.user.id;
        const {data: userData} = await supabase
            .from('users')
            .select('timezone')
            .eq('user_id', userId)
            .single();
        if (!userData) {
            return interaction.reply({
                content: "❌ You haven't set your timezone yet. Please use `/settimezone` first.",
                flags: MessageFlags.Ephemeral
            });
        }
        const userTimezone = userData.timezone;
        const timeInput = interaction.options.getString('time');
        const message = interaction.options.getString('message')

        const nowDate = DateTime.now().setZone(userTimezone)
        const hhmmRegex = /^([01]?\d|2[0-3]):[0-5]\d$/;
        let utcDate = ""
        if (hhmmRegex.test(timeInput)){
            const target = DateTime.fromFormat(timeInput, "H:mm", { zone: userTimezone });
            let finalDate = target < nowDate
                ? target.plus({days: 1})
                : target
            utcDate = finalDate;
        }
        else {
            const baseDate = nowDate.toJSDate();
            const offsetMinutes = nowDate.offset;
            const parsed = chrono.parseDate(timeInput, baseDate, {
                timezone: offsetMinutes,
                forwardDate: true
            });
            console.log(parsed)
            if (!parsed) return interaction.reply({ content: '❌ I could not understand that time.', flags: MessageFlags.Ephemeral }); 
            utcDate = DateTime.fromJSDate(parsed).setZone(userTimezone);
        }
        if (utcDate < nowDate) return interaction.reply({content: '❌ That time has already passed. Please enter a future time.', flags: MessageFlags.Ephemeral})
        console.log(utcDate)

        let guildId = false;
        if (interaction.guild) {
            const permission = interaction.channel.permissionsFor(interaction.guild.members.me)
            if (!permission.has("SendMessages") || !permission.has("ViewChannel")) {
                return interaction.reply({
                    content: "⚠️ I don't have permission to send messages in this channel. Please enable **View Channel** and **Send Messages** in the channel settings.",
                    flags: MessageFlags.Ephemeral
                });
            }
            guildId = interaction.guild;
        }
        const { error: insertError } = await supabase.from('reminders').insert({
            user_id: userId,
            message: message,
            remind_at: utcDate.toISO(),
            channel_id: interaction.channelId,
            guild_id: guildId
        });

        if (insertError) {
            console.error(insertError);
            return interaction.reply({ content: "❌ Failed to save reminder.", flags: MessageFlags.Ephemeral });
        }

        const unix = Math.floor(utcDate.toSeconds());
        await interaction.reply(`✅ I will remind you to **${message}** at <t:${unix}:F>`);
    }
}