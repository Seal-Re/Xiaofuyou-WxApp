const app = getApp();

Page({
  data: {
    identity: 'baby', // 默认值仍为 'baby'，但会在 onShow 中根据 usercase 调整
    userId: '',
    isLoggedIn: false, // 这个值将根据 app.globalData.userId 来确定
    recording: false,
    fileList: []
  },

  onLoad(options) {
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        const tabBar = this.getTabBar();
        tabBar.updateIndicatorState(); 
        tabBar.setSelected(2); 
    } else {
        console.warn('[Page onShow] 无法获取自定义 TabBar 实例');
    }

    // --- 调试日志开始 ---
    // --- 调试日志结束 ---

    // --- 确定用户身份 (usercase) ---
    const usercase = app.globalData.usercase;
    let currentIdentity = 'baby'; // 默认身份为 'baby'

    if (usercase === '1') {
      currentIdentity = 'baby';
    } else if (usercase === '2') {
      currentIdentity = 'parent'; // 示例：usercase 为 '2' 时设为 'parent'
    } else if (usercase === '3') {
      currentIdentity = 'admin'; // 示例：usercase 为 '3' 时设为 'admin'
    } else {
      console.warn(`未知或未设置的 usercase: ${usercase}。身份使用默认值: ${currentIdentity}`);
    }

    // --- 使用 userId 全局变量检查登录状态 ---
    const globalUserId = app.globalData.userId;
    // !!globalUserId 是一种简洁的判断方式，如果 globalUserId 是非空字符串、非 null、非 undefined，则为 true
    const isUserCurrentlyLoggedIn = !!globalUserId;

    if (!isUserCurrentlyLoggedIn) {
      this.setData({
        isLoggedIn: false,
        identity: currentIdentity, // 即使未登录也设置身份
        userId: '' // 确保页面的 userId 为空字符串
      });
      // 你可以选择在这里显示提示或自动跳转到登录页
      // wx.showToast({ title: '请先登录', icon: 'none', duration: 2000 });
      // setTimeout(() => { this.goToLogin(); }, 2000); // 提示后自动跳转
    } else {
      this.setData({
        identity: currentIdentity,
        userId: globalUserId,
        isLoggedIn: true
      });
    }
  },

  // --- 页面的其他方法保持不变 ---

  goToLogin() {
    wx.switchTab({
      url: '/pages/mine/mine'
    });
  },

  startRecording() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' }); // 请先登录
      return;
    }

    this.setData({ recording: true });
    // 重要提示：已移除 wx.showLoading({ title: '录音中...', mask: true });
    // 现在 WXML 中的动态录音条和录音文本将指示录音状态。

    const recorderManager = wx.getRecorderManager();
    recorderManager.start({
      format: 'mp3',
      duration: 60000 // 最大录音时长 60 秒
    });

    // 录音停止后，uploadRecording 将被触发
    recorderManager.onStop(this.uploadRecording.bind(this));
    recorderManager.onError((res) => {
      // 录音出错时，隐藏所有活动的加载提示（例如，如果之前有上传正在进行）并重置状态
      wx.hideLoading();
      console.error('录音错误:', res);
      wx.showToast({ title: `录音失败: ${res.errMsg}`, icon: 'none' }); // 录音失败
      this.setData({ recording: false });
    });
  },

  stopRecording() {
    if (!this.data.recording) return;
    const recorderManager = wx.getRecorderManager();
    // 停止录音，不在此处隐藏加载提示，它将由 onStop 触发的 uploadRecording 处理
    recorderManager.stop();
    this.setData({ recording: false });
  },

  async uploadRecording(res) {
    // 录音停止后，确保所有之前的加载提示（尽管现在录音本身不显示）都被隐藏。
    // 此行主要用于处理可能因早期错误而显示的“上传中”提示。
    wx.hideLoading();

    const { tempFilePath } = res;
    const { identity, userId } = this.data;

    if (!tempFilePath) {
      console.error('无效的录音文件路径');
      wx.showToast({ title: '录音文件无效', icon: 'none' }); // 录音文件无效
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
    const cloudPath = `say/${identity}/${userId}/${timestamp}.mp3`;

    // 现在，专门为上传过程显示加载提示
    wx.showLoading({ title: '上传中', mask: true }); // 上传中...

    try {
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath
      });
      wx.showToast({ title: '上传成功', icon: 'success' }); // 上传成功

      const getFileUrlRes = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getImages',
          path: uploadRes.fileID
        }
      });

      if (getFileUrlRes.result && getFileUrlRes.result.url) {
        const newFile = {
          id: uploadRes.fileID,
          url: getFileUrlRes.result.url,
          name: `${timestamp}.mp3`
        };
        this.setData({
          fileList: [...this.data.fileList, newFile]
        });
      } else {
        console.warn('未能获取上传文件的临时URL:', getFileUrlRes.result);
      }

    } catch (e) {
      console.error('文件上传失败:', e);
      wx.showToast({ title: `上传失败: ${e.errMsg || e.message || '未知错误'}`, icon: 'none' }); // 上传失败: 未知错误
    } finally {
      // 无论成功或失败，最终隐藏上传中的加载提示
      wx.hideLoading();
    }
  }
});
