const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js')
const { DateTime } = require('luxon')
const supabase = require('../../database/db')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('Show your reminders')
        .setContexts([0, 1, 2]),
    async execute(interaction) {
        await interaction.deferReply({flags: MessageFlags.Ephemeral})
        const userId = interaction.user.id
        const {data: userData} = await supabase
            .from('users')
            .select('timezone')
            .eq('user_id', userId)
            .single();
        if (!userData) return interaction.editReply("❌ You haven't set your timezone yet. Please use `/settimezone` first.");
        const userTimezone = userData.timezone
        const { data: reminders, error } = await supabase
            .from('reminders')
            .select('user_id, message, remind_at')
            .eq('user_id', userId)
            .order('remind_at', {ascending: true})
        if (error) {
            console.error(error)
            return interaction.editReply('❌ Failed to fetch reminders.')
        }
        if (!reminders || reminders.length === 0) {
            return interaction.editReply('✅ You don’t have any reminders set.')
        }
        
        const pageSize = 10
        let page = 0
        const totalPages = Math.ceil(reminders.length / pageSize)
        
        const formatPage = (page) => {
            const start = page * pageSize
            const end = start + pageSize
            const slice = reminders.slice(start, end)

            const description = slice.map((reminder, i) => {
                const remindTime = DateTime.fromISO(reminder.remind_at, {zone: 'utc'})
                    .setZone(userTimezone)
                    .toFormat('dd LLL yyyy HH:mm')
                return `${start + i + 1}. **${reminder.message}** — ${remindTime}`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`${interaction.user.username}'s Reminders`)
                .setDescription(description || 'No reminders on this page.')
                .setFooter({ text: `Page ${page + 1}/${totalPages} • ${reminders.length} total` })
                .setColor(0xFFD700);
            return embed
        }

        const getButtons = (page) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('◀️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('▶️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === totalPages - 1)
            )
        }

        let message = await interaction.editReply({
            embeds: [formatPage(page)],
            components: [getButtons(page)]
        });

        const collector = message.createMessageComponentCollector({
            time: 60000, // 60s
            filter: (i) => i.user.id === interaction.user.id
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'prev' && page > 0) page--;
            if (i.customId === 'next' && page < totalPages - 1) page++;

            await i.update({
                embeds: [formatPage(page)],
                components: [getButtons(page)]
            });
        });

        collector.on('end', async () => {
            await message.edit({ components: [] }).catch(() => {});
        });

    }
}
