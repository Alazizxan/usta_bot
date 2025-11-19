// src/controllers/rewardController.js
const RewardService = require('../services/rewardService');
const UserService = require('../services/userService');
const logger = require('../utils/logger');
const { mainMenuKeyboard } = require('../keyboards/userKeyboards');

/**
 * Show available rewards
 */
async function listRewards(ctx) {
  try {
    const rewards = await RewardService.listRewards();
    if (!rewards || rewards.length === 0) {
      await ctx.reply('No rewards available right now.', mainMenuKeyboard());
      return;
    }

    for (const r of rewards) {
      const text = `🎁 ${r.title}\nCost: ${r.costPoints} points\nStock: ${r.stock}\n${r.description || ''}`;
      const keyboard = {
        reply_markup: {
          inline_keyboard: [[{ text: 'Claim', callback_data: `claim_reward:${r._id}` }]],
        },
      };
      await ctx.reply(text, keyboard);
    }
  } catch (err) {
    logger.error('listRewards error', err);
    await ctx.reply('Unable to list rewards now.');
  }
}

/**
 * Show user's points
 */
async function myPoints(ctx) {
  try {
    const telegramId = ctx.from.id;
    const user = await UserService.findByTelegramId(telegramId);
    const points = user ? user.points : 0;
    await ctx.reply(`You have ${points} points.`, mainMenuKeyboard());
  } catch (err) {
    logger.error('myPoints error', err);
    await ctx.reply('Unable to fetch your points.');
  }
}

/**
 * Claim reward
 */
async function claimReward(ctx, rewardId) {
  try {
    const telegramId = ctx.from.id;
    const result = await RewardService.claimRewardForUser(telegramId, rewardId, ctx.telegram);
    if (result.success) {
      await ctx.reply(`✅ Reward claimed: ${result.reward.title}. Check "My Rewards".`, mainMenuKeyboard());
    } else {
      await ctx.reply(`❌ ${result.message}`, mainMenuKeyboard());
    }
  } catch (err) {
    logger.error('claimReward error', err);
    await ctx.reply('Failed to claim reward due to an internal error.');
  }
}

/**
 * Show user's claimed rewards
 */
async function myRewards(ctx) {
  try {
    const telegramId = ctx.from.id;
    const items = await RewardService.getUserRewards(telegramId);
    if (!items || items.length === 0) {
      await ctx.reply('You have not claimed any rewards yet.', mainMenuKeyboard());
      return;
    }
    for (const it of items) {
      await ctx.reply(`🎁 ${it.reward.title}\nStatus: ${it.status}\nClaimed: ${it.claimedAt}`);
    }
  } catch (err) {
    logger.error('myRewards error', err);
    await ctx.reply('Unable to fetch your rewards.');
  }
}

/**
 * Leaderboard top 10
 */
async function topUsers(ctx) {
  try {
    const top = await UserService.getTopUsers(10);
    if (!top || top.length === 0) {
      await ctx.reply('No users found yet.', mainMenuKeyboard());
      return;
    }
    let text = '🏆 Top users:\n';
    top.forEach((u, idx) => {
      text += `${idx + 1}. ${u.name || u.username || 'User'} — ${u.points} pts\n`;
    });
    await ctx.reply(text, mainMenuKeyboard());
  } catch (err) {
    logger.error('topUsers error', err);
    await ctx.reply('Unable to fetch leaderboard.');
  }
}

module.exports = {
  listRewards,
  myPoints,
  claimReward,
  myRewards,
  topUsers,
};
