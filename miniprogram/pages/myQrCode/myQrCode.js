// pages/myQrCode/myQrCode.js
Page({
    data: {
      qrCodeImage: '',
    },
  
    onLoad: function (options) {
      const userId = options.userId;
      if (userId) {
        this.generateQrCode(userId);
      } else {
        wx.showToast({
          title: '用户ID丢失，请重试',
          icon: 'none',
          duration: 2000,
        });
      }
    },
  
    async generateQrCode(userId) {
      wx.showLoading({
        title: '正在生成二维码...',
        mask: true,
      });
  
      try {
        const res = await wx.cloud.callFunction({
            name: 'quickstartFunctions', // 现在调用主函数
            data: {
              type: 'generateQrCode',  // 指定要触发的功能
              userId: userId
            },
        });
  
        wx.hideLoading();
  
        if (res.result && res.result.url) {
          const imageUrl = res.result.url;
          console.log(imageUrl);
          this.setData({ qrCodeImage: imageUrl });
        } else {
          wx.showToast({
            title: `生成二维码失败: ${res.result ? res.result.errmsg : '未知错误'}`,
            icon: 'none',
          });
          console.error('云函数返回错误:', res.result);
        }
      } catch (err) {
        wx.hideLoading();
        wx.showToast({
          title: '调用云函数失败',
          icon: 'none',
        });
        console.error('调用 generateQrCode 异常:', err);
      }
    },
});