// pages/cart/cart.js 或 packageA/pages/cart/cart.js
const app = getApp(); // 确保获取全局应用实例

Page({
  data: {
    cartList: [], // 购物车商品列表
    totalCount: 0, // 购物车商品总数
    remark: "", // 订单备注
    remarkPlaceholder: "如有特殊需求，请在此填写",
    loading: false, // 提交订单时的加载状态
    toastVisible: false, // 自定义Toast显示状态
    toastContent: "" // 自定义Toast内容
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad() {
    this.loadCartData();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次页面显示时重新加载购物车数据，确保最新状态
    this.loadCartData();
  },

  /**
   * 从本地存储加载购物车数据并更新页面
   */
  loadCartData() {
    const cart = wx.getStorageSync("cartList") || [];
    // 计算购物车商品总数
    const total = cart.reduce((sum, item) => sum + item.count, 0);
    this.setData({
      cartList: cart,
      totalCount: total
    });
  },

  /**
   * 增加商品数量
   * @param {Object} e 事件对象，包含商品索引
   */
  increaseCount(e) {
    const index = e.currentTarget.dataset.index;
    let cart = this.data.cartList;
    cart[index].count += 1;
    this.updateCart(cart);
  },

  /**
   * 减少商品数量
   * @param {Object} e 事件对象，包含商品索引
   */
  decreaseCount(e) {
    const index = e.currentTarget.dataset.index;
    let cart = this.data.cartList;
    // 如果商品数量大于1，则减少；否则移除该商品
    if (cart[index].count > 1) {
      cart[index].count -= 1;
      this.updateCart(cart);
    } else {
      this.removeItem(index);
    }
  },

  /**
   * 移除购物车中的某个商品
   * @param {number} index 商品在购物车列表中的索引
   */
  removeItem(index) {
    let cart = this.data.cartList;
    cart.splice(index, 1); // 移除指定索引的商品
    this.updateCart(cart);
  },

  /**
   * 更新购物车数据到页面和本地存储
   * @param {Array} cart 最新的购物车列表
   */
  updateCart(cart) {
    const total = cart.reduce((sum, item) => sum + item.count, 0);
    this.setData({
      cartList: cart,
      totalCount: total
    });
    wx.setStorageSync("cartList", cart); // 同步到本地存储
  },

  /**
   * 清空购物车
   */
  clearCart() {
    this.setData({
      cartList: [],
      totalCount: 0
    });
    wx.setStorageSync("cartList", []); // 清空本地存储
    this.showCustomToast("购物车已清空");
  },

  /**
   * 备注输入框内容变化时触发
   * @param {Object} e 事件对象，包含输入框的值
   */
  onRemarkInput(e) {
    this.setData({
      remark: e.detail.value
    });
  },

  /**
   * 提交订单，先请求订阅消息权限
   */
  submitOrder() {
    if (this.data.cartList.length === 0) {
      this.showCustomToast("购物车为空");
      return;
    }

    // 请求订阅消息权限
    wx.requestSubscribeMessage({
      tmplIds: ["R39av-2oWX4eNy6HzaEeSoK2Au3belmQ_KK8M4kYgqI"], // 您的订阅消息模板ID
      success: (res) => {
        // 根据模板ID获取用户订阅结果
        const subscribeStatus = res["R39av-2oWX4eNy6HzaEeSoK2Au3belmQ_KK8M4kYgqI"];
        // 如果用户点击“允许”或“总是保持以上选择”，则视为同意订阅
        this.processOrder(subscribeStatus === 'accept');
      },
      fail: (err) => {
        console.error("订阅消息请求失败：", err);
        // 如果请求订阅消息本身失败，也继续处理订单，但无法发送通知
        this.processOrder(false);
      }
    });
  },

  /**
   * 处理订单逻辑：提交到云函数
   * @param {boolean} isSubscribed 用户是否同意订阅消息
   */
  async processOrder(isSubscribed = false) {
    this.setData({ loading: true }); // 显示加载状态
  
    const userId = app.globalData.userId;
    if (!userId) {
      this.setData({ loading: false });
      this.showCustomToast("用户ID缺失，请重新登录");
      console.error("User ID is missing from app.globalData. Please ensure it's set after login.");
      return;
    }
  
    try {
      const res = await wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'createOrder',
          userId: userId,
          cartList: this.data.cartList,
          remark: this.data.remark,
          isSubscribed: isSubscribed
        }
      });
  
  
      if (res.result && res.result.success) {

        const orderItems = this.data.cartList.map((item, index) => ({
          id: index,
          name: item.name,
          count: item.count
        }));
      
        wx.setStorageSync("lastOrder", {
          items: orderItems,
          remark: this.data.remark || "",
          orderId: res.result.orderId || "",
          timestamp: Date.now()
        });
      
        wx.setStorageSync("cartList", []);
        this.setData({
          cartList: [],
          totalCount: 0,
          loading: false
        });
      
        wx.navigateTo({
          url: `/packageA/pages/order-success/order-success?orderId=${res.result.orderId}`
        });
      }
       else {
        this.setData({ loading: false });
        this.showCustomToast(res.result.message || "订单创建失败，请稍后重试");
      }
    } catch (e) {
      console.error("调用 quickstartFunctions 异常：", e);
      this.setData({ loading: false });
      this.showCustomToast("订单提交异常，请检查网络");
    }
  },  

  /**
   * 显示自定义Toast提示
   * @param {string} content Toast内容
   */
  showCustomToast(content) {
    this.setData({
      toastVisible: true,
      toastContent: content
    });

    setTimeout(() => {
      this.setData({ toastVisible: false });
    }, 2000); // 2秒后自动隐藏
  },

  /**
   * 返回首页并关闭所有页面
   */
  goHome() {
    wx.reLaunch({
      url: "/pages/index/index"
    });
  }
});