// Admin flow controller
const { safeReply, safeEditMessage, answerCallback, formatPoints, formatDate, chunkMessage } = require('../utils/helpers');
const { getAdminMenu, getUsersListKeyboard, getUserDetailKeyboard, getConfirmKeyboard, getBroadcastSegmentKeyboard, getChannelsListKeyboard, getBackToAdminButton } = require('../keyboards/adminKeyboards');
const { searchUser, updateUserPoints, toggleAdminStatus, getAllUsers } = require('../services/userService');
const { getActiveRewards, removeReward, createReward, grantReward, getUserRewards, removeUserReward } = require('../services/rewardService');
const { addChannel, removeChannel, getAllChannels } = require('../services/channelService');
const { getGeneralStatistics, getLeaderboard } = require('../services/statisticsService');
const logger = require('../utils/logger');
const { Markup } = require('telegraf');
const User = require('../models/User');
const Reward = require('../models/Reward');




/**
 * Admin menyu
 */
async function showAdminMenu(ctx) {
  try {
    const message = `👑 *ADMIN PANEL*\n\n` +
      `Assalomu alaykum, ${ctx.user.name}!\n\n` +
      `Quyidagi funksiyalardan birini tanlang:`;

    if (ctx.callbackQuery) {
      await answerCallback(ctx);
      await safeEditMessage(ctx, message, {
        parse_mode: 'Markdown',
        ...getAdminMenu()
      });
    } else {
      await safeReply(ctx, message, {
        parse_mode: 'Markdown',
        ...getAdminMenu()
      });
    }
  } catch (error) {
    logger.error('Admin menyu xatoligi:', error);
    await safeReply(ctx, '❌ Xatolik yuz berdi.');
  }
}

/**
 * Foydalanuvchi qidirish - boshlash
 */
async function startSearchUser(ctx) {
  try {
    await answerCallback(ctx);

    ctx.session = ctx.session || {};
    ctx.session.waitingFor = 'search_user';

    await safeEditMessage(ctx,
      '🔍 *Foydalanuvchi qidirish*\n\n' +
      'Foydalanuvchining username, telefon raqami yoki ismini yuboring.\n\n' +
      'Bekor qilish uchun /cancel',
      { parse_mode: 'Markdown', ...getBackToAdminButton() }
    );
  } catch (error) {
    logger.error('Qidiruv boshlashda xatolik:', error);
    await safeReply(ctx, '❌ Xatolik yuz berdi.');
  }
}

/**
 * Foydalanuvchini qidirish va ko'rsatish
 */
async function handleSearchUser(ctx, query) {
  try {
    const user = await searchUser(query);

    if (!user) {
      await safeReply(ctx, '❌ Foydalanuvchi topilmadi.\n\nQayta urinib ko\'ring: /admin');
      return;
    }

    const message = `👤 *Foydalanuvchi ma'lumotlari*\n\n` +
      `📛 Ism: ${user.name}\n` +
      `🆔 Username: ${user.username || 'N/A'}\n` +
      `📱 Telefon: ${user.phone || 'N/A'}\n` +
      `💰 Ballar: ${formatPoints(user.points)}\n` +
      `👑 Admin: ${user.isAdmin ? 'Ha' : 'Yo\'q'}\n` +
      `📅 Ro'yxat: ${formatDate(user.createdAt)}`;

    await safeReply(ctx, message, {
      parse_mode: 'Markdown',
      ...getUserDetailKeyboard(user._id)
    });
  } catch (error) {
    logger.error('Foydalanuvchini qidirishda xatolik:', error);
    await safeReply(ctx, '❌ Xatolik yuz berdi.');
  }
}

/**
 * Ball qo'shish - boshlash
 */
/**
 * Ball qo'shish - boshlash
 * Endi foydalanuvchidan xarid summasini so'raydi
 */
async function startAddPoints(ctx, userId = null) {
  try {
    await answerCallback(ctx);

    ctx.session = ctx.session || {};
    ctx.session.waitingFor = 'add_points';
    ctx.session.targetUserId = userId;

    const message = userId
      ? '💵 *Ball qo‘shish*\n\nFoydalanuvchining *xarid summasini* kiriting (so‘mda):\n\nMasalan: `500000`\n\n(Ball summaning 5% qismi sifatida qo‘shiladi)'
      : '💵 *Ball qo‘shish*\n\nAvval foydalanuvchini qidiring: /admin';

    await safeEditMessage(ctx, message, {
      parse_mode: 'Markdown',
      ...getBackToAdminButton()
    });
  } catch (error) {
    logger.error('Ball qo‘shish boshlashda xatolik:', error);
    await safeReply(ctx, '❌ Xatolik yuz berdi.');
  }
}


