// Asosiy bot konfiguratsiyasi va handler'lar
const { Telegraf, Markup, session } = require('telegraf');
const logger = require('./utils/logger');
const { asyncHandler, safeReply, safeEditMessage } = require('./utils/helpers');
const { getActiveRewards } = require('./services/rewardService');
const { getBackToAdminButton } = require('./keyboards/adminKeyboards');
const { userClaimRewardHandler } = require('./controllers/userController');
const { adminCancelRewardHandler, adminConfirmRewardHandler } = require('./controllers/adminController');
// Middlewares
const { ensureUser, getOrCreateUser } = require('./middlewares/authMiddleware');
const { isAdmin } = require('./middlewares/adminMiddleware');
const { checkChannelSubscription } = require('./middlewares/channelMiddleware');
const Reward = require('./models/Reward');
const { grantReward } = require('./services/rewardService');







const pendingRewards = new Map();




// Controllers
const userController = require('./controllers/userController');
const adminController = require('./controllers/adminController');

// Services
const { updateUserPhone } = require('./services/userService');
const { addChannel } = require('./services/channelService');

// Models
const User = require('./models/User');

// Bot yaratish
const bot = new Telegraf(process.env.BOT_TOKEN);

// Session middleware
bot.use(session());

// Global error handler
bot.catch((err, ctx) => {
  logger.error('Bot xatoligi:', err);
  safeReply(ctx, '❌ Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
});

// ==================== START COMMAND ====================
bot.command('start', asyncHandler(async (ctx) => {
  const telegramId = ctx.from.id;
  let user = await User.findOne({ telegramId });

  if (!user) {
    // Yangi foydalanuvchi - ism so'rash
    ctx.session = ctx.session || {};
    ctx.session.registrationStep = 'name';

    await ctx.reply(
      '👋 Assalomu alaykum!\n\n' +
      'Botdan foydalanish uchun ro\'yxatdan o\'ting.\n\n' +
      '📝 Ismingizni kiriting:'
    );
    return;
  }

  // Mavjud foydalanuvchi
  ctx.user = user;
  await userController.showMainMenu(ctx);
}));

// ==================== CANCEL COMMAND ====================
bot.command('cancel', asyncHandler(async (ctx) => {
  ctx.session = {};
  await safeReply(ctx, '❌ Jarayon bekor qilindi. /start');
}));

// ==================== ADMIN COMMAND ====================
bot.command('admin', asyncHandler(async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (!user || !user.isAdmin) {
    await safeReply(ctx, '❌ Bu komanda faqat adminlar uchun!');
    return;
  }

  ctx.user = user;
  await adminController.showAdminMenu(ctx);
}));

bot.on('photo', async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return;

  const photo = ctx.message.photo.at(-1);
  const admins = await User.find({ isAdmin: true });

  for (const admin of admins) {
    const sent = await ctx.telegram.sendPhoto(
      admin.telegramId,
      photo.file_id,
      {
        caption:
          `📸 Yangi rasm\n👤 ${user.name}\n✍️ Rasmga javob qilib ball yozing`,
        parse_mode: 'Markdown'
      }
    );

    pendingRewards.set(sent.message_id, {
      userId: user._id
    });
  }
});




