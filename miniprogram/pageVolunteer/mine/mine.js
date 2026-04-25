// pageVolunteer/mine/mine.js (现在作为组件，同时也是Tab页面)
const app = getApp();

Component({
    // 接收父组件（Home 页面）传递的属性
    properties: {
      // 当 mine.js 作为组件使用时，这些属性由父组件传递
      avatar: { type: String, value: '/images/mine/default.png' },
      nick: { type: String, value: '' },
      displayNick: { type: String, value: '' },
      logged: { type: Boolean, value: false },
      WaitingLog: { type: Boolean, value: false },
      noteCount: { type: Number, value: 0 },
      progress: { type: String, value: "0%" },
      level: { type: Number, value: 0 },
      welcomeText: { type: String, value: '' },
      bannerImageUrl: { type: String, value: '/images/banner/default_banner.png' },

      refreshSignins: { type: Boolean, value: false, observer: 'onRefreshSigninsChange' }
    },

    // 组件自身的数据
    data: {
      // **关键修改：这些数据字段是 `properties` 的镜像，
      // 用于当 mine.js 作为独立页面时管理自身显示状态。**
      // 当作为组件时，properties 会覆盖或优先于这些同名data字段的显示。
      // 但在逻辑判断和内部方法中，我们通常会直接使用 properties 的值，
      // 因为它们是最新且由父组件传递的。
      // 只有当 mine.js 独立作为页面时，这些 data 字段才真正发挥作用，
      // 通过 `syncDataFromGlobal` 方法进行同步。
      avatar: '/images/mine/default.png',
      nick: '',
      displayNick: '',
      logged: false,
      WaitingLog: false, // 登录等待状态
      noteCount: 0,
      progress: "0%",
      level: 0,
      welcomeText: '',
      bannerImageUrl: '/images/banner/default_banner.png',

      // 签到列表相关数据，这些是组件内部独有的状态
      currentPage: 0,
      pageSize: 10,
      isLoading: false,
      hasMore: true,
      userSignins: [],
    },

    // 组件的生命周期
    lifetimes: {
      attached() {
        // 组件被添加到页面节点树时执行
        // 如果 mine 作为组件被 home 页面加载，并且 home 页面已经登录，
        // 那么 properties.logged 会是 true，这里会首次加载签到数据。
        // 如果是作为 Tab 页面首次加载，pageLifetimes.show 会处理数据同步。
        if (this.properties.logged) {
          this.loadUserSignins(true);
        } else {
        }
        this.getBannerImage(); // 在组件 attached 时获取 banner
      },
      detached() {
        // 组件从页面节点树移除时执行
      }
    },

    pageLifetimes: {
        show() {
            // **关键修改：当 mine.js 作为独立 Tab 页面显示时，主动同步全局数据。**
            if (typeof this.getTabBar === 'function' && this.getTabBar()) {
                const tabBar = this.getTabBar();
                tabBar.updateIndicatorState();
                tabBar.setSelected(1); // 假设 Mine 是第二个 Tab (index 1)
            } else {
                console.warn('[Mine Page onShow] 无法获取自定义 TabBar 实例');
            }
            // 调用新的同步方法，确保页面自身的 `data` 与 `app.globalData` 一致
            this.syncDataFromGlobal();
        },
        hide() {
            // 组件所在的页面被隐藏时执行
        }
    },
    // =========================================================

    // 监听属性变化
    observers: {
      // 这个 observer 主要用于当 `mine` 作为组件被父组件 `home` 使用时，
      // 父组件通过 `properties` 改变 `logged` 状态来驱动 `mine` 组件的行为。
      'logged': function(newVal, oldVal) {
        // 如果 `mine` 作为页面，`logged` 属性不会被外部改变，它的 `logged` 状态由 `syncDataFromGlobal` 更新到其自身 `data` 中。
        // 但这里我们还是通过 properties 变化来响应，以支持组件模式。
        if (newVal && !oldVal) {
          // 确保这里使用最新的 userId
          this.loadUserSignins(true);
          this.calculateNoteStats(app.globalData.userId); // 确保使用全局 userId
        } else if (!newVal && oldVal) {
          this.resetUserDataDisplay(); // 重置显示相关数据
        }
      },
      'refreshSignins': function(newVal) {
        if (newVal && this.properties.logged) { // 确保 logged 为 true 才刷新
          this.loadUserSignins(true);
          // 通知父组件刷新完成，这样父组件可以把 refreshSignins 设回 false
          this.triggerEvent('refreshComplete');
        }
      }
    },

    methods: {
      generateUserId() {
        return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      },

      // **新增方法：从 globalData 同步数据到组件自身 data**
      syncDataFromGlobal() {
        const globalData = app.globalData;

        const newLoggedStatus = !!globalData.userId; // 检查 userId 确定登录状态

        this.setData({
          // 更新组件自身的 data，以影响组件自身的 WXML 渲染
          logged: newLoggedStatus,
          avatar: globalData.avatar || '/images/mine/default.png',
          nick: globalData.nick || '',
          displayNick: globalData.displayNick || '',
          WaitingLog: false, // 假设同步时不是登录等待状态
        });

        // 根据新的登录状态，加载或清空相关数据
        if (newLoggedStatus) {
            this.loadUserSignins(true); // 重新加载签到列表
            this.calculateNoteStats(globalData.userId); // 重新计算统计数据
        } else {
            this.resetUserDataDisplay(); // 清空显示相关数据
        }
      },

      // **新增方法：重置用户数据在组件中的显示状态**
      resetUserDataDisplay() {
          this.setData({
              // 清空登录相关显示数据
              avatar: '/images/mine/default.png',
              nick: '',
              displayNick: '',
              logged: false,
              WaitingLog: false,
              // 清空统计数据
              noteCount: 0,
              progress: '0%',
              level: 0,
              welcomeText: '',
              // 清空签到列表数据
              userSignins: [],
              currentPage: 0,
              hasMore: true,
              isLoading: false,
          });
      },

      async login() {
        const self = this;
        // 检查全局登录状态，避免重复登录
        if (self.data.WaitingLog || (app.globalData.logged && app.globalData.userId)) {
            return;
        }

        self.setData({ WaitingLog: true });
        wx.showLoading({ title: '登录中...', mask: true });

        try {
          const resOpenId = await wx.cloud.callFunction({ name: 'quickstartFunctions', data: { type: 'login' } });
          const openid = resOpenId.result.openid;
          const db = wx.cloud.database();
          const userResByOpenId = await db.collection('volunteers').where({ _openid: openid }).get();

          let currentUserData = {};
          if (userResByOpenId.data.length > 0) {
            currentUserData = userResByOpenId.data[0];
            await db.collection('volunteers').doc(currentUserData._id).update({ data: { updateTime: db.serverDate() } });
            wx.showToast({ title: '欢迎回来！', icon: 'success' });
          } else {
            const confirmResult = await new Promise((resolve) => {
              wx.showModal({ title: '提示', content: '是否使用您当前微信的头像和昵称进行登录？', confirmText: '是', cancelText: '否', success(res) { resolve(res.confirm); }, fail() { resolve(false); } });
            });
            if (!confirmResult) {
              wx.hideLoading();
              self.setData({ WaitingLog: false });
              wx.showToast({ title: '已取消登录', icon: 'none' });
              return;
            }
            const resProfile = await wx.getUserProfile({ desc: '用于完善会员资料' });
            const userId = this.generateUserId();
            currentUserData = {
              _openid: openid,
              userId,
              nick: resProfile.userInfo.nickName,
              avatar: resProfile.userInfo.avatarUrl,
              phoneNumber: '',
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            };
            await db.collection('volunteers').add({ data: currentUserData });
            wx.showToast({ title: '用户信息已保存', icon: 'success' });
          }

          const currentUsercase = app.globalData.usercase;
          // **更新 globalData**
          app.globalData.openid = openid;
          app.globalData.userId = currentUserData.userId;
          app.globalData.nick = currentUserData.nick;
          app.globalData.avatar = currentUserData.avatar;
          app.globalData.phoneNumber = currentUserData.phoneNumber || '';
          app.globalData.displayNick = currentUserData.nick; // 通常 displayNick 就是 nick
          app.globalData.logged = true; // 明确设置登录状态为 true
          app.globalData.usercase = currentUsercase;

          // **关键修改：登录成功后，同步组件自身数据以更新显示**
          self.syncDataFromGlobal();

          // 通知父组件（Home 页面）用户数据已更新
          self.triggerEvent('userloginsuccess', {
            userId: app.globalData.userId,
            nick: app.globalData.nick,
            avatar: app.globalData.avatar,
            displayNick: app.globalData.displayNick
          });

        } catch (err) {
          console.error('MineComponent: 登录流程出错：', err);
          wx.showToast({ title: '登录失败', icon: 'none' });
        } finally {
          wx.hideLoading();
          self.setData({ WaitingLog: false });
        }
      },

      // **新增登出方法：确保清除全局数据并重置组件自身显示**
      async logout() {
          const currentUsercase = app.globalData.usercase;

          // 清空全局数据
          app.globalData.openid = null;
          app.globalData.userId = null;
          app.globalData.nick = '';
          app.globalData.avatar = '/images/mine/default.png';
          app.globalData.displayNick = '';
          app.globalData.phoneNumber = '';
          app.globalData.logged = false;
          app.globalData.usercase = currentUsercase; // 除非有特定逻辑，否则登出不改变 usercase

          // **关键修改：调用重置方法，更新组件自身的 data 以影响显示**
          this.resetUserDataDisplay();

          // 通知父组件（如果作为组件被使用）登出完成
          this.triggerEvent('userlogout');

          wx.showToast({
              title: '已登出',
              icon: 'success'
          });
      },

      // calculateNoteStats 保持不变，它只计算总数和等级，并更新组件自身的 data
      async calculateNoteStats(userId) {
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
            const thresholds = [0, 100, 500, 2000];
            for (let i = 0; i < thresholds.length; i++) {
              if (totalNotes >= thresholds[i]) level = i;
              else break;
            }

            let progressPercent = "100.0";
            if (level < thresholds.length - 1) {
              const current = thresholds[level];
              const next = thresholds[level + 1];
              if (next > current) {
                progressPercent = ((totalNotes - current) / (next - current) * 100).toFixed(1);
              }
            }

            // 更新组件自身的 data
            this.setData({
              noteCount: totalNotes,
              level,
              progress: `${progressPercent}%`,
              welcomeText: `小Fu ${level}级超级英雄`
            });
        } catch (error) {
            console.error('MineComponent: Failed to calculate note stats:', error);
        }
      },

      // 获取单张 banner 图片的异步函数
      async getBannerImage() {
        try {
          const [bannerRes] = await Promise.all([
            wx.cloud.callFunction({
              name: 'quickstartFunctions',
              data: { type: 'getImages', path: 'images/banner/image.png' }
            })
          ]);

          const bannerUrl = bannerRes.result && bannerRes.result.url;

          if (typeof bannerUrl === 'string' && bannerUrl.startsWith('http')) {
            this.setData({ bannerImageUrl: bannerUrl }); // 这里更新的是组件自身的 bannerImageUrl
          } else {
            console.error('MineComponent: 云函数返回的banner图片URL无效或不是字符串。实际返回:', bannerRes.result);
            this.setData({ bannerImageUrl: '/images/banner/default_banner.png' });
          }

        } catch (err) {
          console.error('MineComponent: 调用云函数获取 banner 图片失败：', err);
          this.setData({ bannerImageUrl: '/images/banner/default_banner.png' });
        }
      },

      goOrder() {
        wx.navigateTo({ url: '/pageVolunteer/confirm/confirm' });
      },

      goNote() {
        wx.navigateTo({ url: '/pageVolunteer/energy/energy' });
      },

      goSetting() {
        const userId = app.globalData.userId;
        if (!userId) {
          wx.showToast({ title: '请先登录', icon: 'none' });
          return;
        }
        wx.navigateTo({ url: "/pageVolunteer/setting/setting" });
      },

      goToSignin() {
        // 这个方法通常应该跳转到签到页面，如果home页面就是签到页面
        wx.navigateTo({ url: '/pageVolunteer/home/home' });
      },

      // 加载用户签到记录的函数
      async loadUserSignins(reset = false) {
        if (this.data.isLoading || (!this.data.hasMore && !reset)) {
          return;
        }

        if (!app.globalData.userId) {
          // 如果未登录，并且不是重置操作，不需要清空数据，因为resetUserDataDisplay会处理
          return;
        }

        this.setData({ isLoading: true });
        wx.showNavigationBarLoading();

        try {
          const db = wx.cloud.database();
          const userId = app.globalData.userId;
          let skip = 0;
          let currentPage = this.data.currentPage;
          let oldSignins = this.data.userSignins;

          if (reset) {
            currentPage = 0;
            oldSignins = [];
            this.setData({ hasMore: true });
          }
          skip = currentPage * this.data.pageSize;

          const res = await db.collection('signin')
                              .where({ userId })
                              .orderBy('createTime', 'desc')
                              .skip(skip)
                              .limit(this.data.pageSize)
                              .get();

          const newSignins = res.data;
          const countRes = await db.collection('signin').where({ userId }).count();
          const total = countRes.total;

          this.setData({
            userSignins: oldSignins.concat(newSignins),
            currentPage: currentPage + 1,
            hasMore: oldSignins.length + newSignins.length < total,
          });


        } catch (e) {
          console.error("MineComponent: 加载签到记录失败：", e);
          wx.showToast({ title: '加载失败', icon: 'none' });
        } finally {
          this.setData({ isLoading: false });
          wx.hideNavigationBarLoading();
        }
      },

      onReachBottom() {
        // 确保当 mine 作为独立页面时，也能响应触底事件加载更多签到记录
        if (this.data.logged) { // 只有在登录状态下才加载
            this.loadUserSignins();
        }
      }
    }
});