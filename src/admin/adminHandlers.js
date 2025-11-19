// src/admin/adminHandlers.js
const AdminService = require('../services/adminService');
const UserService = require('../services/userService');
const Reward = require('../models/Reward');

/**
 * Handle admin callback queries and workflows.
 * For brevity this file contains basic handlers: broadcast, stats, grant points.
 * Each handler should be wired in bot.js under admin middleware.
 */

async function adminStatsHandler(ctx) {
  try {
    const stats = await AdminService.getStatistics();
    await ctx.reply(`Stats:\nTotal users: ${stats.totalUsers}\nTotal points: ${stats.totalPoints}\nActive (7d): ${stats.activeUsers7d}`);
  } catch (err) {
    await ctx.reply('Failed to fetch stats.');
  }
}

async function adminBroadcastStart(ctx) {
  // ask for broadcast text
  ctx.session = ctx.session || {};
  ctx.session.adminAction = 'broadcast';
  await ctx.reply('Send the broadcast message text (it will be sent to all users):');
}

async function adminGrantPointsStart(ctx) {
  ctx.session = ctx.session || {};
  ctx.session.adminAction = 'grant_points';
  await ctx.reply('Send target user telegram id and amount like: <telegramId> <amount> (use negative amount to subtract)');
}

/**
 * Process admin text flows
 */
async function adminTextFlow(ctx) {
  ctx.session = ctx.session || {};
  const action = ctx.session.adminAction;
  if (!action) {
    await ctx.reply('No admin action in progress.');
    return;
  }

  if (action === 'broadcast') {
    const text = ctx.message.text;
    const res = await AdminService.broadcast(text, ctx.telegram);
    await ctx.reply(`Broadcast finished: success ${res.successCount}, fail ${res.failCount}`);
    ctx.session.adminAction = null;
    return;
  }

  if (action === 'grant_points') {
    const parts = ctx.message.text.split(/\s+/);
    if (parts.length < 2) {
      await ctx.reply('Invalid format. Use: <telegramId> <amount>');
      return;
    }
    const targetId = Number(parts[0]);
    const amount = Number(parts[1]);
    if (Number.isNaN(targetId) || Number.isNaN(amount)) {
      await ctx.reply('Invalid numbers.');
      return;
    }
    const adminId = ctx.from.id;
    const res = await AdminService.adminChangePoints(targetId, amount, `Admin ${adminId} change`, adminId);
    if (res.success) await ctx.reply('Points updated.');
    else await ctx.reply(`Failed: ${res.message}`);
    ctx.session.adminAction = null;
    return;
  }
}

async function adminShowRewardsList(ctx) {
  const rewards = await Reward.find({}).lean();
  if (!rewards || rewards.length === 0) {
    await ctx.reply('No rewards defined.');
    return;
  }
  let text = 'Rewards:\n';
  rewards.forEach((r) => {
    text += `${r._id} - ${r.title} (${r.costPoints} pts, stock ${r.stock})\n`;
  });
  ctx.session = ctx.session || {};
  ctx.session.adminAction = 'select_reward_to_grant';
  await ctx.reply(text + '\nSend: <telegramId> <rewardId>');
}

async function adminHandleGrantReward(ctx) {
  ctx.session = ctx.session || {};
  const action = ctx.session.adminAction;
  if (action !== 'select_reward_to_grant') {
    await ctx.reply('No reward grant in progress.');
    return;
  }
  const parts = ctx.message.text.split(/\s+/);
  if (parts.length < 2) {
    await ctx.reply('Invalid format. Use: <telegramId> <rewardId>');
    return;
  }
  const telegramId = Number(parts[0]);
  const rewardId = parts[1].trim();
  const adminId = ctx.from.id;
  const res = await AdminService.adminGrantRewardToUser(telegramId, rewardId, adminId);
  if (res.success) await ctx.reply('Reward granted.');
  else await ctx.reply('Failed: ' + res.message);
  ctx.session.adminAction = null;
}

module.exports = {
  adminStatsHandler,
  adminBroadcastStart,
  adminGrantPointsStart,
  adminTextFlow,
  adminShowRewardsList,
  adminHandleGrantReward,
};
