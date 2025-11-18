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
    console.log('当前页面 onLoad');
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
      console.log('背景图云函数返回:', backgroundRes);
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
      console.log('按钮1图片云函数返回:', button1Res);
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
      console.log('按钮2图片云函数返回:', button2Res);
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
      console.log('按钮3图片云函数返回:', button3Res);
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
    console.log('设置全局用户身份为：1');
    console.log(`尝试跳转到第一个身份页面，路径：${targetUrl}`);

    wx.switchTab({
      url: targetUrl,
      success(res) {
        console.log('跳转到第一个身份页面成功', res);
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
    console.log('设置全局用户身份为：2');
    console.log(`尝试跳转到第二个身份页面，路径：${targetUrl}`);

    wx.switchTab({
      url: targetUrl,
      success(res) {
        console.log('跳转到第二个身份页面成功', res);
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
    console.log('设置全局用户身份为：3');
    console.log(`尝试跳转到第三个身份页面，路径：${targetUrl}`);

    wx.switchTab({
      url: targetUrl,
      success(res) {
        console.log('跳转到第三个身份页面成功', res);
      },
      fail(err) {
        console.error('跳转到第三个身份页面失败', err);
      }
    });
  }
});