// Foydalanuvchi flow controller
const { safeReply, safeEditMessage, answerCallback, formatPoints, formatDate } = require('../utils/helpers');
const { getMainMenu, getRewardsListKeyboard, getRewardsListKeyboard1,getRewardConfirmKeyboard, getBackButton } = require('../keyboards/userKeyboards');
const { getActiveRewards, claimReward, getUserRewards } = require('../services/rewardService');
const { getLeaderboard } = require('../services/statisticsService');
const logger = require('../utils/logger');

/**
 * Asosiy menyu
 */
async function showMainMenu(ctx) {
  try {
    const message = `👋 Xush kelibsiz, ${ctx.user.name}!\n\n` +
      `💰 Sizning ballaringiz: ${formatPoints(ctx.user.points)}\n\n` +
      `Quyidagi menyudan kerakli bo'limni tanlang:`;

    if (ctx.callbackQuery) {
      await answerCallback(ctx);
      await safeEditMessage(ctx, message, getMainMenu());
    } else {
      await safeReply(ctx, message, getMainMenu());
    }
  } catch (error) {
    logger.error('Asosiy menyu xatoligi:', error);
    await safeReply(ctx, '❌ Xatolik yuz berdi. /start ni bosing.');
  }
}

/**
 * Mening ballarim
 */
async function showMyPoints(ctx) {
  try {
    await answerCallback(ctx);
    
    const message = `🪙 *Sizning ballaringiz*\n\n` +
      `💰 Joriy ballar: *${formatPoints(ctx.user.points)}*\n` +
      `📅 Ro'yxatdan o'tgan: ${formatDate(ctx.user.createdAt)}\n\n` +
      `Ballarni mukofotlar olish uchun ishlatishingiz mumkin! 🎁`;

    await safeEditMessage(ctx, message, {
      parse_mode: 'Markdown',
      ...getBackButton('user_main_menu')
    });
  } catch (error) {
    logger.error('Ballarni ko\'rsatishda xatolik:', error);
    await safeReply(ctx, '❌ Xatolik yuz berdi.');
  }
}

/**
 * Mukofotlar ro'yxati
 */
