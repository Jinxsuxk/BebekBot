const supabase = require('../database/db')

const checkReminders = async (client) => {
    const now = new Date().toISOString();
    const {data: reminders, error} = await supabase
        .from('reminders')
        .select('*')
        .lte('remind_at', now);
    if (error) return console.error(error)
    
    for(const reminder of reminders){
        try {
            const user = await client.users.fetch(reminder.user_id)
            await user.send(`⏰ Reminder: **${reminder.message}**`);
        } catch (err){
            console.error(`Failed to DM ${reminder.user_id}`, err);
        }

        await supabase.from('reminders').delete().eq('id', reminder.id)
    }
}

module.exports = {checkReminders}