// ==================== TEXT MESSAGE HANDLER ====================
bot.on('text', asyncHandler(async (ctx) => {
  const text = ctx.message.text;


  if (ctx.message?.reply_to_message) {
    const repliedMsgId = ctx.message.reply_to_message.message_id;

    const data = pendingRewards.get(repliedMsgId);
    if (data) {
      const admin = await User.findOne({ telegramId: ctx.from.id });
      if (!admin || !admin.isAdmin) return;

      const amount = parseInt(ctx.message.text);
      if (isNaN(amount)) {
        return ctx.reply('❌ Iltimos, faqat raqam kiriting');
      }

      const user = await User.findById(data.userId);
      if (!user) return;

      user.points += amount;
      await user.save();

      await ctx.telegram.sendMessage(
        user.telegramId,
        `🎉 Sizga ${amount} ball qo‘shildi!\n💰 Jami: ${user.points}`
      );

      await ctx.reply(`✅ ${user.name} ga ${amount} ball qo‘shildi`);

      pendingRewards.delete(repliedMsgId);
      return; // ⬅️ MUHIM
    }
  }



  // Session holatini tekshirish
  if (ctx.session && ctx.session.registrationStep) {
    // Ro'yxatdan o'tish jarayoni
    if (ctx.session.registrationStep === 'name') {
      ctx.session.userName = text;
      ctx.session.registrationStep = 'phone';

      await ctx.reply(
        '📱 Telefon raqamingizni yuboring:\n\n' +
        'Quyidagi tugmani bosing yoki raqamni yozing.',
        Markup.keyboard([
          Markup.button.contactRequest('📱 Telefon raqamni yuborish')
        ]).resize().oneTime()
      );
      return;
    }
  }

  // Admin session handlerlari
  if (ctx.session && ctx.session.waitingFor) {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user || !user.isAdmin) {
      await safeReply(ctx, '❌ Ruxsat yo\'q!');
      return;
    }

    ctx.user = user;

    switch (ctx.session.waitingFor) {
      case 'search_user':
        await adminController.handleSearchUser(ctx, text);
        ctx.session = {};
        break;
      case 'reward_name':
        await adminController.handleRewardName(ctx, text);
        break;

      case 'reward_desc':
        await adminController.handleRewardDesc(ctx, text);
        break;

      case 'reward_cost':
        await adminController.handleRewardCost(ctx, text);
        break;

      case 'reward_image':
        await adminController.handleRewardImage(ctx);
        break;


      case 'add_points':
        const addAmount = parseInt(text);
        if (isNaN(addAmount) || addAmount <= 0) {
          await safeReply(ctx, '❌ Iltimos to\'g\'ri raqam kiriting!');
          return;
        }
        await adminController.executeAddPoints(ctx, ctx.session.targetUserId, addAmount);
        ctx.session = {};
        break;

      case 'remove_points':
        const removeAmount = parseInt(text);
        if (isNaN(removeAmount) || removeAmount <= 0) {
          await safeReply(ctx, '❌ Iltimos to\'g\'ri raqam kiriting!');
          return;
        }
        await adminController.executeRemovePoints(ctx, ctx.session.targetUserId, removeAmount);
        ctx.session = {};
        break;

      case 'broadcast_message':
        await adminController.executeBroadcast(ctx, ctx.session.broadcastSegment, text);
        ctx.session = {};
        break;

      case 'add_channel_title':
        ctx.session.channelTitle = text;
        ctx.session.waitingFor = 'add_channel_link';
        await safeReply(ctx, '🔗 Kanal havolasini yuboring:\n(Masalan: https://t.me/yourchannel)');
        break;

      case 'add_channel_link':
        ctx.session.channelLink = text;
        ctx.session.waitingFor = 'add_channel_id';
        await safeReply(ctx, '🆔 Kanal ID sini yuboring:\n(Masalan: @yourchannel yoki -1001234567890)');
        break;

      case 'send_message_to_user':
        const targetUser = await User.findById(ctx.session.targetUserId);
        if (!targetUser) {
          await safeReply(ctx, '❌ Foydalanuvchi topilmadi.');
          ctx.session = {};
          return;
        }

        if (!targetUser.telegramId) {
          await safeReply(ctx, '❌ Foydalanuvchining Telegram ID mavjud emas.');
          ctx.session = {};
          return;
        }

        // Foydalanuvchiga xabar yuborish
        await ctx.telegram.sendMessage(
          targetUser.telegramId,
          `📩 Admindan xabar: ${ctx.message.text}`
        );

        await safeReply(ctx, '✅ Xabar foydalanuvchiga yuborildi.');
        ctx.session = {}; // session tozalash
        break;


      case 'add_channel_id':
        try {
          await addChannel(
            ctx.session.channelTitle,
            ctx.session.channelLink,
            text,
            true
          );
          await safeReply(ctx,
            `✅ Kanal muvaffaqiyatli qo'shildi!\n\n` +
            `📺 Nom: ${ctx.session.channelTitle}\n` +
            `🔗 Havola: ${ctx.session.channelLink}\n` +
            `🆔 ID: ${text}`
          );
          logger.info(`Kanal qo'shildi: adminId=${ctx.user._id}`);
        } catch (error) {
          await safeReply(ctx, '❌ Kanal qo\'shishda xatolik: ' + error.message);
        }
        ctx.session = {};
        break;
    }

    return;
  }



  // global map (memory)


  // Oddiy xabar - yo'riqnoma
  // faqat oddiy xabar bo‘lsa ko‘rsat
  if (!ctx.message.reply_to_message && !ctx.session?.waitingFor) {
    await ctx.reply(
      '💡 Botdan foydalanish uchun /start buyrug\'ini yuboring.\n' +
      'Adminlar uchun: /admin'
    );
  }

}));



