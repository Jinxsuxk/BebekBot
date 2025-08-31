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
        //const weekdayRegex = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(?<time>\d{1,2}:\d{2})$/i;
        //const dayMonthRegex = /^(?<day>\d{1,2})\s+(?<month>[a-zA-Z]+)\s+(?<time>\d{1,2}:\d{2})$/i;
        let utcDate;
        if (hhmmRegex.test(timeInput)){
            console.log('here1')
            let target = DateTime.fromFormat(timeInput, "H:mm", {zone: userTimezone})
            if (target < nowDate) return interaction.reply({content: '❌ That time has already passed. Please enter a future time.', flags: MessageFlags.Ephemeral})
            utcDate = target
        }
        else if (timeInput.match(dateTimeRegex)){
            console.log('here2')
            const match = timeInput.match(dateTimeRegex)
            const words = match.groups.words?.trim() || ""
            const hhmm = match.groups.time;

            const parsedDate = chrono.parseDate(words, baseDate, {timezone: nowDate.offset})
            if (!parsedDate) return interaction.reply({ content: '❌ I could not understand that time.', flags: MessageFlags.Ephemeral });

            const chronoDate = DateTime.fromJSDate(parsedDate).setZone(userTimezone)
            const parsedTime = DateTime.fromFormat(hhmm, "H:mm", {zone: userTimezone})
            let target = chronoDate.set({
                hour: parsedTime.hour,
                minute: parsedTime.minute
            })
            if (target <= nowDate) {
                if (/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i.test(words)) {
                    target = target.plus({ weeks: 1 })
                } else {
                    return interaction.reply({content: '❌ That time has already passed. Please enter a future time.', flags: MessageFlags.Ephemeral})
                }
            }
            utcDate = target
        }
        else if (timeInput.match(weekdayOnlyRegex)){
            console.log('here3')
            const weekdayName = timeInput.trim().toLowerCase()
            const current = nowDate.startOf('day').weekday
            const desiredWeekday = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].indexOf(weekdayName) + 1;
            let daysAhead = (desiredWeekday - current + 7) % 7
            let target = nowDate.startOf('day').plus({ days: daysAhead });
            if (target < nowDate) target = target.plus({weeks: 1})
            utcDate = target
        }
        else if (dayMonthOnlyRegex.test(timeInput)){
            console.log('here4')
            const parsed = chrono.parseDate(timeInput, {timezone: nowDate.offset})
            if (!parsed) return interaction.reply({ content: '❌ I could not understand that time.', flags: MessageFlags.Ephemeral });
            let target = DateTime.fromJSDate(parsed, {zone: userTimezone}).startOf('day')
            if (target < nowDate) return interaction.reply({content: '❌ That time has already passed. Please enter a future time.', flags: MessageFlags.Ephemeral})
            utcDate = target
        }
        else {
            console.log('here5')
            const parsed = chrono.parseDate(timeInput, baseDate, {timezone: nowDate.offset})
            if (!parsed) return interaction.reply({ content: '❌ I could not understand that time.', flags: MessageFlags.Ephemeral });
            let target = DateTime.fromJSDate(parsed).setZone(userTimezone)
            if (target < nowDate) return interaction.reply({content: '❌ That time has already passed. Please enter a future time.', flags: MessageFlags.Ephemeral})
            utcDate = target
        }
        //if (utcDate < nowDate) return interaction.reply({content: '❌ That time has already passed. Please enter a future time.', flags: MessageFlags.Ephemeral})




        // if (hhmmRegex.test(timeInput)){
        //     const target = DateTime.fromFormat(timeInput, "H:mm", { zone: userTimezone });
        //     if (target < nowDate) return interaction.reply({content: '❌ That time has already passed. Please enter a future time.', flags: MessageFlags.Ephemeral})
        //     utcDate = target;
        // }
        // else if (timeInput.match(dateTimeRegex)){
        //     const match = timeInput.match(dateTimeRegex)
        //     const words = match.groups.words?.trim() || ""
        //     const hhmm = match.groups.time
        //     const targetDay = chrono.parseDate(words, {timezone: nowDate.offset})
        //     const targetTime = DateTime.fromFormat(hhmm, "H:mm", {zone: userTimezone})
        //     utcDate = DateTime.fromJSDate(targetDay).setZone(userTimezone) + DateTime.fromJSDate(targetTime).setZone(userTimezone)
        // }
        // else {
        //     const parsed = chrono.parseDate(timeInput, baseDate, {timezone: nowDate.offset})
        //     if (!parsed) return interaction.reply({ content: '❌ I could not understand that time.', flags: MessageFlags.Ephemeral });
        //     if (parsed < nowDate) return interaction.reply({content: '❌ That time has already passed. Please enter a future time.', flags: MessageFlags.Ephemeral}) 
        //     utcDate = DateTime.fromJSDate(parsed).setZone(userTimezone)
        // }
        // if (utcDate < nowDate) return interaction.reply({content: '❌ That time has already passed. Please enter a future time.', flags: MessageFlags.Ephemeral})

        // const nowDate = DateTime.now().setZone(userTimezone)
        // const hhmmRegex = /^([01]?\d|2[0-3]):[0-5]\d$/;
        // let utcDate = ""
        // if (hhmmRegex.test(timeInput)){
        //     const target = DateTime.fromFormat(timeInput, "H:mm", { zone: userTimezone });
        //     let finalDate = target < nowDate
        //         ? target.plus({days: 1})
        //         : target
        //     utcDate = finalDate;
        // }
        // else {
        //     const baseDate = nowDate.toUTC().toJSDate();
        //     const offsetMinutes = nowDate.offset;
        //     const parsed = chrono.parseDate(timeInput, baseDate, {
        //         timezone: offsetMinutes,
        //         forwardDate: true
        //     });
        //     console.log(timeInput)
        //     console.log(baseDate)
        //     console.log(offsetMinutes)
        //     console.log(parsed)
        //     if (!parsed) return interaction.reply({ content: '❌ I could not understand that time.', flags: MessageFlags.Ephemeral }); 
        //     utcDate = DateTime.fromJSDate(parsed).setZone(userTimezone);
        // }
        // if (utcDate < nowDate) return interaction.reply({content: '❌ That time has already passed. Please enter a future time.', flags: MessageFlags.Ephemeral})
        // console.log(utcDate)
        // console.log(nowDate)

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