/**
 * Ball qo‘shish - bajarish (xarid summasining 5% ni ball sifatida qo‘shadi)
 */
async function executeAddPoints(ctx, userId, purchaseAmount) {
  try {
    const User = require('../models/User');
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      await safeReply(ctx, '❌ Foydalanuvchi topilmadi.');
      return;
    }

    // Xarid summasining 5% qismini hisoblaymiz (yaqin butun songa)
    const pointsToAdd = Math.floor(purchaseAmount * 0.05 / 1000); // 1000 so‘m = 0.05 ball (masalan 1 mln = 50 ball)
    // Agar siz 5% ni to‘liq ball sifatida qo‘shmoqchi bo‘lsangiz, pastdagini ishlating:
    // const pointsToAdd = Math.floor(purchaseAmount * 0.05);

    if (pointsToAdd <= 0) {
      await safeReply(ctx, '❌ Kiritilgan summa juda kichik. Kamida 20 000 so‘m kiriting.');
      return;
    }

    await updateUserPoints(userId, pointsToAdd, `Admin tomonidan ${purchaseAmount} so‘mlik xarid uchun qo‘shildi`, ctx.user._id);

    await safeReply(ctx,
      `✅ *Ball qo‘shildi!*\n\n` +
      `👤 Foydalanuvchi: ${targetUser.name}\n` +
      `💵 Xarid summasi: ${purchaseAmount.toLocaleString('uz-UZ')} so‘m\n` +
      `➕ Qo‘shilgan: ${formatPoints(pointsToAdd)} ball\n` +
      `💰 Yangi balans: ${formatPoints(targetUser.points + pointsToAdd)} ball`,
      { parse_mode: 'Markdown', ...getBackToAdminButton() }
    );

    logger.info(`Ball qo‘shildi (xarid orqali): adminId=${ctx.user._id}, userId=${userId}, summa=${purchaseAmount}, points=${pointsToAdd}`);
  } catch (error) {
    logger.error('Ball qo‘shishda xatolik:', error);
    await safeReply(ctx, '❌ Ball qo‘shishda xatolik yuz berdi.');
  }
}


/**
 * Ball ayirish - boshlash
 */
async function startRemovePoints(ctx, userId = null) {
  try {
    await answerCallback(ctx);

    ctx.session = ctx.session || {};
    ctx.session.waitingFor = 'remove_points';
    ctx.session.targetUserId = userId;

    const message = userId
      ? '➖ *Ball ayirish*\n\nQancha ball ayirmoqchisiz?\n\n(Faqat raqam yuboring)'
      : '➖ *Ball ayirish*\n\nAvval foydalanuvchini qidiring: /admin';

    await safeEditMessage(ctx, message, {
      parse_mode: 'Markdown',
      ...getBackToAdminButton()
    });
  } catch (error) {
    logger.error('Ball ayirish boshlashda xatolik:', error);
    await safeReply(ctx, '❌ Xatolik yuz berdi.');
  }
}


// ===== ADMIN CONTROLLER FUNKSIYALARI =====

async function startAddReward(ctx) {
  ctx.session = ctx.session || {};
  ctx.session.waitingFor = 'reward_name';
  await safeReply(ctx, '🎁 Yangi mukofot nomini kiriting:');
}

async function handleRewardName(ctx, text) {
  ctx.session.rewardName = text;
  ctx.session.waitingFor = 'reward_desc';
  await safeReply(ctx, '📄 Mukofot tavsifini kiriting (yoki /skip bosing):');
}

async function handleRewardDesc(ctx, text) {
  if (text === '/skip') {
    ctx.session.rewardDesc = '';
  } else {
    ctx.session.rewardDesc = text;
  }
  ctx.session.waitingFor = 'reward_cost';
  await safeReply(ctx, '💰 Mukofot uchun kerak bo\'ladigan ball miqdorini kiriting:');
}