// bot.on('message', async (ctx) => {
//   // faqat adminlar
//   const admin = await User.findOne({ telegramId: ctx.from.id });
//   if (!admin || !admin.isAdmin) return;

//   // faqat reply bo‘lsa
//   if (!ctx.message.reply_to_message) return;

//   const repliedMsgId = ctx.message.reply_to_message.message_id;

//   // shu rasm bizning ro‘yxatda bormi?
//   const data = pendingRewards.get(repliedMsgId);
//   if (!data) return;

//   const amount = parseInt(ctx.message.text);
//   if (isNaN(amount) || amount <= 0) {
//     return ctx.reply('❌ Iltimos faqat raqam kiriting.');
//   }

//   // BALL QO‘SHAMIZ
//   const user = await User.findById(data.userId);
//   if (!user) return;

//   user.points += amount;
//   await user.save();

//   // foydalanuvchiga xabar
//   await ctx.telegram.sendMessage(
//     user.telegramId,
//     `🎉 Sizga ${amount} ball qo‘shildi!\n💰 Jami: ${user.points}`
//   );

//   // admin javobi
//   await ctx.reply(`✅ ${user.name} ga ${amount} ball qo‘shildi`);

//   // bir martalik
//   pendingRewards.delete(repliedMsgId);
// });

// ==================== CONTACT HANDLER ====================
bot.on('contact', asyncHandler(async (ctx) => {
  if (ctx.session && ctx.session.registrationStep === 'phone') {
    const contact = ctx.message.contact;
    const phone = contact.phone_number;
    const name = ctx.session.userName;

    // Yangi foydalanuvchi yaratish
    const user = await User.create({
      telegramId: ctx.from.id,
      username: ctx.from.username,
      name,
      phone,
      isAdmin: false
    });

    logger.info(`Yangi foydalanuvchi ro'yxatdan o'tdi: ${user.telegramId}`);

    ctx.session = {};
    ctx.user = user;

    await ctx.reply(
      `✅ Ro'yxatdan o'tish muvaffaqiyatli!\n\n` +
      `👤 Ism: ${name}\n` +
      `📱 Telefon: ${phone}\n\n` +
      `Botdan foydalanishni boshlashingiz mumkin!`,
      Markup.removeKeyboard()
    );

    // Kanal subscription tekshirish
    await checkChannelSubscription(ctx, () => userController.showMainMenu(ctx));
  }
}));

// ==================== USER CALLBACK QUERIES ====================

// Asosiy menyu
bot.action('user_main_menu', asyncHandler(async (ctx) => {
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user) return;

  await userController.showMainMenu(ctx);
}));

// Mening ballarim
bot.action('user_my_points', asyncHandler(async (ctx) => {
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user) return;

  await userController.showMyPoints(ctx);
}));

// Mukofotlar ro'yxati
bot.action('user_rewards', asyncHandler(async (ctx) => {
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user) return;
  await userController.showRewards(ctx, 0);
}));

// Sahifalar orasida harakatlanish
bot.action(/^reward_page:(\d+)$/, asyncHandler(async (ctx) => {
  const pageIndex = parseInt(ctx.match[1]);
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user) return;
  await userController.showRewards(ctx, pageIndex);
}));







bot.action('admin_users_list', async (ctx) => {
  await adminController.showUsersPaginated(ctx, 1);


});


bot.command('testbtn', async (ctx) => {
  await ctx.reply(
    'TEST BUTTON',
    Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ OLDINGI', 'test_prev')],
      [Markup.button.callback('➡️ KEYINGI', 'test_next')]
    ])
  );
});



bot.action(/^admin_users_(\d+)$/, async (ctx) => {
  const page = parseInt(ctx.match[1]);
  await adminController.showUsersPaginated(ctx, page);

});




// Mening mukofotlarim
bot.action('user_my_rewards', asyncHandler(async (ctx) => {
  ctx.user = await User.findOne({ telegramId: String(ctx.from.id) });
  if (!ctx.user) return;

  await userController.showMyRewards(ctx);
}));

