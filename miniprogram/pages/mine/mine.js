// pages/mine/mine.js (现在作为组件)
Component({
  // 接收父组件（Home 页面）传递的属性
  properties: {
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
      // 首次加载签到数据
      if (this.properties.logged) {
        this.loadUserSignins(true);
      }
      this.getBannerImage(); // 在组件 attached 时获取 banner
    },
    detached() {
      // 组件从页面节点树移除时执行
    }
  },

  // 监听属性变化
  observers: {
    'refreshSignins': function(newVal) {
      if (newVal && this.properties.logged) {
        console.log('MineComponent: 接收到刷新签到列表指令');
        this.loadUserSignins(true);
        this.triggerEvent('refreshComplete'); // 通知父组件刷新完成
      }
    },
    'logged': function(newVal, oldVal) {
      if (newVal && !oldVal) {
        console.log('MineComponent: 登录状态变为true，加载签到数据');
        this.loadUserSignins(true);
      } else if (!newVal && oldVal) {
        console.log('MineComponent: 登录状态变为false，清空签到数据');
        this.setData({
          userSignins: [],
          currentPage: 0,
          hasMore: true,
          isLoading: false
        });
      }
    }
  },

  methods: {
    generateUserId() {
      return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },

    // 登录方法，注意：登录成功后需要通知 Home 页面更新 globalData 和 Home 自己的 data
    async login() {
      const self = this;
      const app = getApp(); // 在组件中获取app实例

      if (self.data.WaitingLog || (self.properties.logged && app.globalData.userId)) {
          console.log("MineComponent: 已在登录中或已登录，跳过手动登录");
          return;
      }
      
      self.setData({ WaitingLog: true });
      wx.showLoading({ title: '登录中...', mask: true });

      try {
        const resOpenId = await wx.cloud.callFunction({ name: 'quickstartFunctions', data: { type: 'login' } });
        const openid = resOpenId.result.openid;
        const db = wx.cloud.database();
        const userResByOpenId = await db.collection('users').where({ _openid: openid }).get();

        let currentUserData = {};
        if (userResByOpenId.data.length > 0) {
          currentUserData = userResByOpenId.data[0];
          await db.collection('users').doc(currentUserData._id).update({ data: { updateTime: db.serverDate() } });
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
            bedId: '',
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          };
          await db.collection('users').add({ data: currentUserData });
          wx.showToast({ title: '用户信息已保存', icon: 'success' });
        }

        const currentUsercase = app.globalData.usercase;
       // 更新 globalData
        app.globalData.openid = openid;
        app.globalData.userId = currentUserData.userId;
        app.globalData.nick = currentUserData.nick;
        app.globalData.avatar = currentUserData.avatar;
        app.globalData.bedId = currentUserData.bedId || '';
        app.globalData.displayNick = currentUserData.nick;
        app.globalData.usercase = currentUsercase;

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
    
    // calculateNoteStats 保持不变，它只计算总数和等级
    async calculateNoteStats(userId) {
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

      // 注意：这里更新的是组件自身的 data，不是 Home 页面的 data
      this.setData({
        noteCount: totalNotes,
        level,
        progress: `${progressPercent}%`,
        welcomeText: `小Fu ${level}级音乐家`
      });
    },

    async qrLogin(userIdFromQr) {
      const self = this;
      const app = getApp();
      self.setData({ WaitingLog: true });
      wx.showLoading({ title: '扫描登录中...', mask: true });
      try {
        const db = wx.cloud.database();
        const userRes = await db.collection('users').where({ userId: userIdFromQr }).get();

        if (userRes.data.length > 0) {
          const userDoc = userRes.data[0];
          const { nick, avatar, _openid, bedId } = userDoc;
          const currentUsercase = app.globalData.usercase;
          app.globalData.openid = _openid;
          app.globalData.userId = userIdFromQr;
          app.globalData.nick = nick;
          app.globalData.avatar = avatar;
          app.globalData.bedId = bedId;
          app.globalData.displayNick = nick;
          app.globalData.usercase = currentUsercase;

          // 通知父组件（Home 页面）用户数据已更新
          self.triggerEvent('userloginsuccess', {
              userId: app.globalData.userId,
              nick: app.globalData.nick,
              avatar: app.globalData.avatar,
              displayNick: app.globalData.displayNick
          });

          await db.collection('users').doc(userDoc._id).update({
            data: { updateTime: db.serverDate() }
          });
          
          wx.hideLoading();
          self.setData({ WaitingLog: false });
          wx.showToast({ title: `欢迎回来，${nick}！`, icon: 'success' });
          return true;
        } else {
          wx.hideLoading();
          wx.showToast({ title: '此二维码用户不存在，请先注册', icon: 'none' });

          const currentbedId = app.globalData.bedId;
          const currentUsercase = app.globalData.usercase;
          app.globalData.openid = null;
          app.globalData.userId = null;
          app.globalData.nick = '';
          app.globalData.avatar = '/images/mine/default.png';
          app.globalData.bedId = currentbedId;
          app.globalData.displayNick = '';
          app.globalData.usercase = currentUsercase;
          // 通知父组件（Home 页面）用户已登出
          self.triggerEvent('userlogout');

          self.setData({
            WaitingLog: false // 不再等待登录
          });
          return false;
        }
      } catch (err) {
        console.error('QR Code Login failed:', err);
        wx.hideLoading();
        wx.showToast({ title: '二维码登录失败，请重试', icon: 'none' });
        self.setData({ WaitingLog: false });
        return false;
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
          console.log('MineComponent: Banner图片URL获取成功:', bannerUrl);
        } else {
          console.error('MineComponent: 云函数返回的banner图片URL无效或不是字符串。实际返回:', bannerRes.result);
          this.setData({ bannerImageUrl: '/images/banner/default_banner.png' });
        }

      } catch (err) {
        console.error('MineComponent: 调用云函数获取 banner 图片失败：', err);
        this.setData({ bannerImageUrl: '/images/banner/default_banner.png' });
      }
    },

    // 扫描二维码，保持不变
    scanQrCode() {
      const self = this;
      wx.scanCode({
        success: async (res) => {
          const result = res.path;
          const match = result.match(/userId=([^&]+)/);
          const userIdFromQr = match ? match[1] : null;
          if (userIdFromQr) {
            await self.qrLogin(userIdFromQr.trim());
          } else {
            wx.showToast({ title: '无效的二维码内容', icon: 'none' });
          }
        },
        fail: (err) => {
          console.error('扫描失败', err);
          wx.showToast({ title: '扫描失败', icon: 'none' });
        }
      });
    },

    // 页面跳转方法，由于是在组件内，需要注意路径
    goOrder() {
      wx.navigateTo({ url: '/pages/menu/menu' });
    },

    goNote() {
      wx.navigateTo({ url: '/pages/symbols/symbols' });
    },

    goSetting() {
      const app = getApp();
      const userId = app.globalData.userId;
      if (!userId) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
      wx.navigateTo({ url: "/packageB/pages/setting/setting" });
    },

    goToSignin() {
      wx.switchTab({ url: '/pages/home/home' });
    },

    goMyQrCode() {
      const app = getApp();
      const userId = app.globalData.userId;
      if (!userId) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
      wx.navigateTo({ url: `/pages/myQrCode/myQrCode?userId=${userId}` });
    },

    // 加载用户签到记录的函数
    async loadUserSignins(reset = false) {
      if (this.data.isLoading || (!this.data.hasMore && !reset)) {
        console.log("MineComponent: 正在加载或没有更多数据了，跳过请求。");
        return;
      }

      if (!getApp().globalData.userId) {
        console.log("MineComponent: 用户未登录，无法加载签到记录。");
        return;
      }

      this.setData({ isLoading: true });
      wx.showNavigationBarLoading();

      try {
        const db = wx.cloud.database();
        const userId = getApp().globalData.userId;
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

        console.log(`MineComponent: 加载了 ${newSignins.length} 条数据，当前总数：${this.data.userSignins.length}，还有更多：${this.data.hasMore}`);

      } catch (e) {
        console.error("MineComponent: 加载签到记录失败：", e);
        wx.showToast({ title: '加载失败', icon: 'none' });
      } finally {
        this.setData({ isLoading: false });
        wx.hideNavigationBarLoading();
      }
    },

    // 监听组件内部触底事件（仅当组件自身可滚动时有效）
    onReachBottom() {
      // 如果 mine 组件作为抽屉，其 onReachBottom 可能不会被页面触发
      // 只有当 mine 组件的根元素有 scroll-y 且高度固定时，其内部滚动触底才有效
      console.log('MineComponent: 组件内部触底事件被触发，尝试加载更多...');
      this.loadUserSignins();
    }
  }
});