// Foydalanuvchi inline klaviaturalari
const { Markup } = require('telegraf');

/**
 * Asosiy menyu - Main menu
 */
function getMainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🪙 Mening ballarim', 'user_my_points')],
    [Markup.button.callback('🎁 Mukofotlar', 'user_rewards')],
    [Markup.button.callback('🎉 Mening mukofotlarim', 'user_my_rewards')],
    [Markup.button.callback('💰 Mukofot olish', 'user_claim_reward')],
    [Markup.button.callback('🏆 Top 10 foydalanuvchilar', 'user_leaderboard')]
  ]);
}

/**
 * Mukofotlar ro'yxati uchun klaviatura
 */
function getRewardsListKeyboard1(rewards, prefix = 'reward') {
  const buttons = [Markup.button.callback('🔙 Orqaga', 'user_main_menu')];
  
  return Markup.inlineKeyboard(buttons);
}


function getRewardsListKeyboard(rewards, prefix = 'reward') {
  const buttons = rewards.map(reward => [
    Markup.button.callback(
      `${reward.title} - ${reward.costPoints} ball`,
      `${prefix}_${reward._id}`
    )
  ]);
  
  buttons.push([Markup.button.callback('🔙 Orqaga', 'user_main_menu')]);
  
  return Markup.inlineKeyboard(buttons);
}

/**
 * Mukofotni tasdiqlash klaviaturasi
 */
function getRewardConfirmKeyboard(rewardId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Tasdiqlash', `confirm_claim_${rewardId}`),
      Markup.button.callback('❌ Bekor qilish', 'user_claim_reward')
    ],
    [Markup.button.callback('🔙 Asosiy menyu', 'user_main_menu')]
  ]);
}

/**
 * Orqaga tugmasi
 */
function getBackButton(action = 'user_main_menu') {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔙 Orqaga', action)]
  ]);
}

module.exports = {
  getMainMenu,
  getRewardsListKeyboard,
  getRewardConfirmKeyboard,
  getRewardsListKeyboard1,
  getBackButton
};