// Mukofot olish menu
bot.action('user_claim_reward', asyncHandler(async (ctx) => {
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user) return;

  await userController.showClaimReward(ctx);
}));

// Mukofotni tasdiqlash


// Mukofotni olish
bot.action(/^confirm_claim_(.+)$/, asyncHandler(async (ctx) => {
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user) return;

  const rewardId = ctx.match[1];
  await userController.executeClaimReward(ctx, rewardId);
}));

// Leaderboard
bot.action('user_leaderboard', asyncHandler(async (ctx) => {
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user) return;

  await userController.showLeaderboard(ctx);
}));


// Foydalanuvchi mukofotni tanladi
// Foydalanuvchi mukofot tanladi
bot.action(/^view_reward_(.+)$/, asyncHandler(async (ctx) => {
  const rewardId = ctx.match[1];
  const reward = await Reward.findById(rewardId);
  if (!reward) return await safeReply(ctx, '❌ Mukofot topilmadi.', getBackButton('user_rewards'));

  const user = await User.findOne({ telegramId: ctx.from.id });
  if (!user) return;

  const buttons = [];

  if (user.points >= reward.costPoints) {
    buttons.push([
      Markup.button.callback(
        '🎁 Mukofotni olish',
        `claim_reward_${reward._id}_${user.telegramId}`
      )
    ]);
  } else {
    buttons.push([
      Markup.button.callback('❌ Ball yetarli emas', 'user_rewards')
    ]);
  }

  buttons.push([Markup.button.callback('🔙 Orqaga', 'user_rewards')]);

  await safeEditMessage(
    ctx,
    `🎁 *${reward.title}*\n\n📝 ${reward.description}\n💰 Narxi: ${reward.costPoints} ball\n📦 Qolgan: ${reward.stock === -1 ? '♾️ Cheksiz' : reward.stock}`,
    { parse_mode: 'Markdown', reply_markup: Markup.inlineKeyboard(buttons) }
  );
}));



bot.action(/^claim_reward_(.+)$/, async (ctx) => {
  const rewardId = ctx.match[1];
  const reward = await Reward.findById(rewardId);
  if (!reward) return ctx.answerCbQuery('❌ Mukofot topilmadi');

  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user.points < reward.costPoints) return ctx.answerCbQuery('❌ Ball yetarli emas');

  // Adminlarga so‘rov jo‘natish
  const admins = await User.find({ isAdmin: true });
  for (const admin of admins) {
    await ctx.telegram.sendMessage(
      admin.telegramId,
      `👤 ${user.name} mukofot olishni so‘radi: ${reward.title}`,
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ Tasdiqlash', `admin_grant_${reward._id}_${user.telegramId}`)],
        [Markup.button.callback('❌ Rad etish', `admin_cancel_${reward._id}_${user.telegramId}`)]
      ])
    );
  }

  await ctx.answerCbQuery('✅ So‘rov adminlarga yuborildi.');
});



bot.action(/^confirm_grant_(.+)_(.+)$/, asyncHandler(async (ctx) => {

  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user?.isAdmin) return await ctx.answerCbQuery('❌ Ruxsat yo\'q!', { show_alert: true });

  const rewardId = ctx.match[1];
  const targetTelegramId = ctx.match[2];

  const targetUser = await User.findOne({ telegramId: targetTelegramId });
  if (!targetUser) return await safeReply(ctx, '❌ Foydalanuvchi topilmadi.', getBackToAdminButton());

  const userReward = await grantReward(targetUser._id, rewardId, ctx.user._id);

  await safeReply(ctx, `✅ Mukofot muvaffaqiyatli berildi!`, getBackToAdminButton());

  await ctx.telegram.sendMessage(
    targetUser.telegramId,
    `🎉 Sizga yangi mukofot berildi!\n🎁 Mukofot: ${userReward.rewardId?.title || 'Nomaʼlum'}\nAdmin tomonidan berildi.`
  );
}));



bot.action(/admin_confirm_rwd_(\w+)_(\w+)/, adminConfirmRewardHandler);
bot.action(/admin_cancel_rwd_(\w+)_(\w+)/, adminCancelRewardHandler);



