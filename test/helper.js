const path = require('path');

// 模拟小程序API对象
global.wx = {
  showToast: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  navigateTo: jest.fn(),
  navigateBack: jest.fn(),
  reLaunch: jest.fn(),
  showModal: jest.fn().mockImplementation((options) => {
    if (options.success) {
      options.success({ confirm: true });
    }
    return {};
  }),
  getSystemInfoSync: jest.fn().mockReturnValue({
    windowHeight: 812,
    windowWidth: 375
  }),
  setStorageSync: jest.fn(),
  getStorageSync: jest.fn().mockImplementation((key) => {
    if (key === 'cartList') return [];
    return null;
  }),
  requestSubscribeMessage: jest.fn().mockImplementation((options) => {
    if (options.success) {
      options.success({ errMsg: 'requestSubscribeMessage:ok' });
    }
    return Promise.resolve({ errMsg: 'requestSubscribeMessage:ok' });
  }),
  cloud: {
    callFunction: jest.fn().mockImplementation(({ name, data }) => {
      return Promise.resolve({ 
        result: { 
          errMsg: 'cloud.callFunction:ok'
        }
      });
    }),
    init: jest.fn()
  },
  createSelectorQuery: jest.fn().mockReturnValue({
    selectAll: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    boundingClientRect: jest.fn().mockReturnThis(),
    exec: jest.fn((callback) => {
      callback([
        [{ height: 100, left: 0, top: 0, width: 100 }]
      ]);
    })
  })
};

// 模拟app实例
global.getApp = jest.fn().mockReturnValue({
  globalData: {
    cart: []
  }
});

// 模拟Page函数
global.Page = function(config) {
  return config;
};

// 模拟Component函数
global.Component = function(options) {
  return options;
};

// 模拟索引页面
const mockIndexPage = {
  data: {
    categories: [],
    dishes: [],
    dishesByCategory: {},
    activeCategoryId: '',
    cartList: [],
    cartCount: 0,
    scrollTop: 0,
    heightList: [],
    showToast: false,
    toastMessage: ''
  },
  onLoad: function() {
    const categories = [
      { id: 'category1', name: '热门推荐', icon: '/images/category/hot.png' },
      { id: 'category2', name: '家常菜', icon: '/images/category/home.png' }
    ];
    
    const dishes = [
      { id: 'dish1', name: '红烧肉', categoryId: 'category1', image: '/images/smaller/hongshaorou.jpg' },
      { id: 'dish2', name: '番茄炒蛋', categoryId: 'category1', image: '/images/smaller/fanqiecaodan.jpg' },
      { id: 'dish3', name: '土豆丝', categoryId: 'category2', image: '/images/smaller/tudousi.jpg' }
    ];
    
    this.setData({
      categories: categories,
      dishes: dishes,
      activeCategoryId: categories[0].id
    });
    
    this.filterDishes();
    this.loadCartFromStorage();
  },
  setData: function(data) {
    this.data = { ...this.data, ...data };
  },
  filterDishes: function() {
    const { dishes, categories } = this.data;
    const dishesByCategory = {};
    
    categories.forEach(category => {
      dishesByCategory[category.id] = dishes.filter(dish => dish.categoryId === category.id);
    });
    
    this.setData({ dishesByCategory });
  },
  loadCartFromStorage: function() {
    const cartList = wx.getStorageSync('cartList') || [];
    const cartCount = cartList.reduce((sum, item) => sum + item.count, 0);
    this.setData({ cartList, cartCount });
  },
  addToCart: function(e) {
    const dish = e.currentTarget.dataset.dish;
    let { cartList } = this.data;
    
    const index = cartList.findIndex(item => item.id === dish.id);
    if (index > -1) {
      cartList[index].count++;
    } else {
      cartList.push({ ...dish, count: 1 });
    }
    
    const cartCount = cartList.reduce((sum, item) => sum + item.count, 0);
    this.setData({ cartList, cartCount });
    wx.setStorageSync('cartList', cartList);
  },
  switchCategory: function(e) {
    const categoryId = e.currentTarget.dataset.id;
    this.setData({ activeCategoryId: categoryId });
  },
  goToCart: function() {
    if (this.data.cartCount === 0) {
      this.showCustomToast('购物车为空');
      return;
    }
    wx.navigateTo({ url: '/packageA/pages/cart/cart' });
  },
  showCustomToast: function(message) {
    this.setData({ showToast: true, toastMessage: message });
    setTimeout(() => {
      this.setData({ showToast: false });
    }, 1500);
  }
};

