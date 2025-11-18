const { loadPage, clearMocks } = require('../helper');
// 模拟数据
jest.mock('../../miniprogram/data/categories', () => [
  { id: 'category1', name: '热门推荐', icon: '/images/category/hot.png' },
  { id: 'category2', name: '家常菜', icon: '/images/category/home.png' }
]);

jest.mock('../../miniprogram/data/dishes', () => [
  { id: 'dish1', name: '红烧肉', categoryId: 'category1', image: '/images/smaller/hongshaorou.jpg' },
  { id: 'dish2', name: '番茄炒蛋', categoryId: 'category1', image: '/images/smaller/fanqiecaodan.jpg' },
  { id: 'dish3', name: '土豆丝', categoryId: 'category2', image: '/images/smaller/tudousi.jpg' }
]);

describe('菜单页面测试', () => {
  let page;
  
  beforeEach(() => {
    clearMocks();
    page = loadPage('pages/index/index');
    // 模拟storage中的购物车数据
    wx.getStorageSync.mockImplementation((key) => {
      if (key === 'cartList') {
        return [
          { id: 'dish1', name: '红烧肉', count: 2 }
        ];
      }
      return null;
    });
  });
  
  test('页面加载时正确初始化数据', () => {
    // 调用onLoad钩子
    page.onLoad();
    
    // 验证数据是否正确设置
    expect(page.data.categories.length).toBe(2);
    expect(page.data.dishes.length).toBe(3);
    expect(page.data.activeCategoryId).toBe('category1');
    expect(page.data.cartCount).toBe(2);
  });
  
  test('添加商品到购物车功能', () => {
    page.onLoad();
    
    // 模拟点击添加按钮
    page.addToCart({
      currentTarget: {
        dataset: {
          dish: { id: 'dish2', name: '番茄炒蛋', categoryId: 'category1', image: '/images/smaller/fanqiecaodan.jpg' }
        }
      }
    });
    
    // 验证是否调用了存储方法
    expect(wx.setStorageSync).toHaveBeenCalled();
    
    // 模拟getStorageSync返回更新后的购物车
    wx.getStorageSync.mockImplementation((key) => {
      if (key === 'cartList') {
        return [
          { id: 'dish1', name: '红烧肉', count: 2 },
          { id: 'dish2', name: '番茄炒蛋', count: 1 }
        ];
      }
      return null;
    });
    
    // 再次加载购物车数据
    page.loadCartFromStorage();
    
    // 验证购物车数量是否更新
    expect(page.data.cartCount).toBe(3);
  });
  
  test('分类切换功能', () => {
    page.onLoad();
    
    // 模拟点击第二个分类
    page.switchCategory({
      currentTarget: {
        dataset: {
          id: 'category2'
        }
      }
    });
    
    // 验证活动分类是否切换
    expect(page.data.activeCategoryId).toBe('category2');
  });
  
  test('跳转到购物车页面', () => {
    page.onLoad();
    
    // 模拟点击购物车按钮
    page.goToCart();
    
    // 验证是否调用了导航方法
    expect(wx.navigateTo).toHaveBeenCalledWith({
      url: '/packageA/pages/cart/cart'
    });
  });
}); 