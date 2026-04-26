
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
        // Note: The mine component also fetches its banner. This might be redundant if mine component handles it entirely.
        // If the mine component's getBannerImage is working, you can remove this from home.js.
        // this.getMineDrawerBannerImage();
        // 获取活动列表
        this.getBabyActivities();
    },

    // 页面显示/从后台回到前台时触发
    onShow() {
        if (typeof this.getTabBar === 'function' && this.getTabBar()) {
            const tabBar = this.getTabBar();
            tabBar.updateIndicatorState();
            tabBar.setSelected(0); // Assuming Home is the first Tab (index 0)
        } else {
            console.warn('[Page onShow] 无法获取自定义 TabBar 实例');
        }
        // Always sync user data onShow to catch potential changes from other pages (e.g., settings)
        this.syncUserData();
    },

    // --- 用户数据同步与计算方法 ---
    // 同步全局用户数据到页面data
    syncUserData() {
        const globalData = app.globalData;

        const newLoggedStatus = !!globalData.userId; // Ensure logged is a boolean based on userId presence

        this.setData({
            logged: newLoggedStatus,
            avatar: globalData.avatar || '/images/mine/default.png', // Ensure default if avatar is null
            homePageAvatar: globalData.avatar || '/images/mine/default.png',
            nick: globalData.nick || '', // Ensure empty string if nick is null
            displayNick: globalData.displayNick || '', // Ensure empty string if displayNick is null
            // Reset WaitingLog if we are syncing, as login process should be complete or not started
            WaitingLog: false
        });

        if (newLoggedStatus) {
            // Re-calculate stats only if logged in
            this.calculateNoteStats(globalData.userId);
        } else {
            // Clear stats if logged out
            this.setData({
                noteCount: 0,
                progress: '0%',
                level: 0,
                welcomeText: '',
            });
        }
    },

    // 计算音符统计数据和等级
    calculateNoteStats: async function(userId) {
        if (!userId) return;
        const db = wx.cloud.database();
        try {
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
        } catch (error) {
            console.error('Home: Failed to calculate note stats:', error);
        }
    },

    // 获取 Mine Drawer 内部的 Banner 图片
    // This method is called in onLoad, but the mine component also has its own.
    // Ensure you only need it here if home page directly displays this banner,
    // otherwise, let the mine component manage its own banner.
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

    // 获取 Baby 活动列表 (已修改以适应新的数据库结构和移除音频/视频逻辑)
    getBabyActivities: async function() {
        try {
            const db = wx.cloud.database();
            const res = await db.collection('activity_volun').get();

            let rawActivities = res.data;
            if (!Array.isArray(rawActivities)) {
                console.error('从云数据库获取活动数据失败或数据格式不正确。', res);
                this.setData({ activityList: [] });
                return;
            }

            const processedActivities = await Promise.all(rawActivities.map(async (activity) => {
                let imageUrl = '';

                // 获取图片 URL (使用 img_add 字段)
                if (activity.img_add) {
                    try {
                        const imgRes = await wx.cloud.callFunction({
                            name: 'quickstartFunctions',
                            data: { type: 'getImages', path: activity.img_add }
                        });
                        imageUrl = imgRes.result && imgRes.result.url;
                        if (!(typeof imageUrl === 'string' && imageUrl.startsWith('http'))) {
                            console.warn(`获取图片 URL 失败: ${activity.img_add}`, imgRes.result);
                            imageUrl = '';
                        }
                    } catch (err) {
                        console.error(`获取图片 ${activity.img_add} 失败:`, err);
                        imageUrl = '';
                    }
                }

                // 判断活动类型 (根据 online 字段)
                let activityType = '线下活动'; // 默认是线下
                if (activity.online === '1') {
                    activityType = '线上活动';
                }

                return {
                    _id: activity._id, // 保留 _id
                    title: activity.title,
                    time_start: activity.time_start,
                    time_stop: activity.time_stop,
                    address: activity.address,
                    imageUrl: imageUrl,
                    type: activityType // 添加 type 字段
                };
            }));

            // 过滤掉没有有效图片的活动项
            const validActivities = processedActivities.filter(item => item.imageUrl);

            this.setData({ activityList: validActivities });

        } catch (err) {
            console.error('获取活动列表失败：', err);
            this.setData({ activityList: [] });
        }
    },

    // 立即报名功能先置空，不需要跳转到播放页面
    goToActivityPlayer(e) {
        // 如果需要，可以在这里添加一个Toast提示用户
        wx.showToast({
            title: '报名功能待开发',
            icon: 'none'
        });
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
            // Ensure result object exists and has url property for both
            const popupImageUrl = imageRes.result && imageRes.result.url ? imageRes.result.url : '';
            const popupWeekImageUrl = weekRes.result && weekRes.result.url ? weekRes.result.url : '';

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
        // It's crucial to set refreshSignins back to false *after* the mine component has processed it.
        // The observer in mine-component will trigger on true, then you reset it here.
        this.setData({ refreshSignins: false });
    },

    // 监听 mine 组件的登录成功事件
    onUserLoginSuccess(e) {
        const { userId, nick, avatar, displayNick } = e.detail;

        // Update app.globalData with the latest info from the component
        app.globalData.userId = userId;
        app.globalData.nick = nick;
        app.globalData.avatar = avatar;
        app.globalData.displayNick = displayNick;
        app.globalData.logged = true; // Explicitly set logged to true in globalData

        // Update Home page's own data, which in turn updates the mine component's properties
        this.setData({
            logged: true,
            avatar: avatar,
            homePageAvatar: avatar, // Update top bar avatar
            nick: nick, // Update Home page displayed nickname
            displayNick: displayNick,
            WaitingLog: false // Login successful, no longer waiting
        });

        // Re-calculate statistics for home page display and mine component properties
        this.calculateNoteStats(userId);
        // Trigger mine component to refresh its sign-in list using its property observer
        this.setData({ refreshSignins: true });
    },

    // 监听 mine 组件的登出事件
    onUserLogout() {
        const currentUsercase = app.globalData.usercase; // Preserve usercase if it's not reset on logout
        app.globalData.openid = null;
        app.globalData.userId = null;
        app.globalData.nick = '';
        app.globalData.avatar = '/images/mine/default.png';
        app.globalData.displayNick = '';
        app.globalData.usercase = currentUsercase; // Keep the original usercase unless specific logout logic exists

        this.setData({
            logged: false,
            avatar: '/images/mine/default.png',
            homePageAvatar: '/images/mine/default.png', // Reset top bar avatar
            nick: '',
            displayNick: '',
            noteCount: 0,
            progress: '0%',
            level: 0,
            welcomeText: '',
            WaitingLog: false,
            refreshSignins: true // Trigger Mine component to clear its data
        });
    },
});