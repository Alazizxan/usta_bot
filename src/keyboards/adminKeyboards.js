// Admin inline klaviaturalari
const { Markup } = require('telegraf');

/**
 * Admin asosiy menyu
 */
function getAdminMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔍 Foydalanuvchi qidirish', 'admin_search_user')],
    [Markup.button.callback(`🎁 Mukofot Qo'shish`, 'admin_add_reward')],
    [Markup.button.callback('🗑 Mukofotni o\'chirish', 'admin_remove_reward')],
    [Markup.button.callback('📢 Xabar yuborish', 'admin_broadcast')],
    [Markup.button.callback('📺 Kanal qo\'shish', 'admin_add_channel')],
    [Markup.button.callback('🗑 Kanalni o\'chirish', 'admin_remove_channel')],
    [Markup.button.callback('📊 Statistika', 'admin_statistics')],
    [Markup.button.callback('👥 Foydalanuvchilar', 'admin_users_list')],
    [Markup.button.callback('🔙 Foydalanuvchi menyusi', 'user_main_menu')]
  ]);
}

/**
 * Foydalanuvchilar ro'yxati klaviaturasi
 */
function getUsersListKeyboard(users, prefix = 'admin_user') {
  const buttons = users.map(user => [
    Markup.button.callback(
      `${user.name} (@${user.username || 'N/A'}) - ${user.points} ball`,
      `${prefix}_${user._id}`
    )
  ]);
  
  buttons.push([Markup.button.callback('🔙 Admin menyu', 'admin_main')]);
  
  return Markup.inlineKeyboard(buttons);
}

/**
 * Foydalanuvchi batafsil ma'lumotlari klaviaturasi
 */
function getUserDetailKeyboard(userId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('➕ Ball qo\'shish', `admin_add_pts_${userId}`),
      Markup.button.callback('➖ Ball ayirish', `admin_rem_pts_${userId}`)
    ],
    [
      // Markup.button.callback('🎁 Mukofot berish', `admin_grant_rwd_${userId}`),
      Markup.button.callback('👑 Admin qilish', `admin_mkadm_${userId}`)
    ],
    [
      Markup.button.callback('✉️ Xabar yuborish', `admin_send_msg_${userId}`)
    ],
    [Markup.button.callback('🔙 Orqaga', 'admin_search_user')]
  ]);
}

/**
 * Tasdiqlash klaviaturasi
 */
function getConfirmKeyboard(action, data) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Tasdiqlash', `confirm_${action}_${data}`),
      Markup.button.callback('❌ Bekor qilish', 'admin_main')
    ]
  ]);
}

/**
 * Broadcast segment tanlash
 */
function getBroadcastSegmentKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('👥 Barcha foydalanuvchilar', 'broadcast_all')],
    [Markup.button.callback('👑 Faqat adminlar', 'broadcast_admins')],
    [Markup.button.callback('👤 Oddiy foydalanuvchilar', 'broadcast_users')],
    [Markup.button.callback('🔙 Bekor qilish', 'admin_main')]
  ]);
}

/**
 * Kanallar ro'yxati klaviaturasi
 */
function getChannelsListKeyboard(channels, prefix = 'admin_ch') {
  const buttons = channels.map(channel => [
    Markup.button.callback(
      `${channel.title}`,
      `${prefix}_${channel._id}`
    )
  ]);
  
  buttons.push([Markup.button.callback('🔙 Admin menyu', 'admin_main')]);
  
  return Markup.inlineKeyboard(buttons);
}

/**
 * Orqaga admin menyu tugmasi
 */
function getBackToAdminButton() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Admin menyu', 'admin_main')]
  ]);
}
module.exports = {
  getAdminMenu,
  getUsersListKeyboard,
  getUserDetailKeyboard,
  getConfirmKeyboard,
  getBroadcastSegmentKeyboard,
  getChannelsListKeyboard,
  getBackToAdminButton
};