async function showRewards(ctx, pageIndex = 0) {
  try {
    await answerCallback(ctx);
    
    const rewards = await getActiveRewards();
    
    if (rewards.length === 0) {
      await safeEditMessage(
        ctx, 
        '❌ Hozircha mukofotlar mavjud emas.\n\n' +
        '🔜 Tez orada yangi mukofotlar qo\'shiladi!',
        getBackButton('user_main_menu')
      );
      return;
    }

    const reward = rewards[pageIndex];
    const totalPages = rewards.length;
    const pageNumber = pageIndex + 1;

    // Mukofot matni
    const caption = 
      `🎁 *${reward.title}*\n\n` +
      `📝 *Tavsif:*\n${reward.description || 'Tavsif kiritilmagan'}\n\n` +
      `💰 *Narxi:* ${formatPoints(reward.costPoints)} ball\n` +
      `📦 *Qolgan:* ${reward.stock === -1 ? '♾️ Cheksiz' : `${reward.stock} ta`}\n\n` +
      `📄 Sahifa: ${pageNumber}/${totalPages}`;

    // Navigatsiya tugmalari
    const navigationButtons = [];
    
    // Oldingi va Keyingi tugmalar
    const navRow = [];
    if (pageIndex > 0) {
      navRow.push({
        text: '◀️ Oldingi',
        callback_data: `reward_page:${pageIndex - 1}`
      });
    }
    if (pageIndex < totalPages - 1) {
      navRow.push({
        text: '▶️ Keyingi',
        callback_data: `reward_page:${pageIndex + 1}`
      });
    }
    if (navRow.length > 0) {
      navigationButtons.push(navRow);
    }

    // Orqaga tugmasi
    navigationButtons.push([
      {
        text: '🔙 Orqaga',
        callback_data: 'user_main_menu'
      }
    ]);

    const keyboard = {
      inline_keyboard: navigationButtons
    };

    // Rasmli mukofotni yuborish
    if (reward.imageFileId) {
      // Agar oldingi xabar bo'lsa, o'chiramiz
      if (ctx.callbackQuery?.message?.message_id) {
        await ctx.deleteMessage().catch(() => {});
      }

      await ctx.replyWithPhoto(reward.imageFileId, {
        caption: caption,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } else {
      // Rasm bo'lmasa oddiy xabar
      if (ctx.callbackQuery) {
        await safeEditMessage(ctx, caption, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } else {
        await safeReply(ctx, caption, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }
    }

  } catch (error) {
    logger.error('Mukofotlarni ko\'rsatishda xatolik:', error);
    await safeReply(ctx, '❌ Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
  }
}

/**
 * Mening mukofotlarim
 */
async function showMyRewards(ctx) {
  try {
    await answerCallback(ctx);
    
    const userRewards = await getUserRewards(ctx.user._id);
    
    if (userRewards.length === 0) {
      await safeEditMessage(ctx, '❌ Sizda hali mukofotlar yo\'q.\n\nMukofot olish uchun ballar to\'plang! 💪', 
        getBackButton('user_main_menu'));
      return;
    }

    const message = '🎉 *Mening mukofotlarim:*\n\n' +
      userRewards.map((ur, i) => 
        `${i + 1}. *${ur.rewardId?.title}*\n` +
        `   📅 Olingan: ${formatDate(ur.claimedAt)}\n` +
        `   📊 Status: ${ur.status === 'claimed' ? '✅ Olingan' : ur.status === 'delivered' ? '🚚 Yetkazilgan' : '❌ Bekor qilingan'}\n`
      ).join('\n');

    await safeEditMessage(ctx, message, {
      parse_mode: 'Markdown',
      ...getBackButton('user_main_menu')
    });
  } catch (error) {
    logger.error('Mening mukofotlarimni ko\'rsatishda xatolik:', error);
    await safeReply(ctx, '❌ Xatolik yuz berdi.');
  }
}

/**
 * Mukofot olish - tanlov
 */
async function showClaimReward(ctx) {
  try {
    await answerCallback(ctx);
    
    const rewards = await getActiveRewards();
    
    if (rewards.length === 0) {
      await safeEditMessage(ctx, '❌ Hozircha mukofotlar mavjud emas.', getBackButton('user_main_menu'));
      return;
    }

    // Faqat yetarli balli mukofotlarni ko'rsatish
    const availableRewards = rewards.filter(r => r.costPoints <= ctx.user.points);

    if (availableRewards.length === 0) {
      await safeEditMessage(ctx, 
        `❌ Sizda mukofot olish uchun yetarli ball yo'q.\n\n` +
        `💰 Sizning ballaringiz: ${formatPoints(ctx.user.points)}\n` +
        `🎁 Eng arzon mukofot: ${formatPoints(rewards[0].costPoints)} ball\n\n` +
        `Ko'proq ball to'plang! 💪`, 
        getBackButton('user_main_menu')
      );
      return;
    }

    const message = '💰 *Mukofot olish*\n\n' +
      `Sizning ballaringiz: *${formatPoints(ctx.user.points)}*\n\n` +
      `Qaysi mukofotni olmoqchisiz?`;

    await safeEditMessage(ctx, message, {
      parse_mode: 'Markdown',
      ...getRewardsListKeyboard(availableRewards, 'claim_reward')
    });
  } catch (error) {
    logger.error('Mukofot olish menyusida xatolik:', error);
    await safeReply(ctx, '❌ Xatolik yuz berdi.');
  }
}

/**
 * Mukofotni tasdiqlash
 */
async function confirmClaimReward(ctx, rewardId) {
  try {
    await answerCallback(ctx);
    
    const Reward = require('../models/Reward');
    const reward = await Reward.findById(rewardId);
    
    if (!reward || !reward.isActive) {
      await safeEditMessage(ctx, '❌ Mukofot mavjud emas.', getBackButton('user_claim_reward'));
      return;
    }

    if (reward.stock !== -1 && reward.stock <= 0) {
      await safeEditMessage(ctx, '❌ Bu mukofot tugagan.', getBackButton('user_claim_reward'));
      return;
    }

    if (ctx.user.points < reward.costPoints) {
      await safeEditMessage(ctx, 
        `❌ Yetarli ball yo'q!\n\n` +
        `Kerak: ${formatPoints(reward.costPoints)}\n` +
        `Sizda: ${formatPoints(ctx.user.points)}`, 
        getBackButton('user_claim_reward')
      );
      return;
    }

    const message = `🎁 *Mukofotni tasdiqlang*\n\n` +
      `📦 Mukofot: *${reward.title}*\n` +
      `📝 Ta'rif: ${reward.description}\n` +
      `💰 Narxi: ${formatPoints(reward.costPoints)} ball\n\n` +
      `Ushbu mukofotni olishni tasdiqlaysizmi?`;

    await safeEditMessage(ctx, message, {
      parse_mode: 'Markdown',
      ...getRewardConfirmKeyboard(rewardId)
    });
  } catch (error) {
    logger.error('Mukofotni tasdiqlashda xatolik:', error);
    await safeReply(ctx, '❌ Xatolik yuz berdi.');
  }
}

/**
 * Mukofotni atomik olish
 */
async function executeClaimReward(ctx, rewardId) {
  try {
    await answerCallback(ctx, 'Mukofot olinmoqda... ⏳');
    
    const result = await claimReward(ctx.user._id, rewardId);
    
    // User ob'ektini yangilash
    ctx.user = result.user;
    
    const message = `✅ *Tabriklaymiz!*\n\n` +
      `🎁 Siz *${result.reward.title}* mukofotini oldingiz!\n` +
      `💰 Qolgan ballar: ${formatPoints(result.user.points)}\n\n` +
      `Mukofotingiz tez orada yetkaziladi! 🚚`;

    await safeEditMessage(ctx, message, {
      parse_mode: 'Markdown',
      ...getBackButton('user_main_menu')
    });
    
    logger.info(`Mukofot muvaffaqiyatli olindi: userId=${ctx.user._id}, rewardId=${rewardId}`);
  } catch (error) {
    logger.error('Mukofotni olishda xatolik:', error);
    
    let errorMessage = '❌ Mukofotni olishda xatolik yuz berdi.';
    
    if (error.message.includes('Yetarli ball yo\'q')) {
      errorMessage = '❌ Yetarli ball yo\'q!';
    } else if (error.message.includes('Mukofot tugagan')) {
      errorMessage = '❌ Bu mukofot tugagan.';
    }
    
    await safeEditMessage(ctx, errorMessage, getBackButton('user_claim_reward'));
  }
}


async function userClaimRewardHandler(ctx) {
  const rewardId = ctx.match[1];
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user) return;

  const reward = await Reward.findById(rewardId);
  if (!reward) return await safeReply(ctx, '❌ Mukofot topilmadi.');

  if (ctx.user.points < reward.pointsRequired) {
    return await safeReply(ctx, `❌ Sizda yetarli ball yo'q!`);
  }

  // Adminlarga xabar yuborish
  const admins = await User.find({ isAdmin: true });
  for (const admin of admins) {
    await ctx.telegram.sendMessage(
      admin.telegramId,
      `🛡️ ${ctx.user.name} mukofotni olishni xohladi:\n🎁 ${reward.title}`,
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ Tasdiqlash', `admin_confirm_reward_${ctx.user._id}_${reward._id}`)],
        [Markup.button.callback('❌ Bekor qilish', `admin_cancel_reward_${ctx.user._id}_${reward._id}`)]
      ])
    );
  }

  await safeReply(ctx, '⏳ Mukofot olish so‘rovi adminga yuborildi. Tasdiqlanishini kuting.');
}



/**
 * Top 10 foydalanuvchilar
 */
async function showLeaderboard(ctx) {
  try {
    await answerCallback(ctx);
    
    const topUsers = await getLeaderboard(10);
    
    if (topUsers.length === 0) {
      await safeEditMessage(ctx, '❌ Leaderboard bo\'sh.', getBackButton('user_main_menu'));
      return;
    }

    const message = '🏆 *TOP 10 FOYDALANUVCHILAR*\n\n' +
      topUsers.map((user, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        return `${medal} *${user.name}* \n` +
          `💰 ${formatPoints(user.points)} ball\n`;
      }).join('\n');

    await safeEditMessage(ctx, message, {
      parse_mode: 'Markdown',
      ...getBackButton('user_main_menu')
    });
  } catch (error) {
    logger.error('Leaderboard ko\'rsatishda xatolik:', error);
    await safeReply(ctx, '❌ Xatolik yuz berdi.');
  }
}
module.exports = {
  showMainMenu,
  showMyPoints,
  showRewards,
  showMyRewards,
  showClaimReward,
  confirmClaimReward,
  executeClaimReward,
  showLeaderboard,
  userClaimRewardHandler
};
