const { loadPage, clearMocks } = require('../../helper');

describe('购物车页面测试', () => {
  let page;
  
  beforeEach(() => {
    clearMocks();
    page = loadPage('packageA/pages/cart/cart');
    
    // 模拟购物车数据
    wx.getStorageSync.mockImplementation((key) => {
      if (key === 'cartList') {
        return [
          { 
            id: 'dish1', 
            name: '红烧肉', 
            image: '/images/smaller/hongshaorou.jpg',
            count: 2 
          },
          { 
            id: 'dish2', 
            name: '番茄炒蛋', 
            image: '/images/smaller/fanqiecaodan.jpg',
            count: 1 
          }
        ];
      }
      return null;
    });
  });
  
  test('页面加载时正确显示购物车数据', () => {
    // 调用onLoad钩子
    page.onLoad();
    
    // 验证购物车数据是否正确加载
    expect(page.data.cartList.length).toBe(2);
    expect(page.data.cartList[0].name).toBe('红烧肉');
    expect(page.data.cartList[0].count).toBe(2);
  });
  
  test('增加商品数量功能', () => {
    page.onLoad();
    
    // 模拟点击增加按钮
    page.increaseCount({
      currentTarget: {
        dataset: {
          index: 0
        }
      }
    });
    
    // 验证商品数量是否增加
    expect(page.data.cartList[0].count).toBe(3);
  });
  
  test('减少商品数量功能', () => {
    page.onLoad();
    
    // 模拟点击减少按钮
    page.decreaseCount({
      currentTarget: {
        dataset: {
          index: 0
        }
      }
    });
    
    // 验证商品数量是否减少
    expect(page.data.cartList[0].count).toBe(1);
  });
  
  test('清空购物车功能', () => {
    page.onLoad();
    
    // 模拟确认清空购物车
    wx.showModal.mockImplementation((options) => {
      options.success({ confirm: true });
    });
    
    // 调用清空购物车方法
    page.clearCart();
    
    // 验证购物车是否清空
    expect(page.data.cartList.length).toBe(0);
    expect(wx.setStorageSync).toHaveBeenCalledWith('cartList', []);
  });
  
  test('备注信息输入功能', () => {
    page.onLoad();
    
    // 模拟输入备注
    page.onRemarkInput({
      detail: {
        value: '不要放辣椒'
      }
    });
    
    // 验证备注是否正确设置
    expect(page.data.remark).toBe('不要放辣椒');
  });
  
  test('提交订单功能', async () => {
    page.onLoad();
    
    // 模拟订阅消息授权成功
    wx.requestSubscribeMessage.mockImplementation(() => {
      return Promise.resolve({
        errMsg: 'requestSubscribeMessage:ok',
        'BUXxEHHl5YIu2CqWKohgl55kgS17yEZTIJSi2Y-PKjw': 'accept'
      });
    });
    
    // 模拟云函数调用成功
    wx.cloud.callFunction.mockImplementation(() => {
      return Promise.resolve({
        result: {
          errMsg: 'cloud.callFunction:ok'
        }
      });
    });
    
    // 调用提交订单方法
    await page.submitOrder();
    
    // 验证是否请求了订阅消息
    expect(wx.requestSubscribeMessage).toHaveBeenCalled();
    
    // 验证是否调用了云函数
    expect(wx.cloud.callFunction).toHaveBeenCalled();
    
    // 验证是否导航到订单成功页面
    expect(wx.reLaunch).toHaveBeenCalled();
  });
  
  test('返回首页功能', () => {
    page.onLoad();
    
    // 调用返回首页方法
    page.goHome();
    
    // 验证是否重新启动到首页
    expect(wx.reLaunch).toHaveBeenCalledWith({
      url: '/pages/index/index'
    });
  });
}); 