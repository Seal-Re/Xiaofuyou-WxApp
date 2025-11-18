// pages/setting/setting.js
Page({
  data: {
    nick: '',
    bedId: '',
    userId: '',
    nickEditing: false,
    bedIdEditing: false
  },

  onLoad() {
    const app = getApp();
    // 优先使用 displayNick，然后是 nick，最后是空字符串
    const initialNick = app.globalData.displayNick || app.globalData.nick || '';
    const initialBedId = app.globalData.bedNumber || ''; // 从 globalData 获取床号
    const userId = app.globalData.userId;

    this.setData({
      nick: initialNick,
      userId: userId,
      bedId: initialBedId // 设置初始床号
    });

    // 如果 globalData 中没有床号且 userId 存在，则从数据库获取
    if (!initialBedId && userId) {
      const db = wx.cloud.database();
      db.collection('users').where({ userId }).get().then(res => {
        if (res.data.length > 0 && res.data[0].bedNumber) { // 检查数据库字段是否为 bedNumber
          this.setData({ bedId: res.data[0].bedNumber });
          app.globalData.bedNumber = res.data[0].bedNumber; // 更新 globalData
        }
      }).catch(err => {
        console.error('获取床号失败', err);
        wx.showToast({ title: '获取床号失败', icon: 'error' });
      });
    }
  },

  /**
   * 返回上一页
   * 该函数现在用于处理顶部自定义导航栏的返回箭头点击事件
   */
  onBackTap() { // 将原 navigateBack 更名为 onBackTap
    wx.navigateBack({
      delta: 1 // 返回上一页
    });
  },

  noop() {
    // 空函数，用于阻止 row 内部点击冒泡触发 onPageTap
  },

  onPageTap() {
    // 点击页面其他区域时，如果处于编辑模式，则退出编辑并尝试保存
    if (this.data.nickEditing) {
      this.confirmUpdateNick();
    }
    if (this.data.bedIdEditing) {
      this.confirmUpdatebedId();
    }
    // 如果没有处于编辑模式，这里不需要做额外处理
  },

  nickChangeToEdit() {
    this.setData({ nickEditing: true, bedIdEditing: false }); // 确保同时只有一个处于编辑状态
  },
  onNickChange(e) {
    this.setData({ nick: e.detail.value });
  },
  async confirmUpdateNick() {
    this.setData({ nickEditing: false }); // 立即退出编辑状态
    const app = getApp();
    // 如果昵称未改变，则不执行更新
    if (this.data.nick === (app.globalData.nick || app.globalData.displayNick)) {
        return;
    }

    wx.showLoading({ title: '更新中...' });
    try {
      const userId = this.data.userId;
      if (!userId) {
        wx.hideLoading();
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
      await this.updateField('nick', this.data.nick); // 调用通用的更新函数
      app.globalData.nick = this.data.nick; // 更新全局数据
      app.globalData.displayNick = this.data.nick; // 更新显示昵称
      wx.hideLoading();
      wx.showToast({ title: '昵称更新成功', icon: 'success' });
    } catch (error) {
      wx.hideLoading();
      console.error('更新昵称失败', error);
      wx.showToast({ title: '更新失败，请重试', icon: 'error' });
    }
  },

  bedIdChangeToEdit() {
    this.setData({ bedIdEditing: true, nickEditing: false }); // 确保同时只有一个处于编辑状态
  },
  onbedIdChange(e) {
    this.setData({ bedId: e.detail.value });
  },
  async confirmUpdatebedId() {
    this.setData({ bedIdEditing: false }); // 立即退出编辑状态
    const app = getApp();
    // 如果床号未改变，则不执行更新
    if (this.data.bedId === app.globalData.bedNumber) {
        return;
    }

    wx.showLoading({ title: '更新中...' });
    try {
      const userId = this.data.userId;
      if (!userId) {
        wx.hideLoading();
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
      // 注意这里更新的字段名是 'bedNumber'，请确保与数据库字段名一致
      await this.updateField('bedNumber', this.data.bedId); 
      app.globalData.bedNumber = this.data.bedId; // 更新全局数据
      wx.hideLoading();
      wx.showToast({ title: '床号更新成功', icon: 'success' });
    } catch (error) {
      wx.hideLoading();
      console.error('更新床号失败', error);
      wx.showToast({ title: '更新失败，请重试', icon: 'error' });
    }
  },

  /**
   * 通用的字段更新函数
   * @param {string} field - 要更新的字段名 (如 'nick', 'bedNumber')
   * @param {string} value - 新的值
   */
  async updateField(field, value) {
    const db = wx.cloud.database();
    const { userId } = this.data;
    if (!userId) {
      throw new Error('User ID is missing for update.');
    }

    const res = await db.collection('users').where({ userId }).get();
    if (res.data.length > 0) {
      const docId = res.data[0]._id;
      await db.collection('users').doc(docId).update({
        data: {
          [field]: value,
          updateTime: db.serverDate() // 更新时间戳
        }
      });
    } else {
      throw new Error('用户记录不存在。');
    }
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      confirmColor: '#ff6699', // 使用与退出按钮一致的颜色，增加视觉一致性
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '退出中...' });
          try {
            const app = getApp();
            // 清空全局数据
            app.globalData = {
              userId: null,
              nick: '',
              avatar: '/images/mine/default.png',
              displayNick: '',
              openid: null,
              bedNumber: '' // 确保退出时床号也被清空
            };
            wx.removeStorageSync('userInfo'); // 清除本地存储的用户信息

            wx.hideLoading();
            wx.showToast({ title: '退出成功', icon: 'success' });
            // 重定向到登录/选择页面，并关闭所有当前页面
            wx.reLaunch({ url: '/packageChioce/pages/choice/choice' });
          } catch (error) {
            wx.hideLoading();
            console.error('退出登录失败', error);
            wx.showToast({ title: '退出失败，请重试', icon: 'error' });
          }
        }
      }
    });
  }
});