// 模拟购物车页面
const mockCartPage = {
  data: {
    cartList: [],
    totalCount: 0,
    remark: "",
    loading: false,
    toastVisible: false,
    toastContent: ""
  },
  setData: function(data) {
    this.data = { ...this.data, ...data };
  },
  onLoad: function() {
    this.loadCartData();
  },
  loadCartData: function() {
    const cartList = wx.getStorageSync('cartList') || [];
    const totalCount = cartList.reduce((sum, item) => sum + item.count, 0);
    this.setData({ cartList, totalCount });
  },
  increaseCount: function(e) {
    const { index } = e.currentTarget.dataset;
    let cartList = this.data.cartList;
    cartList[index].count += 1;
    this.updateCart(cartList);
  },
  decreaseCount: function(e) {
    const { index } = e.currentTarget.dataset;
    let cartList = this.data.cartList;
    if (cartList[index].count > 1) {
      cartList[index].count -= 1;
      this.updateCart(cartList);
    } else {
      this.removeItem(index);
    }
  },
  removeItem: function(index) {
    let cartList = this.data.cartList;
    cartList.splice(index, 1);
    this.updateCart(cartList);
  },
  updateCart: function(cartList) {
    const totalCount = cartList.reduce((sum, item) => sum + item.count, 0);
    this.setData({ cartList, totalCount });
    wx.setStorageSync('cartList', cartList);
  },
  clearCart: function() {
    this.setData({ cartList: [], totalCount: 0 });
    wx.setStorageSync('cartList', []);
    this.showCustomToast('购物车已清空');
  },
  onRemarkInput: function(e) {
    this.setData({ remark: e.detail.value });
  },
  submitOrder: async function() {
    if (this.data.cartList.length === 0) {
      this.showCustomToast('购物车为空');
      return;
    }
    
    await wx.requestSubscribeMessage({
      tmplIds: ['BUXxEHHl5YIu2CqWKohgl55kgS17yEZTIJSi2Y-PKjw']
    });
    
    await wx.cloud.callFunction({
      name: 'sendOrderNotification',
      data: {
        orderInfo: {
          items: this.data.cartList,
          remark: this.data.remark,
          createTime: new Date().toLocaleString()
        }
      }
    });
    
    this.processOrder();
  },
  processOrder: function() {
    this.setData({ loading: true });
    
    const order = {
      items: this.data.cartList,
      remark: this.data.remark,
      createTime: new Date().toLocaleString(),
      status: 'pending'
    };
    
    wx.setStorageSync('lastOrder', order);
    
    wx.setStorageSync('cartList', []);
    this.setData({ loading: false });
    wx.reLaunch({ 
      url: '/packageA/pages/order-success/order-success' 
    });
  },
  showCustomToast: function(content) {
    this.setData({ toastVisible: true, toastContent: content });
    setTimeout(() => {
      this.setData({ toastVisible: false });
    }, 2000);
  },
  goHome: function() {
    wx.reLaunch({ url: '/pages/index/index' });
  }
};

// 获取模拟页面实例
function loadPage(pagePath) {
  if (pagePath === 'pages/index/index') {
    return { ...mockIndexPage };
  } else if (pagePath === 'packageA/pages/cart/cart') {
    return { ...mockCartPage };
  } else {
    throw new Error(`未知页面路径: ${pagePath}`);
  }
}

// 清除所有模拟的调用记录
function clearMocks() {
  Object.keys(global.wx).forEach(key => {
    if (typeof global.wx[key] === 'function' && global.wx[key].mockClear) {
      global.wx[key].mockClear();
    }
  });
  
  Object.keys(global.wx.cloud).forEach(key => {
    if (typeof global.wx.cloud[key] === 'function' && global.wx.cloud[key].mockClear) {
      global.wx.cloud[key].mockClear();
    }
  });
}

module.exports = {
  loadPage,
  clearMocks
}; 