async function handleRewardCost(ctx, text) {
  const cost = Number(text);

  if (isNaN(cost) || cost < 0) {
    return safeReply(ctx, "❌ Ball son bo'lishi kerak. Qaytadan kiriting:");
  }

  ctx.session.rewardCost = cost;
  ctx.session.waitingFor = 'reward_image';

  await safeReply(
    ctx, 
    '🖼 Endi rasm yuboring:\n\n' +
    '▫️ Oddiy rasm yuborishingiz mumkin\n' +
    '▫️ Yoki kanal postidan link yuboring (t.me/kanal/123)'
  );
}

// Kanal linkini parse qilish
function parseChannelLink(link) {
  // t.me/channel/123 yoki t.me/c/123456/789 formatlarini qo'llab-quvvatlaydi
  let match = link.match(/t\.me\/([a-zA-Z0-9_]+)\/(\d+)/);
  
  if (!match) {
    // Private kanal formati: t.me/c/1234567890/123
    match = link.match(/t\.me\/c\/(\d+)\/(\d+)/);
    if (match) {
      return {
        username: `-100${match[1]}`, // Private kanal ID formati
        messageId: Number(match[2])
      };
    }
    return null;
  }
  
  return {
    username: match[1],
    messageId: Number(match[2])
  };
}

async function handleRewardImage(ctx) {
  const msg = ctx.message;

  // 1️⃣ Oddiy rasm yuborilgan bo'lsa
  if (msg?.photo) {
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    return await saveReward(ctx, fileId);
  }

  // 2️⃣ Link yuborilgan bo'lsa
  if (msg?.text) {
    const linkData = parseChannelLink(msg.text);
    
    if (!linkData) {
      return safeReply(
        ctx, 
        "❌ Rasm yoki to'g'ri kanal post linkini yuboring.\n\n" +
        "Misol: t.me/kanal_nomi/123"
      );
    }

    try {
      // 🔥 Rasmni forward qilamiz (vaqtinchalik)
      const forwarded = await ctx.telegram.forwardMessage(
        ctx.chat.id,
        linkData.username.startsWith('@') ? linkData.username : `@${linkData.username}`,
        linkData.messageId
      );

      // Forward qilingan xabarda rasm borligini tekshirish
      if (!forwarded?.photo || forwarded.photo.length === 0) {
        await ctx.telegram.deleteMessage(ctx.chat.id, forwarded.message_id).catch(() => {});
        return safeReply(ctx, "❌ Ushbu postda rasm yo'q. Iltimos, rasm bor postni tanlang.");
      }

      // Rasm file_id ni olish
      const fileId = forwarded.photo[forwarded.photo.length - 1].file_id;

      // 🗑 Forward qilingan xabarni o'chiramiz (chatda ko'rinmasin)
      await ctx.telegram.deleteMessage(ctx.chat.id, forwarded.message_id).catch(err => {
        console.error('Xabarni o\'chirishda xatolik:', err);
      });

      return await saveReward(ctx, fileId);

    } catch (err) {
      console.error('Kanal postidan rasm olishda xatolik:', err);
      
      let errorMsg = "❌ Linkdan rasmni olishda xatolik.\n\n";
      
      if (err.response?.error_code === 400) {
        errorMsg += "Bot kanalda admin bo'lishi va rasm yuborish huquqi bo'lishi kerak.";
      } else if (err.response?.error_code === 403) {
        errorMsg += "Bot ushbu kanalga kirish huquqiga ega emas.";
      } else {
        errorMsg += "Link to'g'ri ekanligini va bot kanalda admin ekanligini tekshiring.";
      }
      
      return safeReply(ctx, errorMsg);
    }
  }

  return safeReply(ctx, "❌ Iltimos, rasm yoki kanal post linkini yuboring.");
}

async function saveReward(ctx, fileId) {
  try {
    const reward = await Reward.create({
      title: ctx.session.rewardName,
      description: ctx.session.rewardDesc || '',
      costPoints: ctx.session.rewardCost,
      stock: ctx.session.rewardStock ?? -1,
      imageFileId: fileId
    });

    // Muvaffaqiyatli saqlangandan keyin tasdiqlash xabari
    await safeReply(
      ctx,
      `✅ *Mukofot saqlandi!*\n\n` +
      `🎁 *Nomi:* ${reward.title}\n` +
      `📄 *Tavsif:* ${reward.description || 'Mavjud emas'}\n` +
      `💰 *Narxi:* ${reward.costPoints} ball\n\n` +
      `ID: ${reward.id}`,
      { parse_mode: 'Markdown' }
    );

    // Session tozalash
    ctx.session = {};

  } catch (err) {
    console.error('Mukofotni saqlashda xatolik:', err);
    return safeReply(ctx, "❌ Mukofot qo'shishda xatolik yuz berdi. Qaytadan urinib ko'ring.");
  }
}





