// pages/home/home.js
const app = getApp();

Page({
    data: {
        // 轮播图图片列表
        bannerImages: [],

        // 签到相关状态
        hasSignedInToday: false, // 每日签到状态
        nick: '', // 用户昵称，用于Home页面显示
        streak: 0, // 签到连击天数
        noteTotal: 0, // 签到音符总数

        // 签到弹窗控制
        showPopup: false, // 弹窗控制
        popupImage: '', // 弹窗背景图
        popupWeekImage: '', // 弹窗星期图片
        popupDateText: '', // 弹窗日期文本

        // 侧边抽屉（Mine Drawer）控制
        showDrawer: false, // 控制遮罩和抽屉整体是否可见
        drawerTransform: '-100%', // 控制抽屉内容（mine组件）的 translateX 值，用于动画

        // 用户信息，用于顶部导航栏和传递给 Mine 组件
        homePageAvatar: '/images/mine/default.png', // 顶部栏显示的头像
        avatar: '/images/mine/default.png', // 传递给 mine 组件的用户头像
        displayNick: '', // 传递给 mine 组件的昵称
        logged: false, // 用户登录状态
        WaitingLog: false, // 登录等待状态

        // 传递给 Mine 组件的用户数据和状态
        noteCount: 0,
        progress: "0%",
        level: 0,
        welcomeText: '',
        bannerImageUrl: '/images/banner/default_banner.png', // Mine Drawer 内部的 banner 图片
        refreshSignins: false, // 用于通知 mine-drawer 刷新签到列表

        // 活动列表数据
        activityList: [] // 存储活动图片和视频数据
    },

    // 页面加载生命周期函数
    onLoad() {
        // 加载 Home 页面自身的轮播图
        wx.cloud.callFunction({
            name: 'quickstartFunctions',
            data: { type: 'listHomeJpg' }
        }).then(res => {
            const urls = res.result;
            if (!Array.isArray(urls) || urls.some(item => typeof item !== 'string')) {
                console.error('云函数返回的结果不是有效的URL数组！', urls);
                this.setData({ bannerImages: [] });
                return;
            }
            this.setData({ bannerImages: urls });
        }).catch(err => {
            console.error('云函数调用失败', err);
            this.setData({ bannerImages: [] });
        });

        // 在页面加载时同步一次用户数据
        this.syncUserData();
        // 获取 Mine Drawer 内部的 Banner 图片
        this.getMineDrawerBannerImage();
        // 获取活动列表
        this.getBabyActivities();
    },

    // 页面显示/从后台回到前台时触发
    onShow() {
        console.log(`[Page onShow] ${this.route} 页面显示，准备更新 TabBar`);
        if (typeof this.getTabBar === 'function' && this.getTabBar()) {
            const tabBar = this.getTabBar();
            tabBar.updateIndicatorState(); 
            tabBar.setSelected(0); 
            console.log('[Page onShow] TabBar updateIndicatorState and setSelected 已调用');
        } else {
            console.warn('[Page onShow] 无法获取自定义 TabBar 实例');
        }
        this.syncUserData();

        // --- 签到逻辑 ---
        const db = wx.cloud.database();
        const _ = db.command;
        const today = new Date();
        // 将时间设置为当天0点0分0秒，以便进行日期比较
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const userId = app.globalData.userId; // 确保使用最新的 userId

        // 如果用户未登录，不执行签到逻辑
        if (!userId) {
            // 用户未登录，清空签到相关数据，并直接返回
            this.setData({
                hasSignedInToday: false,
                streak: 0,
                noteTotal: 0
            });
            // 触发 Mine 组件刷新其数据（清空）
            this.setData({ refreshSignins: true });
            wx.showToast({ title: '请先登录', icon: 'none' });
            return;
        }

        // 用户已登录，执行自动签到或检查签到状态
        const self = this; // 捕获 'this' 以在异步操作中使用

        (async () => {
            try {
                // 查询今日是否已签到
                const todaySignInRes = await db.collection('signin')
                    .where({ userId: userId, date: _.gte(todayStart) })
                    .get();

                if (todaySignInRes.data.length > 0) {
                    // 今日已签到
                    const { streak, noteTotal } = todaySignInRes.data[0];
                    self.setData({
                        hasSignedInToday: true,
                        streak,
                        noteTotal
                    });
                    wx.showToast({ title: '今日已签到', icon: 'none' });

                    // 无论是否签到，都触发 Mine 组件刷新签到列表以显示最新数据
                    this.setData({ refreshSignins: true });
                    return; // 已签到则退出，不再执行后续自动签到逻辑
                }

                // 今日未签到，执行自动签到流程
                wx.showLoading({ title: '签到中...', mask: true });

                // 查询上一次签到记录，用于计算连续签到天数
                const lastSignInRes = await db.collection('signin')
                    .where({ userId: userId })
                    .orderBy('date', 'desc')
                    .limit(1)
                    .get();

                let newStreak = 1;
                let newNoteTotal = 10; // 默认签到获得10音符

                if (lastSignInRes.data.length > 0) {
                    const lastSignInRecord = lastSignInRes.data[0];
                    const lastSignInDate = new Date(lastSignInRecord.date);
                    const diffTime = today.getTime() - lastSignInDate.getTime();
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) { // 检查是否是连续签到
                        newStreak = lastSignInRecord.streak + 1;
                    }
                    newNoteTotal = lastSignInRecord.noteTotal + 10; // 累计音符
                }

                // 添加新的签到记录
                await db.collection('signin').add({
                    data: {
                        userId: userId,
                        nick: self.data.nick,
                        date: new Date(),
                        streak: newStreak,
                        noteTotal: newNoteTotal
                    }
                });

                // 签到成功后，加载弹窗图片并显示弹窗
                self.getPopupImages(); // 调用弹窗图片加载和显示逻辑

                self.setData({
                    hasSignedInToday: true,
                    streak: newStreak,
                    noteTotal: newNoteTotal
                });

                wx.hideLoading();
                wx.showToast({ title: '签到成功！', icon: 'success' });

                // 签到成功后，通知 Mine 组件刷新签到列表
                this.setData({ refreshSignins: true });

            } catch (err) {
                wx.hideLoading();
                console.error('签到失败：', err);
                wx.showToast({ title: '签到失败', icon: 'none' });
            }
        })();
    },

    // --- 用户数据同步与计算方法 ---
    // 同步全局用户数据到页面data
    syncUserData() {
        const globalData = app.globalData;
        if (globalData.userId) {
            this.setData({
                logged: true,
                avatar: globalData.avatar, // 传递给 mine 组件的头像
                homePageAvatar: globalData.avatar, // 顶部栏显示的头像
                nick: globalData.nick, // Home 页面自身显示的昵称
                displayNick: globalData.displayNick, // 传递给 mine 组件的昵称
                WaitingLog: false // 确保登录状态正确
            });
            // 重新计算统计数据，更新传递给 mine 组件的 noteCount, progress, level, welcomeText
            this.calculateNoteStats(globalData.userId);
        } else {
            // 用户未登录状态，重置相关数据
            this.setData({
                logged: false,
                avatar: '/images/mine/default.png',
                homePageAvatar: '/images/mine/default.png', // 重置顶部栏头像
                nick: '',
                displayNick: '',
                noteCount: 0,
                progress: '0%',
                level: 0,
                welcomeText: '',
                WaitingLog: false
            });
        }
    },

    // 计算音符统计数据和等级
    calculateNoteStats: async function(userId) {
        if (!userId) return;
        const db = wx.cloud.database();
        const res = await db.collection('signin').where({ userId }).get();

        let totalNotes = 0;
        res.data.forEach(item => {
            if (typeof item.noteTotal === 'number') {
                totalNotes += item.noteTotal;
            }
        });

        let level = 0;
        const thresholds = [0, 100, 500, 2000]; // 等级门槛
        for (let i = 0; i < thresholds.length; i++) {
            if (totalNotes >= thresholds[i]) level = i;
            else break; // 超过当前门槛，则等级定为当前，否则跳出
        }

        let progressPercent = "100.0";
        if (level < thresholds.length - 1) {
            const current = thresholds[level];
            const next = thresholds[level + 1];
            if (next > current) {
                progressPercent = ((totalNotes - current) / (next - current) * 100).toFixed(1);
            }
        }

        this.setData({
            noteCount: totalNotes,
            level,
            progress: `${progressPercent}%`,
            welcomeText: `小Fu ${level}级音乐家`
        });
    },

    // 获取 Mine Drawer 内部的 Banner 图片
    getMineDrawerBannerImage: async function() {
        try {
            const res = await wx.cloud.callFunction({
                name: 'quickstartFunctions',
                data: { type: 'getImages', path: 'images/banner/image.png' }
            });
            const bannerUrl = res.result && res.result.url;

            if (typeof bannerUrl === 'string' && bannerUrl.startsWith('http')) {
                this.setData({ bannerImageUrl: bannerUrl });
            } else {
                console.error('Home页获取 Mine Drawer Banner 图片URL无效或不是字符串。实际返回:', res.result);
                this.setData({ bannerImageUrl: '/images/banner/default_banner.png' });
            }
        } catch (err) {
            console.error('Home页调用云函数获取 Mine Drawer Banner 图片失败：', err);
            this.setData({ bannerImageUrl: '/images/banner/default_banner.png' });
        }
    },

    // 获取 Baby 活动列表
    getBabyActivities: async function() {
        try {
            const db = wx.cloud.database();
            const res = await db.collection('activity_baby').get();

            let rawActivities = res.data;
            if (!Array.isArray(rawActivities)) {
                console.error('从云数据库获取活动数据失败或数据格式不正确。', res);
                this.setData({ activityList: [] });
                return;
            }

            const processedActivities = await Promise.all(rawActivities.map(async (activity) => {
                let imageUrl = '';
                let videoUrl = ''; // 这里的 videoUrl 可能是视频或音频文件的 URL

                // 获取图片 URL
                if (activity.add_img) {
                    try {
                        const imgRes = await wx.cloud.callFunction({
                            name: 'quickstartFunctions',
                            data: { type: 'getImages', path: activity.add_img }
                        });
                        imageUrl = imgRes.result && imgRes.result.url;
                        if (!(typeof imageUrl === 'string' && imageUrl.startsWith('http'))) {
                            console.warn(`获取图片 URL 失败: ${activity.add_img}`, imgRes.result);
                            imageUrl = '';
                        }
                    } catch (err) {
                        console.error(`获取图片 ${activity.add_img} 失败:`, err);
                        imageUrl = '';
                    }
                }

                // 获取视频/音频 URL (假设 add_mp4 存储的是云文件路径)
                if (activity.add_mp4) {
                    try {
                        // **核心修改：这里使用 getImages 来获取视频/音频的真实 URL**
                        const mp4Res = await wx.cloud.callFunction({
                            name: 'quickstartFunctions',
                            data: { type: 'getImages', path: activity.add_mp4 }
                        });
                        // 添加更详细的日志来检查 mp4Res.result 的内容
                        console.log(`[getBabyActivities] 获取 ${activity.add_mp4} 的原始结果:`, mp4Res);

                        videoUrl = mp4Res.result && mp4Res.result.url;
                        if (!(typeof videoUrl === 'string' && videoUrl.startsWith('http'))) {
                            console.warn(`获取视频/音频 URL 失败: ${activity.add_mp4}`, mp4Res.result);
                            videoUrl = '';
                        }
                    } catch (err) {
                        console.error(`获取视频/音频 ${activity.add_mp4} 失败:`, err);
                        videoUrl = '';
                    }
                }

                return {
                    ...activity, // 原始的 activity 对象，包含原始的 add_mp4 字段
                    imageUrl: imageUrl,
                    videoUrl: videoUrl // **关键：将获取到的真实可播放 URL 存入 videoUrl 字段**
                };
            }));

            // 过滤掉没有有效图片或视频的活动项
            const validActivities = processedActivities.filter(item => item.imageUrl || item.videoUrl);

            this.setData({ activityList: validActivities });
            console.log('活动列表获取成功:', validActivities);

        } catch (err) {
            console.error('获取活动列表失败：', err);
            this.setData({ activityList: [] });
        }
    },

    // --- 处理点击活动图片跳转到播放页面的函数 ---
    async goToActivityPlayer(e) {
        const { index } = e.currentTarget.dataset;
        const activity = this.data.activityList[index];

        // 检查活动数据和 videoUrl 是否存在
        if (!activity || !activity.videoUrl) {
            wx.showToast({ title: '活动数据不完整或无音频', icon: 'none' });
            return;
        }

        wx.showLoading({ title: '准备播放...', mask: true });

        try {
            const audioUrl = activity.videoUrl;
            const audioName = activity.name || '活动音频';
            const imageUrl = activity.imageUrl || '/images/default_audio_cover.png'; // 使用活动封面或默认封面

            // 构造符合 broadcast.js 期望的 audioData 数组
            const audiosToPlay = [{
                audioUrl: audioUrl,
                audioName: audioName,
                imageUrl: imageUrl
            }];

            // 将数组转换为 JSON 字符串，并进行 URL 编码
            const audioDataString = encodeURIComponent(JSON.stringify(audiosToPlay));

            console.log(`[goToActivityPlayer] 准备跳转，传递的音频数据字符串: ${audioDataString}`);

            wx.hideLoading();

            // 检查获取到的音频 URL 是否有效，然后进行页面跳转
            if (audioUrl && typeof audioUrl === 'string' && audioUrl.startsWith('http')) {
                wx.navigateTo({
                    url: `/pages/broadcast/broadcast?audioData=${audioDataString}`, // 直接通过 URL 参数传递
                    success: () => {
                        console.log('成功跳转并传递音频数据到 broadcast 页面');
                    },
                    fail: (err) => {
                        console.error('跳转到播放页面失败：', err);
                        wx.showToast({ title: '进入播放失败', icon: 'none' });
                    }
                });
            } else {
                console.error('音频URL无效或未获取到:', audioUrl);
                wx.showToast({ title: '未能获取音频内容', icon: 'none' });
            }

        } catch (err) {
            wx.hideLoading();
            console.error('处理音频URL过程中发生错误：', err);
            wx.showToast({ title: '加载音频失败', icon: 'none' });
        }
    },

    // 获取签到弹窗图片
    getPopupImages: async function() {
        const today = new Date();
        const bgImages = ['bj1.jpg', 'bj2.jpg', 'bj3.jpg', 'bj4.jpg', 'bj5.jpg', 'bj6.jpg', 'bj7.jpg', 'bj8.jpg'];
        const randomImage = bgImages[Math.floor(Math.random() * bgImages.length)];
        const weekdays = ['7', '1', '2', '3', '4', '5', '6']; // 星期日是0，映射到 '7'
        const weekdayKey = weekdays[today.getDay()];
        const dateText = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

        try {
            const [imageRes, weekRes] = await Promise.all([
                wx.cloud.callFunction({
                    name: 'quickstartFunctions',
                    data: { type: 'getImages', path: `images/sign/${randomImage}` }
                }),
                wx.cloud.callFunction({
                    name: 'quickstartFunctions',
                    data: { type: 'getImages', path: `images/sign/weekday_${weekdayKey}.png` }
                })
            ]);
            const popupImageUrl = imageRes.result.success ? imageRes.result.url : '';
            const popupWeekImageUrl = weekRes.result.success ? weekRes.result.url : '';

            this.setData({
                showPopup: true,
                popupImage: popupImageUrl,
                popupWeekImage: popupWeekImageUrl,
                popupDateText: dateText
            });
        } catch (err) {
            console.error('加载弹窗图片失败：', err);
            this.setData({ showPopup: false }); // 加载失败则不显示弹窗
        }
    },

    // 关闭签到弹窗
    closePopup() {
        this.setData({ showPopup: false });
    },

    // 打开侧边抽屉
    openMineDrawer() {
        // 每次打开时都同步一下最新的用户数据，确保抽屉内容是最新的
        this.syncUserData();
        this.setData({
            showDrawer: true, // 显示遮罩
            drawerTransform: '0%' // 滑入屏幕
        });
    },

    // 点击遮罩关闭侧边抽屉
    closeDrawerByMask() {
        if (this.data.showDrawer) {
            this.setData({
                drawerTransform: '-100%', // 滑出屏幕
            });
            // 动画结束后隐藏遮罩（延迟与CSS动画时间一致）
            setTimeout(() => {
                this.setData({ showDrawer: false });
            }, 300);
        }
    },

    // 空函数，用于阻止事件冒泡
    doNothing() {
        // 用于阻止事件冒泡，防止点击抽屉内容时误关闭抽屉
    },

    // --- 监听 mine 组件事件的方法 ---
    // 监听 mine 组件的刷新完成事件
    onRefreshSigninsComplete() {
        console.log('Home: Mine组件刷新完成，重置 refreshSignins');
        this.setData({ refreshSignins: false }); // 重置状态，等待下一次触发
    },

    // 监听 mine 组件的登录成功事件
    onUserLoginSuccess(e) {
        console.log('Home: 接收到 Mine 组件的登录成功事件', e.detail);
        // 更新 app.globalData
        app.globalData.userId = e.detail.userId;
        app.globalData.nick = e.detail.nick;
        app.globalData.avatar = e.detail.avatar;
        app.globalData.displayNick = e.detail.displayNick;

        // 更新 Home 页面自身的 data，这些数据会传递给 mine 组件
        this.setData({
            logged: true,
            avatar: e.detail.avatar,
            homePageAvatar: e.detail.avatar, // 更新顶部栏头像
            nick: e.detail.nick, // 更新 Home 页面显示的昵称
            displayNick: e.detail.displayNick,
            WaitingLog: false // 登录成功，不再等待
        });
        // 重新计算统计数据
        this.calculateNoteStats(e.detail.userId);
        // 触发签到列表刷新
        this.setData({ refreshSignins: true });
    },

    // 监听 mine 组件的登出事件
    onUserLogout() {
        console.log('Home: 接收到 Mine 组件的登出事件');

        // 直接对 app.globalData 的每个属性进行修改
        app.globalData.openid = null;
        app.globalData.userId = null;
        app.globalData.nick = '';
        app.globalData.avatar = '/images/mine/default.png';
        app.globalData.displayNick = '';
        // 注意：usercase 属性没有被修改，所以它会保留登出前的值
        // 清空 Home 页面 data，并重置顶部栏头像
        this.setData({
            logged: false,
            avatar: '/images/mine/default.png',
            homePageAvatar: '/images/mine/default.png', // 重置顶部栏头像
            nick: '',
            displayNick: '',
            noteCount: 0,
            progress: '0%',
            level: 0,
            welcomeText: '',
            WaitingLog: false,
            refreshSignins: true // 触发 Mine 组件清空数据
        });
    },
});