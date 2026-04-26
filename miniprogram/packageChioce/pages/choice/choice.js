// 获取小程序 App 实例
const app = getApp();

Page({
  data: {
    // 定义图片URL，初始为空
    backgroundImage: '',
    button1Icon: '',
    button2Icon: '',
    button3Icon: '',
  },

  async onLoad() {
    // 调用云函数获取图片URL
    await this.getCloudImages();
  },

  /**
   * 调用云函数获取图片URL
   */
  async getCloudImages() {
    try {
      // 获取背景图
      const backgroundRes = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'getImages', path: 'choice/background.png' }
      });
      // *** 核心修改部分 ***
      if (backgroundRes.result && backgroundRes.result.url) { // 检查 result 和 url 字段是否存在
        this.setData({
          backgroundImage: backgroundRes.result.url // 直接赋值 url
        });
      }
      // *** 核心修改部分结束 ***

      // 获取button1图片 (parent.jpg)
      const button1Res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'getImages', path: 'choice/parent.jpg' }
      });
      // *** 核心修改部分 ***
      if (button1Res.result && button1Res.result.url) {
        this.setData({
          button1Icon: button1Res.result.url
        });
      }
      // *** 核心修改部分结束 ***

      // 获取button2图片 (child.jpg)
      const button2Res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'getImages', path: 'choice/child.jpg' }
      });
      // *** 核心修改部分 ***
      if (button2Res.result && button2Res.result.url) {
        this.setData({
          button2Icon: button2Res.result.url
        });
      }
      // *** 核心修改部分结束 ***

      // 获取button3图片 (volunteer.jpg)
      const button3Res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'getImages', path: 'choice/volunteer.jpg' }
      });
      // *** 核心修改部分 ***
      if (button3Res.result && button3Res.result.url) {
        this.setData({
          button3Icon: button3Res.result.url
        });
      }
      // *** 核心修改部分结束 ***

    } catch (err) {
      console.error('获取云图片失败', err);
    }
  },

  /**
   * 跳转到第一个用户身份对应的页面
   */
  goToPage1() {
    const targetUrl = '../../../pages/home/home';

    app.globalData.usercase = '1';
    app.globalData.indicator = 0;

    wx.switchTab({
      url: targetUrl,
      success(res) {
      },
      fail(err) {
        console.error('跳转到第一个身份页面失败', err);
      }
    });
  },

  /**
   * 跳转到第二个用户身份对应的页面
   */
  goToPage2() {
    const targetUrl = '../../../pages/home/home';

    app.globalData.usercase = '2';
    app.globalData.indicator = 0;

    wx.switchTab({
      url: targetUrl,
      success(res) {
      },
      fail(err) {
        console.error('跳转到第二个身份页面失败', err);
      }
    });
  },

  /**
   * 跳转到第三个用户身份对应的页面
   */
  goToPage3() {
    const targetUrl = '../../../pageVolunteer/home/home';

    app.globalData.usercase = '3';
    app.globalData.indicator = 1;

    wx.switchTab({
      url: targetUrl,
      success(res) {
      },
      fail(err) {
        console.error('跳转到第三个身份页面失败', err);
      }
    });
  }
});