// async function handleRewardDesc(ctx, text) {
//   const title = ctx.session.rewardName;
//   const description = text || '';
//   const costPoints = ctx.session.rewardCost || 0; // agar ball talab qilinsa
//   const stock = ctx.session.rewardStock ?? -1; // cheksiz bo‘lishi mumkin

//   try {
//     const reward = await createReward(title, description, costPoints, stock);
//     await safeReply(ctx, `✅ Mukofot muvaffaqiyatli qo‘shildi!\n🎁 Nom: ${reward.title}\n📄 Tavsif: ${reward.description}`);
//   } catch (error) {
//     console.error(error);
//     await safeReply(ctx, '❌ Mukofot qo‘shishda xatolik yuz berdi.');
//   }
//   ctx.session = {};
// }

async function showRemoveReward(ctx) {
  const rewards = await getActiveRewards();
  if (rewards.length === 0) {
    return ctx.reply('❌ Faol mukofotlar mavjud emas.');
  }

  const buttons = rewards.map(r =>
    [Markup.button.callback(`❌ ${r.title}`, `admin_remove_rwd_${r._id}`)]
  );

  buttons.push([Markup.button.callback('🔙 Orqaga', 'admin_main')]);

  await ctx.reply('🗑️ O‘chirmoqchi bo‘lgan mukofotni tanlang:', Markup.inlineKeyboard(buttons));
}


async function executeRemoveReward(ctx, rewardId) {
  try {
    await removeReward(rewardId);
    await safeReply(ctx, '✅ Mukofot muvaffaqiyatli o\'chirildi.');
  } catch (error) {
    console.error(error);
    await safeReply(ctx, '❌ Mukofot o\'chirishda xatolik yuz berdi.');
  }
}


/**
 * Ball ayirish - bajarish
 */
async function executeRemovePoints(ctx, userId, amount) {
  try {
    const User = require('../models/User');
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      await safeReply(ctx, '❌ Foydalanuvchi topilmadi.');
      return;
    }

    if (targetUser.points < amount) {
      await safeReply(ctx,
        `❌ Foydalanuvchida yetarli ball yo'q!\n\n` +
        `Hozirgi balans: ${formatPoints(targetUser.points)} ball`
      );
      return;
    }

    await updateUserPoints(userId, -amount, `Admin tomonidan ayirildi`, ctx.user._id);

    await safeReply(ctx,
      `✅ *Ball ayirildi!*\n\n` +
      `👤 Foydalanuvchi: ${targetUser.name}\n` +
      `➖ Ayirilgan: ${formatPoints(amount)} ball\n` +
      `💰 Yangi balans: ${formatPoints(targetUser.points - amount)} ball`,
      { parse_mode: 'Markdown', ...getBackToAdminButton() }
    );

    logger.info(`Ball ayirildi: adminId=${ctx.user._id}, userId=${userId}, amount=${amount}`);
  } catch (error) {
    logger.error('Ball ayirishda xatolik:', error);
    await safeReply(ctx, '❌ Ball ayirishda xatolik yuz berdi.');
  }
}

/**
 * Admin qilish/olish
 */
async function toggleAdmin(ctx, userId, makeAdmin) {
  try {
    await answerCallback(ctx);

    const User = require('../models/User');
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      await safeReply(ctx, '❌ Foydalanuvchi topilmadi.');
      return;
    }

    await toggleAdminStatus(userId, makeAdmin);

    const message = makeAdmin
      ? `✅ *${targetUser.name}* adminlikka tayinlandi! 👑`
      : `✅ *${targetUser.name}* adminlikdan olindi.`;

    await safeEditMessage(ctx, message, {
      parse_mode: 'Markdown',
      ...getBackToAdminButton()
    });

    logger.info(`Admin status o'zgartirildi: adminId=${ctx.user._id}, userId=${userId}, makeAdmin=${makeAdmin}`);
  } catch (error) {
    logger.error('Admin statusni o\'zgartirishda xatolik:', error);
    await safeReply(ctx, '❌ Xatolik yuz berdi.');
  }
}