// Subscription tekshirish
bot.action('check_subscription', asyncHandler(async (ctx) => {
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user) return;

  await ctx.answerCbQuery('Tekshirilmoqda... ⏳');
  await checkChannelSubscription(ctx, () => userController.showMainMenu(ctx));
}));

// ==================== ADMIN CALLBACK QUERIES ====================

// Admin menyu
bot.action('admin_main', asyncHandler(async (ctx) => {
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user || !ctx.user.isAdmin) {
    await ctx.answerCbQuery('❌ Ruxsat yo\'q!', { show_alert: true });
    return;
  }

  await adminController.showAdminMenu(ctx);
}));

// Foydalanuvchi qidirish
bot.action('admin_search_user', asyncHandler(async (ctx) => {
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user || !ctx.user.isAdmin) return;

  await adminController.startSearchUser(ctx);
}));

// Ball qo'shish
bot.action(/^admin_add_pts_(.+)$/, asyncHandler(async (ctx) => {
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user || !ctx.user.isAdmin) return;

  const userId = ctx.match[1];
  await adminController.startAddPoints(ctx, userId);
}));

// Ball ayirish
bot.action(/^admin_rem_pts_(.+)$/, asyncHandler(async (ctx) => {
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user || !ctx.user.isAdmin) return;

  const userId = ctx.match[1];
  await adminController.startRemovePoints(ctx, userId);
}));


bot.action(/^admin_grant_(.+)_(.+)$/, async (ctx) => {
  const rewardId = ctx.match[1];
  const userTelegramId = ctx.match[2];

  const admin = await User.findOne({ telegramId: ctx.from.id });
  if (!admin?.isAdmin) return ctx.answerCbQuery('❌ Ruxsat yo‘q');

  const targetUser = await User.findOne({ telegramId: userTelegramId });
  const reward = await Reward.findById(rewardId);
  if (!targetUser || !reward) return ctx.answerCbQuery('❌ Xatolik');

  await grantReward(targetUser._id, reward._id, admin._id);

  await ctx.telegram.sendMessage(targetUser.telegramId,
    `🎉 Sizga yangi mukofot berildi: ${reward.title} 🎁`
  );

  await ctx.answerCbQuery('✅ Mukofot muvaffaqiyatli berildi');
});



bot.action(/admin_grant_rwd_(.+)/, asyncHandler(async (ctx) => {
  ctx.session = ctx.session || {};
  const userId = ctx.match[1];

  ctx.session.grantRewardUserId = userId; // session ga saqlaymiz

  const rewards = await getActiveRewards();
  if (rewards.length === 0) {
    return await safeReply(ctx, '❌ Faol mukofotlar mavjud emas.', getBackToAdminButton());
  }

  const buttons = rewards.map(r =>
    [Markup.button.callback(`🎁 ${r.title}`, `confirm_grant_${r._id}`)]
  );

  buttons.push([Markup.button.callback('🔙 Bekor qilish', 'admin_main')]);

  const keyboard = Markup.inlineKeyboard(buttons);
  await safeEditMessage(ctx, '🎁 Mukofot berish uchun mukofotni tanlang:', keyboard);
}));


bot.action(/grant_reward_confirm_(.+)/, asyncHandler(async (ctx) => {
  try {
    const rewardId = ctx.match[1];
    const userId = ctx.match[2];
    const targetUser = await User.findById(userId); // _id bilan qidirish



    if (!userId) {
      await safeReply(ctx, '❌ Foydalanuvchi maʼlumoti topilmadi.');
      return;
    }

    // Mukofotni berish
    const userReward = await grantReward(userId, rewardId, adminId);

    // Adminga xabar
    await safeEditMessage(
      ctx,
      `✅ Mukofot muvaffaqiyatli berildi!\n🎁 Mukofot: ${userReward.rewardId?.name || 'Nomaʼlum'}`
    );

    // Foydalanuvchiga xabar
    await ctx.telegram.sendMessage(
      targetUser.telegramId,
      `🎉 Sizga yangi mukofot berildi!\n\n🎁 Mukofot: ${userReward.rewardId?.name || 'Nomaʼlum'}\n` +
      `Admin tomonidan berildi.`
    );



  } catch (error) {
    logger.error('Mukofot berishda xatolik:', error);
    await safeReply(ctx, '❌ Mukofotni berishda xatolik yuz berdi.');
  }
}));








