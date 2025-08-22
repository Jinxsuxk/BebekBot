const { SlashCommandBuilder, MessageFlags} = require('discord.js');
const supabase = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settimezone')
    .setDescription('Set your timezone (IANA format, e.g. "Asia/Kuala_Lumpur", "America/New_York")')
    .addStringOption(option =>
      option.setName('timezone')
        .setDescription('Your timezone')
        .setRequired(true)
    ),
  async execute(interaction) {
    const userTimezone = interaction.options.getString('timezone');
    const userId = interaction.user.id;

    try {
      Intl.DateTimeFormat(undefined, { timeZone: userTimezone });
    } catch (err) {
      return interaction.reply({
        content: '❌ Invalid timezone. Use a valid IANA timezone (e.g. "Asia/Kuala_Lumpur").',
        flags: MessageFlags.Ephemeral
      });
    }

    await supabase.from('users').upsert({
      user_id: userId,
      timezone: userTimezone, // e.g., "America/New_York"
    });

    await interaction.reply(`✅ Your timezone has been set to **${userTimezone}**.`);
  }
};
