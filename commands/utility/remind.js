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
        const baseDate = nowDate.toUTC().toJSDate()
        const hhmmRegex = /^([01]?\d|2[0-3]):[0-5]\d$/;
        const dateTimeRegex = /^(?<words>[a-zA-Z\s]+)?\s*(?<time>\d{1,2}:\d{2})$/i;
        const weekdayOnlyRegex = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i;
        const dayMonthOnlyRegex = /^(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)$/i;
        const dayMonthTimeRegex = /^(?<day>\d{1,2})\s+(?<month>january|february|march|april|may|june|july|august|september|october|november|december)\s+(?<time>\d{1,2}:\d{2})$/i;
        let utcDate;
        
        if (hhmmRegex.test(timeInput)){
            console.log('1')
            let target = DateTime.fromFormat(timeInput, "H:mm", {zone: userTimezone})
            if (target < nowDate) return interaction.reply({content: '❌ That time has already passed. Please enter a future time.', flags: MessageFlags.Ephemeral})
            utcDate = target
        }
        else if (dateTimeRegex.test(timeInput)){
            console.log('2')
            const match = timeInput.match(dateTimeRegex)
            const words = match.groups.words?.trim() || ""
            const hhmm = match.groups.time;

            const parsedTime = DateTime.fromFormat(hhmm, "H:mm", {zone: userTimezone})
            const weekdays = ["sunday", "monday","tuesday","wednesday","thursday","friday","saturday"]
            const weekdayIndex = weekdays.indexOf(words.toLowerCase())
            let target;

            if (weekdayIndex !== -1){
                let currentWeekday = nowDate.weekday % 7
                if (currentWeekday === 7) currentWeekday = 0
                let daysToAdd = (weekdayIndex - currentWeekday + 7) % 7

                target = nowDate.startOf('day').plus({days: daysToAdd}).set({
                    hour: parsedTime.hour,
                    minute: parsedTime.minute,
                    second: 0,
                    millisecond: 0
                })
                if (target <= nowDate) target = target.plus({weeks: 1})
            } else {
                const parsedDate = chrono.parseDate(words, baseDate, {timezone: nowDate.offset})
                if (!parsedDate) return interaction.reply({ content: '❌ I could not understand that time.', flags: MessageFlags.Ephemeral });
                const chronoDate = DateTime.fromJSDate(parsedDate).setZone(userTimezone)
                target = chronoDate.set({
                    hour: parsedTime.hour,
                    minute: parsedTime.minute,
                    second: 0,
                    millisecond: 0
                });
                if (target <= nowDate) return interaction.reply({content: '❌ That time has already passed. Please enter a future time.', flags: MessageFlags.Ephemeral})
            }
            utcDate = target
        }
        else if (weekdayOnlyRegex.test(timeInput)){
            console.log('3')
            const weekdayName = timeInput.trim().toLowerCase()
            const current = nowDate.startOf('day').weekday
            const desiredWeekday = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].indexOf(weekdayName) + 1;
            let daysAhead = (desiredWeekday - current + 7) % 7
            let target = nowDate.startOf('day').plus({ days: daysAhead });
            if (target < nowDate) target = target.plus({weeks: 1})
            utcDate = target
        }
        else if (dayMonthOnlyRegex.test(timeInput)){
            console.log('4')
            const parsed = chrono.parseDate(timeInput, {timezone: nowDate.offset})
            if (!parsed) return interaction.reply({ content: '❌ I could not understand that time.', flags: MessageFlags.Ephemeral });
            let target = DateTime.fromJSDate(parsed, {zone: userTimezone}).startOf('day')
            if (target < nowDate) return interaction.reply({content: '❌ That time has already passed. Please enter a future time.', flags: MessageFlags.Ephemeral})
            utcDate = target
        }
        else if (dayMonthTimeRegex.test(timeInput)){
            console.log('5')
            const parts = timeInput.split(/\s+(?=\d{1,2}:\d{2}$)/)
            const dayMonth = parts[0]
            const hhmm = parts[1]

            const parsedDate = chrono.parseDate(dayMonth, baseDate, {timezone: nowDate.offset})
            if (!parsedDate) return interaction.reply({content: '❌ Invalid date.', flags: MessageFlags.Ephemeral})
            let chronoDate = DateTime.fromJSDate(parsedDate).setZone(userTimezone)
            let parsedTime = DateTime.fromFormat(hhmm, "H:mm", { zone: userTimezone });
            let target = chronoDate.set({
                hour: parsedTime.hour,
                minute: parsedTime.minute,
                second: 0,
                millisecond: 0
            })
            if (target < nowDate) return interaction.reply({content: '❌ That time has already passed. Please enter a future time.', flags: MessageFlags.Ephemeral})
            utcDate = target
        }
        else {
            console.log('6')
            const parsed = chrono.parseDate(timeInput, baseDate, {timezone: nowDate.offset})
            if (!parsed) return interaction.reply({ content: '❌ I could not understand that time.', flags: MessageFlags.Ephemeral });
            let target = DateTime.fromJSDate(parsed).setZone(userTimezone)
            if (target < nowDate) return interaction.reply({content: '❌ That time has already passed. Please enter a future time.', flags: MessageFlags.Ephemeral})
            utcDate = target
        }

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
        await interaction.reply(`✅ I will remind you to **${message}** at <t:${unix}:F>`);
    }
}