// pages/setting/setting.js
Page({
    data: {
      // 将所有用户相关数据封装到 volunteerInfo 对象中，更清晰
      volunteerInfo: {
        nick: '',
        phoneNumber: '', // 将 bedId 转换为 phoneNumber
        userId: '',
        avatar: '/images/mine/default.png', // 增加头像字段，方便 WXML 展示
        displayNick: '' // 增加显示昵称字段
      },
      nickEditing: false,
      phoneNumberEditing: false // 将 bedIdEditing 转换为 phoneNumberEditing
    },

    onLoad() {
      const app = getApp();
      // 从 globalData 获取当前用户的志愿者信息
      const { userId, nick, avatar, displayNick, phoneNumber } = app.globalData;

      // 初始化页面数据
      this.setData({
        'volunteerInfo.nick': displayNick || nick || '',
        'volunteerInfo.avatar': avatar || '/images/mine/default.png',
        'volunteerInfo.displayNick': displayNick || nick || '',
        'volunteerInfo.userId': userId || '',
        'volunteerInfo.phoneNumber': phoneNumber || '' // 从 globalData 获取手机号
      });

      // 如果 globalData 中没有手机号但 userId 存在，则从数据库获取
      if (!phoneNumber && userId) {
        const db = wx.cloud.database();
        db.collection('volunteers').where({ userId }).get().then(res => {
          // 检查数据库字段是否为 'phoneNumber'
          if (res.data.length > 0 && res.data[0].phoneNumber) {
            this.setData({ 'volunteerInfo.phoneNumber': res.data[0].phoneNumber });
            app.globalData.phoneNumber = res.data[0].phoneNumber; // 更新 globalData
          }
        }).catch(err => {
          console.error('获取手机号失败', err);
          wx.showToast({ title: '获取手机号失败', icon: 'error' });
        });
      }
    },

    /**
     * 返回上一页
     * 该函数现在用于处理顶部自定义导航栏的返回箭头点击事件
     */
    onBackTap() {
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
      if (this.data.phoneNumberEditing) { // 使用 phoneNumberEditing
        this.confirmUpdatePhoneNumber(); // 调用新的方法
      }
      // 如果没有处于编辑模式，这里不需要做额外处理
    },

    // --- 昵称相关方法 ---
    nickChangeToEdit() {
      // 只有在用户已登录时才允许编辑
      if (!this.data.volunteerInfo.userId) {
          wx.showToast({ title: '请先登录', icon: 'none' });
          return;
      }
      this.setData({
        nickEditing: true,
        phoneNumberEditing: false // 确保同时只有一个处于编辑状态
      });
    },
    onNickChange(e) {
      this.setData({ 'volunteerInfo.nick': e.detail.value });
    },
    async confirmUpdateNick() {
      this.setData({ nickEditing: false }); // 立即退出编辑状态

      const app = getApp();
      // 如果昵称未改变，则不执行更新
      // 比较当前输入框值和全局存储的原始昵称 (或显示昵称)
      if (this.data.volunteerInfo.nick === app.globalData.nick) {
          // 如果 displayNick 和 nick 是一致的，这里直接比较 nick 即可
          return;
      }

      wx.showLoading({ title: '更新中...' });
      try {
        const userId = this.data.volunteerInfo.userId; // 从 volunteerInfo 获取 userId
        if (!userId) {
          wx.hideLoading();
          wx.showToast({ title: '请先登录', icon: 'none' });
          return;
        }
        await this.updateField('nick', this.data.volunteerInfo.nick); // 调用通用的更新函数
        app.globalData.nick = this.data.volunteerInfo.nick; // 更新全局数据
        app.globalData.displayNick = this.data.volunteerInfo.nick; // 更新显示昵称
        this.setData({ 'volunteerInfo.displayNick': this.data.volunteerInfo.nick }); // 更新本地数据
        wx.hideLoading();
        wx.showToast({ title: '昵称更新成功', icon: 'success' });
      } catch (error) {
        wx.hideLoading();
        console.error('更新昵称失败', error);
        wx.showToast({ title: '更新失败，请重试', icon: 'error' });
      }
    },

    // --- 手机号相关方法 ---
    phoneNumberChangeToEdit() { // 将 bedIdChangeToEdit 转换为 phoneNumberChangeToEdit
      // 只有在用户已登录时才允许编辑
      if (!this.data.volunteerInfo.userId) {
          wx.showToast({ title: '请先登录', icon: 'none' });
          return;
      }
      this.setData({
        phoneNumberEditing: true, // 使用 phoneNumberEditing
        nickEditing: false // 确保同时只有一个处于编辑状态
      });
    },
    onPhoneNumberChange(e) { // 将 onbedIdChange 转换为 onPhoneNumberChange
      this.setData({ 'volunteerInfo.phoneNumber': e.detail.value }); // 更新 phoneNumber
    },
    async confirmUpdatePhoneNumber() { // 将 confirmUpdatebedId 转换为 confirmUpdatePhoneNumber
      this.setData({ phoneNumberEditing: false }); // 立即退出编辑状态
      const app = getApp();
      // 如果手机号未改变，则不执行更新
      if (this.data.volunteerInfo.phoneNumber === app.globalData.phoneNumber) { // 使用 phoneNumber
          return;
      }

      wx.showLoading({ title: '更新中...' });
      try {
        const userId = this.data.volunteerInfo.userId; // 从 volunteerInfo 获取 userId
        if (!userId) {
          wx.hideLoading();
          wx.showToast({ title: '请先登录', icon: 'none' });
          return;
        }
        // 注意这里更新的字段名是 'phoneNumber'，请确保与数据库字段名一致
        await this.updateField('phoneNumber', this.data.volunteerInfo.phoneNumber);
        app.globalData.phoneNumber = this.data.volunteerInfo.phoneNumber; // 更新全局数据
        wx.hideLoading();
        wx.showToast({ title: '手机号更新成功', icon: 'success' });
      } catch (error) {
        wx.hideLoading();
        console.error('更新手机号失败', error);
        wx.showToast({ title: '更新失败，请重试', icon: 'error' });
      }
    },

    /**
     * 通用的字段更新函数
     * @param {string} field - 要更新的字段名 (如 'nick', 'phoneNumber')
     * @param {string} value - 新的值
     */
    async updateField(field, value) {
      const db = wx.cloud.database();
      const { userId } = this.data.volunteerInfo; // 从 volunteerInfo 获取 userId
      if (!userId) {
        throw new Error('User ID is missing for update.');
      }

      const res = await db.collection('volunteers').where({ userId }).get();
      if (res.data.length > 0) {
        const docId = res.data[0]._id;
        await db.collection('volunteers').doc(docId).update({
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
                phoneNumber: '' // 确保退出时手机号也被清空
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