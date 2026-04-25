// pages/menu/menu.js
const app = getApp();

Page({
  data: {
    userId: '',
    isLoggedIn: false,
    ordersList: [],
    hasOrders: false,
    loading: true,
    toastVisible: false,
    toastContent: "",
    userName: '',
    bedNumber: ''
  },

  onLoad() {
  },

  onShow() {
    this.checkLoginAndLoadOrders();
  },

  // New function for back button
  onBackTap() {
    wx.navigateBack({
      delta: 1 // Go back one page
    });
  },

  async checkLoginAndLoadOrders() {
    this.setData({ loading: true });

    const userId = app.globalData.userId;
    if (userId) {
      this.setData({
        userId: userId,
        isLoggedIn: true
      });
      await this.fetchUserOrders(userId);
    } else {
      this.setData({
        userId: '',
        isLoggedIn: false,
        ordersList: [],
        hasOrders: false,
        loading: false,
        userName: '', // 清空时也清空这些数据
        bedNumber: ''
      });
    }
  },

  async fetchUserOrders(userId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'fetchUserOrders',
          userId: userId
        }
      });


      if (res.result && typeof res.result === 'object' && res.result.success) {
        let orders = res.result.orders || [];
        const currentUserNick = res.result.nick || '未知用户';
        const currentUserBedId = res.result.bedId || 'N/A';
        this.setData({
          userName: currentUserNick,
          bedNumber: currentUserBedId
        });
        const fileIDsToConvert = new Set();
        orders.forEach(order => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
              if (item.imageUrl && item.imageUrl.startsWith('cloud://')) {
                fileIDsToConvert.add(item.imageUrl);
              }
            });
          }
        });
        const fileIDsArray = Array.from(fileIDsToConvert);

        let tempFileURLsMap = {};
        if (fileIDsArray.length > 0) {
          try {
            const tempRes = await wx.cloud.getTempFileURL({
              fileList: fileIDsArray,
            });
            tempRes.fileList.forEach(file => {
              tempFileURLsMap[file.fileID] = file.tempFileURL;
            });
          } catch (tempErr) {
            console.error('获取临时文件URL失败：', tempErr);
            this.showCustomToast("部分图片可能无法加载，获取临时链接失败");
          }
        }

        orders = orders.map(order => {
          const updatedOrder = { ...order }; // 复制所有原始属性

          if (updatedOrder.items && Array.isArray(updatedOrder.items)) {
            updatedOrder.items = updatedOrder.items.map(item => ({
              ...item,
              imageUrl: item.imageUrl.startsWith('cloud://') ? (tempFileURLsMap[item.imageUrl] || item.imageUrl) : item.imageUrl
            }));

            updatedOrder.displayedItems = updatedOrder.items.slice(0, 3);
            updatedOrder.showMorePlaceholder = updatedOrder.items.length > 3;
          } else {
            updatedOrder.displayedItems = [];
            updatedOrder.showMorePlaceholder = false;
          }
          updatedOrder.formattedCreateTime = this.formatTime(updatedOrder.createTime);
          return updatedOrder;
        });
        if (orders.length > 0) {
          orders.forEach((order, index) => {

            const rawTime = order.createTime;
            const formattedTime = this.formatTime(rawTime);

            if (order.displayedItems && order.displayedItems.length > 0) {
              order.displayedItems.forEach((item, itemIndex) => {
              });
            }
          });
        } else {
        }

        this.setData({
          ordersList: orders,
          hasOrders: orders.length > 0,
          loading: false
        });

      } else {
        this.setData({
          ordersList: [],
          hasOrders: false,
          loading: false,
          userName: '', // 清空时也清空这些数据
          bedNumber: ''
        });
        const errorMessage = (res.result && res.result.message) ? res.result.message : "获取订单失败，请稍后重试";
        this.showCustomToast(errorMessage);
      }

    } catch (e) {
      console.error("调用 fetchUserOrders 云函数异常：", e);
      this.setData({
        ordersList: [],
        hasOrders: false,
        loading: false,
        userName: '', // 异常时也清空这些数据
        bedNumber: ''
      });
      this.showCustomToast("获取订单异常，请检查网络或云函数日志");
    }
  },

  formatTime(timestamp) {
    if (!timestamp) {
      return '无效时间';
    }

    let date;

    // 处理 MongoDB 格式对象：{ $date: '...' }
    if (typeof timestamp === 'object' && timestamp.$date) {
      date = new Date(timestamp.$date);
    }
    // 处理 ISO 字符串或 Date 对象
    else if (typeof timestamp === 'string' || timestamp instanceof Date) {
      date = new Date(timestamp);
    }
    // 处理时间戳数字（毫秒）
    else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return '无效时间';
    }

    if (isNaN(date.getTime())) {
      return '无效时间';
    }

    return date.toLocaleString('zh-CN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  },


  goToLogin() {
    wx.switchTab({
      url: '/pages/home/home'
    });
  },

  goToOrder() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  },

  showCustomToast(content) {
    this.setData({
      toastVisible: true,
      toastContent: content
    });

    setTimeout(() => {
      this.setData({ toastVisible: false });
    }, 2000);
  },
  goToBroadcast(e) {
    const order = e.currentTarget.dataset.order;
    if (order && order._id) {


      wx.navigateTo({
        url: `/pages/broadcast/broadcast`,
        success: function(res) {
          const eventChannel = res.eventChannel;
          eventChannel.emit('acceptOrderData', { order: order });
        },
        fail: function(err) {
          console.error('跳转到 broadcast 页面失败:', err);
        }
      });
    } else {
      console.warn('未获取到订单数据');
    }
  }

});