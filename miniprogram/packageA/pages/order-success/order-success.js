Page({
    data: {
      orderTime: "",
      orderItems: [],
      remark: "",
      showToast: false,
      toastMessage: ""
    },
  
    onLoad: function () {
      const lastOrder = wx.getStorageSync("lastOrder") || {};
      console.log(lastOrder);
      this.setData({
        orderTime: new Date().toLocaleString(),
        orderItems: lastOrder.items || [],
        remark: lastOrder.remark || ""
      });
    },
  
    showCustomToast: function (message, duration = 1500) {
      this.setData({
        showToast: true,
        toastMessage: message
      });
  
      setTimeout(() => {
        this.setData({ showToast: false });
      }, duration);
    },
  
    backToHome: function () {
      wx.reLaunch({
        url: "/pages/index/index"
      });
    }
  });
  