// Admin qilish
bot.action(/^admin_mkadm_(.+)$/, asyncHandler(async (ctx) => {
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user || !ctx.user.isAdmin) return;

  const userId = ctx.match[1];
  await adminController.toggleAdmin(ctx, userId, true);
}));

// Broadcast
bot.action('admin_broadcast', asyncHandler(async (ctx) => {
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user || !ctx.user.isAdmin) return;

  await adminController.startBroadcast(ctx);
}));

bot.action(/^broadcast_(.+)$/, asyncHandler(async (ctx) => {
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user || !ctx.user.isAdmin) return;

  const segment = ctx.match[1];
  await adminController.selectBroadcastSegment(ctx, segment);
}));

// Kanal qo'shish
bot.action('admin_add_channel', asyncHandler(async (ctx) => {
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user || !ctx.user.isAdmin) return;

  await adminController.startAddChannel(ctx);
}));


bot.action('admin_add_reward', asyncHandler(async (ctx) => {
  await adminController.startAddReward(ctx);
}));


// Mukofot o'chirish
bot.action('admin_remove_reward', async (ctx) => {
  await adminController.showRemoveReward(ctx);
});

// Inline tugma orqali o'chirish
bot.action(/^admin_remove_rwd_(.+)$/, async (ctx) => {
  const rewardId = ctx.match[1];
  await adminController.executeRemoveReward(ctx, rewardId);
});

// Kanalni o'chirish
bot.action('admin_remove_channel', asyncHandler(async (ctx) => {
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user || !ctx.user.isAdmin) return;

  await adminController.showRemoveChannel(ctx);
}));




// 2️⃣ Mukofotni tasdiqlash
bot.action(/^confirm_grant_(.+)$/, asyncHandler(async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user || !ctx.user.isAdmin) {
    await ctx.answerCbQuery('❌ Ruxsat yo\'q!', { show_alert: true });
    return;
  }

  const rewardId = ctx.match[1];
  const targetUserId = ctx.session.grantRewardUserId;

  if (!targetUserId) {
    await safeReply(ctx, '❌ Foydalanuvchi topilmadi.', getBackToAdminButton());
    return;
  }

  try {
    const { grantReward } = require('./services/rewardService');
    const userReward = await grantReward(targetUserId, rewardId, ctx.user._id);

    // Adminga xabar
    await safeReply(ctx, `✅ Mukofot muvaffaqiyatli berildi!`, getBackToAdminButton());

    // Foydalanuvchiga xabar yuborish
    const targetUser = await User.findById(targetUserId);
    if (targetUser && targetUser.telegramId) {
      await ctx.telegram.sendMessage(
        targetUser.telegramId, // Telegram chat ID
        `🎉 Sizga yangi mukofot berildi!\n\n🎁 Mukofot: ${userReward.rewardId?.title || 'Nomaʼlum'}\nAdmin tomonidan berildi.`
      );
    }

    ctx.session.grantRewardUserId = null;

  } catch (error) {
    logger.error('Mukofot berishda xatolik:', error);
    await safeReply(ctx, '❌ Mukofot berishda xatolik yuz berdi.', getBackToAdminButton());
  }
}));


// Admin → Foydalanuvchiga xabar yuborish
bot.action(/^admin_send_msg_(.+)$/, asyncHandler(async (ctx) => {
  const targetUserId = ctx.match[1];

  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user?.isAdmin) return ctx.answerCbQuery('❌ Ruxsat yo‘q');

  ctx.session = ctx.session || {};
  ctx.session.waitingFor = 'send_message_to_user';
  ctx.session.targetUserId = targetUserId;

  await safeReply(ctx, '📝 Foydalanuvchiga yubormoqchi bo‘lgan xabaringizni kiriting:');
}));





bot.action(/^remove_ch_(.+)$/, asyncHandler(async (ctx) => {
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user || !ctx.user.isAdmin) return;

  const channelId = ctx.match[1];
  await adminController.executeRemoveChannel(ctx, channelId);
}));

// Statistika
bot.action('admin_statistics', asyncHandler(async (ctx) => {
  ctx.user = await User.findOne({ telegramId: ctx.from.id });
  if (!ctx.user || !ctx.user.isAdmin) return;

  await adminController.showStatistics(ctx);
}));

module.exports = bot;