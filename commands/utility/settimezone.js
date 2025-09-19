const { SlashCommandBuilder, MessageFlags} = require('discord.js');
const supabase = require('../../database/db');
const cityTimezones = require('city-timezones');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settimezone')
    .setDescription('Set your timezone by city and country')
    .setContexts([0, 1, 2])
    .addStringOption(option =>
      option.setName('city')
        .setDescription('Your city (e.g., Kuala Lumpur)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('country')
          .setDescription('Your country (e.g., Malaysia)')
          .setRequired(true)),
  async execute(interaction) {
    const city = interaction.options.getString('city');
    const country = interaction.options.getString('country');

    const matches = cityTimezones.findFromCityStateProvince(city);
    const filtered = matches.filter(m => 
        m.country.toLowerCase() === country.toLowerCase()
    );
    if (filtered.length === 0) {
        return interaction.reply({
            content: `❌ Could not find timezone for **${city}, ${country}**.`,
            flags: MessageFlags.Ephemeral
        });
    }
    const timezone = filtered[0].timezone;

    const { error } = await supabase
      .from('users')
      .upsert({
          user_id: interaction.user.id,
          timezone: timezone
      });

    if (error) {
        console.error(error);
        return interaction.reply({
            content: '❌ Failed to save timezone.',
            flags: MessageFlags.Ephemeral
        });
    }
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short"
    });

    const parts = formatter.formatToParts(new Date());
    const tzName = parts.find(p => p.type === "timeZoneName")?.value;

    await interaction.reply(`✅ Your timezone has been set to (${tzName}).`);
  }
};
