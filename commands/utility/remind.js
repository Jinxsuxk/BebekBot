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
                content: "❌ Sorry, I cannot send reminders here. Please use a server channel or DM me directly.", 
                flags: MessageFlags.Ephemeral
            });
        }
        const userId = interaction.user.id;
        const {data: userData} = await supabase
            .from('users')
            .select('timezone')
            .eq('user_id', userId)
            .single();
        if (!userData) return interaction.reply("✋ Waittt! First, tell me your timezone with `/settimezone` before I can set reminders. One-time setup — unless you plan to travel at light speed! 😄")
        const userTimezone = userData.timezone;
        const timeInput = interaction.options.getString('time');
        const message = interaction.options.getString('message');

        const nowDate = DateTime.now().setZone(userTimezone);
        const nowForChrono = new Date(
            nowDate.year,
            nowDate.month - 1,
            nowDate.day,
            nowDate.hour,
            nowDate.minute,
            nowDate.second,
            nowDate.millisecond
        );
        const results = chrono.parse(timeInput, nowForChrono, { forwardDate: true });
        if (!results || results.length === 0) {
            return interaction.reply({
                content: '❌ I could not understand that time.',
                flags: MessageFlags.Ephemeral
            });
        }
        const res = results[0];
        const kv = res.start.knownValues || {};
        const iv = res.start.impliedValues || {};

        const year   = kv.year   ?? iv.year   ?? nowDate.year;
        const month  = kv.month  ?? iv.month  ?? nowDate.month;
        const day    = kv.day    ?? iv.day    ?? nowDate.day;
        let hour     = kv.hour   ?? 0
        let minute   = kv.minute ?? 0
        const second = kv.second ?? 0

        const hasExplicitTime = /\b\d{1,2}(:\d{2})?\s*(am|pm)?\b/i.test(timeInput);
        if (!hasExplicitTime && timeInput.toLowerCase().includes('day')) {
            hour = 0;
            minute = 0;
        }

        let target = DateTime.fromObject( 
            { year, month, day, hour, minute, second, millisecond: 0 }, 
            { zone: userTimezone } 
        );

        if (target < nowDate) {
        return interaction.reply({
            content: '❌ That time has already passed. Please enter a future time.',
            flags: MessageFlags.Ephemeral
        });
        }
        const utcDate = target.toUTC();

        let guildId = false;
        if (interaction.guild) {
            const permission = interaction.channel.permissionsFor(interaction.guild.members.me)
            if (!permission.has("SendMessages") || !permission.has("ViewChannel")) {
                return interaction.reply({
                    content: "⚠️ I don't have permission to send messages in this channel. Please enable **View Channel** and **Send Messages** in the channel settings.",
                    flags: MessageFlags.Ephemeral
                });
            }
            guildId = true;
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
        const display = utcDate.setZone(userTimezone).toFormat("h:mm a")
        await interaction.reply(`✅ I will remind you to **${message}** on <t:${unix}:D> at ${display}`);
    }
}