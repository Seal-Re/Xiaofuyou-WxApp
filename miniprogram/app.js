// app.js
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error("使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: "cloud1-0gzwtgrxbaa45ab1",
        traceUser: true,
      });
    }

    this.globalData = {};
  },
  globalData: {
    nick: '',
    avatar: '',
    openid: '',
    bedId: '',
    userId: '',
    usercase: '',
    indicator: 0,
    selected: 0,
    phoneNumber : ''
  }
});