/**
 * Broadcast xabar - segment tanlash
 */
async function startBroadcast(ctx) {
  try {
    await answerCallback(ctx);

    const message = '📢 *Xabar yuborish*\n\n' +
      'Kimga xabar yubormoqchisiz?';

    await safeEditMessage(ctx, message, {
      parse_mode: 'Markdown',
      ...getBroadcastSegmentKeyboard()
    });
  } catch (error) {
    logger.error('Broadcast boshlashda xatolik:', error);
    await safeReply(ctx, '❌ Xatolik yuz berdi.');
  }
}

/**
 * Broadcast segment tanlash
 */
async function selectBroadcastSegment(ctx, segment) {
  try {
    await answerCallback(ctx);

    ctx.session = ctx.session || {};
    ctx.session.waitingFor = 'broadcast_message';
    ctx.session.broadcastSegment = segment;

    const segmentText = segment === 'all' ? 'barcha foydalanuvchilarga'
      : segment === 'admins' ? 'faqat adminlarga'
        : 'oddiy foydalanuvchilarga';

    await safeEditMessage(ctx,
      `📢 *Xabar yuborish*\n\n` +
      `Segment: ${segmentText}\n\n` +
      `Yubormoqchi bo'lgan xabaringizni yozing:\n\n` +
      `Bekor qilish: /cancel`,
      { parse_mode: 'Markdown', ...getBackToAdminButton() }
    );
  } catch (error) {
    logger.error('Broadcast segment tanlashda xatolik:', error);
    await safeReply(ctx, '❌ Xatolik yuz berdi.');
  }
}

/**
 * Broadcast xabarni yuborish
 */
async function executeBroadcast(ctx, segment, message) {
  try {
    let filter = {};

    if (segment === 'admins') {
      filter = { isAdmin: true };
    } else if (segment === 'users') {
      filter = { isAdmin: false };
    }

    const users = await getAllUsers(filter);

    await safeReply(ctx,
      `📤 Xabar yuborilmoqda ${users.length} ta foydalanuvchiga... ⏳`
    );

    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        await ctx.telegram.sendMessage(user.telegramId,
          `📢 *ADMIN XABARI*\n\n${message}`,
          { parse_mode: 'Markdown' }
        );
        successCount++;

        // Rate limiting uchun kichik kechikish
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        failCount++;
        logger.error(`Broadcast xatoligi userId=${user.telegramId}:`, error);
      }
    }

    await safeReply(ctx,
      `✅ *Broadcast yakunlandi!*\n\n` +
      `📤 Yuborildi: ${successCount}\n` +
      `❌ Xatolik: ${failCount}\n` +
      `📊 Jami: ${users.length}`,
      { parse_mode: 'Markdown', ...getBackToAdminButton() }
    );

    logger.info(`Broadcast bajarildi: adminId=${ctx.user._id}, segment=${segment}, success=${successCount}, fail=${failCount}`);
  } catch (error) {
    logger.error('Broadcast bajarishda xatolik:', error);
    await safeReply(ctx, '❌ Xabar yuborishda xatolik yuz berdi.');
  }
}

/**
 * Kanal qo'shish - boshlash
 */
async function startAddChannel(ctx) {
  try {
    await answerCallback(ctx);

    ctx.session = ctx.session || {};
    ctx.session.waitingFor = 'add_channel_title';

    await safeEditMessage(ctx,
      '📺 *Kanal qo\'shish*\n\n' +
      'Kanal nomini yozing:\n\n' +
      'Bekor qilish: /cancel',
      { parse_mode: 'Markdown', ...getBackToAdminButton() }
    );
  } catch (error) {
    logger.error('Kanal qo\'shish boshlashda xatolik:', error);
    await safeReply(ctx, '❌ Xatolik yuz berdi.');
  }
}

/**
 * Kanalni o'chirish - ro'yxat
 */
async function showRemoveChannel(ctx) {
  try {
    await answerCallback(ctx);

    const channels = await getAllChannels();

    if (channels.length === 0) {
      await safeEditMessage(ctx, '❌ Kanallar mavjud emas.', getBackToAdminButton());
      return;
    }

    const message = '🗑 *Kanalni o\'chirish*\n\n' +
      'Qaysi kanalni o\'chirmoqchisiz?';

    await safeEditMessage(ctx, message, {
      parse_mode: 'Markdown',
      ...getChannelsListKeyboard(channels, 'remove_ch')
    });
  } catch (error) {
    logger.error('Kanallarni ko\'rsatishda xatolik:', error);
    await safeReply(ctx, '❌ Xatolik yuz berdi.');
  }
}



async function adminConfirmRewardHandler(ctx) {
  const userId = ctx.match[1];
  const rewardId = ctx.match[2];

  const user = await User.findById(userId);
  const reward = await Reward.findById(rewardId);
  if (!user || !reward) return;

  user.points -= reward.pointsRequired;
  await user.save();

  const userReward = await grantReward(userId, rewardId, ctx.from.id);

  await safeEditMessage(ctx, `✅ Mukofot ${user.name} ga berildi.`);

  await ctx.telegram.sendMessage(
    user.telegramId,
    `🎉 Sizga mukofot berildi!\n🎁 ${reward.title}\n🎯 Ballingiz: ${user.points}`
  );
}

async function adminCancelRewardHandler(ctx) {
  const userId = ctx.match[1];
  const rewardId = ctx.match[2];

  const user = await User.findById(userId);
  const reward = await Reward.findById(rewardId);
  if (!user || !reward) return;

  await safeEditMessage(ctx, `❌ Mukofot olish so‘rovi bekor qilindi: ${user.name}`);
  await ctx.telegram.sendMessage(user.telegramId, `❌ Mukofot olish so‘rovingiz bekor qilindi: ${reward.title}`);
}


/**
 * Kanalni o'chirish - bajarish
 */
async function executeRemoveChannel(ctx, channelId) {
  try {
    await answerCallback(ctx);

    const channel = await removeChannel(channelId);

    await safeEditMessage(ctx,
      `✅ *Kanal o'chirildi!*\n\n` +
      `📺 Kanal: ${channel.title}`,
      { parse_mode: 'Markdown', ...getBackToAdminButton() }
    );

    logger.info(`Kanal o'chirildi: adminId=${ctx.user._id}, channelId=${channelId}`);
  } catch (error) {
    logger.error('Kanalni o\'chirishda xatolik:', error);
    await safeReply(ctx, '❌ Kanalni o\'chirishda xatolik yuz berdi.');
  }
}
async function showStatistics(ctx) {
  try {
    await answerCallback(ctx);

    const [stats, topUsers] = await Promise.all([
      getGeneralStatistics(),
      getLeaderboard(10)
    ]);

    if (!stats) {
      await safeEditMessage(ctx, '❌ Statistika olishda xatolik.', getBackToAdminButton());
      return;
    }

    const message = `📊 *STATISTIKA*\n\n` +
      `👥 Foydalanuvchilar: ${stats.totalUsers}\n` +
      `👑 Adminlar: ${stats.totalAdmins}\n` +
      `🎁 Faol mukofotlar: ${stats.totalRewards}\n` +
      `🎉 Olingan mukofotlar: ${stats.claimedRewards}\n` +
      `💰 Jami ballar: ${formatPoints(stats.totalPoints)}\n\n` +
      `🏆 *TOP 10 FOYDALANUVCHILAR:*\n\n` +
      topUsers.map((u, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        return `${medal} ${u.name} - ${formatPoints(u.points)}`;
      }).join('\n');

    await safeEditMessage(ctx, message, {
      parse_mode: 'Markdown',
      ...getBackToAdminButton()
    });
  } catch (error) {
    logger.error('Statistika ko\'rsatishda xatolik:', error);
    await safeReply(ctx, '❌ Xatolik yuz berdi.');
  }
}

module.exports = {
  showAdminMenu,
  startSearchUser,
  handleSearchUser,
  startAddPoints,
  executeAddPoints,
  startRemovePoints,
  executeRemovePoints,
  toggleAdmin,
  startBroadcast,
  selectBroadcastSegment,
  executeBroadcast,
  startAddChannel,
  showRemoveChannel,
  executeRemoveChannel,
  showStatistics,
  executeRemoveReward,
  showRemoveReward,
  startAddReward,
  handleRewardImage,
  handleRewardCost,
  handleRewardDesc,
  handleRewardName,
  adminCancelRewardHandler,
  adminConfirmRewardHandler

};
