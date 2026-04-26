
const app = getApp(); 
Page({

    data: {
      categories: [],
      dishes: [],
      dishesByCategory: {},
      activeCategoryId: "",
      cartList: [],
      cartCount: 0,
      scrollTop: 0,
      heightList: [],
      showToast: false,
      toastMessage: "",
      showFlyAnimation: false,
      flyAnimationData: { x: 0, y: 0 },
      showLargeImage: false,
      currentLargeImage: "",
      isLoaded: false,
      loadingGifUrl: ""
    },
  
    // 添加标志变量
    isManualSwitching: false,
    lastClickedCategoryId: "",
  
    // 分页获取所有数据的通用函数
    fetchAllData: async function (collectionName) {
      const db = wx.cloud.database();
      const MAX_LIMIT = 20;
      const countRes = await db.collection(collectionName).count();
      const total = countRes.total;
      const batchTimes = Math.ceil(total / MAX_LIMIT);
      const tasks = [];
      for (let i = 0; i < batchTimes; i++) {
        const promise = db.collection(collectionName)
          .skip(i * MAX_LIMIT)
          .limit(MAX_LIMIT)
          .get();
        tasks.push(promise);
      }
      const allRes = await Promise.all(tasks);
      return allRes.flatMap(res => res.data);
    },
  
    onLoad: async function () {
      
      try {

        const [categories, dishes] = await Promise.all([
          this.fetchAllData("category"),
          this.fetchAllData("music")
        ]);
  
        const updatedDishes = await Promise.all(
          dishes.map(async (dish) => {
            try {
              const res = await wx.cloud.callFunction({
                name: "quickstartFunctions",
                data: {
                  type: "listMusicImage",
                  path: dish.image
                }
              });
              dish.imageUrl = res.result.success ? res.result.url : "/images/default.jpg";
            } catch (err) {
              console.error("图片获取失败", err);
              dish.imageUrl = "/images/default.jpg";
            }
            return dish;
          })
        );
  
        this.setData({
          categories,
          dishes: updatedDishes,
          activeCategoryId: categories.length > 0 ? categories[0].id : "",
          isLoaded: true
        });
  
        this.filterDishes();
        this.loadCartFromStorage();
        wx.nextTick(() => {
          setTimeout(() => {
            this.calculateHeight();
          }, 300);
        });
      } catch (err) {
        console.error("数据库读取失败", err);
        this.showCustomToast("数据加载失败");
      }
    },
    goToMine: function () {
        wx.switchTab({
          url: '/pages/mine/mine'  // 注意是 tab 页就必须用 switchTab
        });
      },
      
      
    onShow: function () {
        if (typeof this.getTabBar === 'function' && this.getTabBar()) {
            const tabBar = this.getTabBar();
            tabBar.updateIndicatorState(); 
            tabBar.setSelected(1); 
        } else {
            console.warn('[Page onShow] 无法获取自定义 TabBar 实例');
        }
        const app = getApp();
        this.setData({
          nick: app.globalData.nick || '',
          bedId: app.globalData.bedId || ''
        });
      this.loadCartFromStorage();
    },
  
    loadCartFromStorage: function () {
      const cartList = wx.getStorageSync("cartList") || [];
      const cartCount = cartList.reduce((sum, item) => sum + item.count, 0);
      this.setData({ cartList, cartCount });
    },
  
    switchCategory: function (e) {
      const categoryId = e.currentTarget.dataset.id;
      this.lastClickedCategoryId = categoryId;
      this.isManualSwitching = true;
      this.setData({ activeCategoryId: categoryId });
  
      setTimeout(() => {
        this.setData({
          scrollTop: this.getScrollTopByCategoryId(categoryId)
        });
      }, 10);
  
      setTimeout(() => {
        if (this.lastClickedCategoryId === categoryId) {
          this.isManualSwitching = false;
        }
      }, 800);
    },
  
    getScrollTopByCategoryId: function (id) {
      const { heightList, categories } = this.data;
      const index = categories.findIndex(item => item.id === id);
      let scrollTop = 0;
      for (let i = 0; i < index; i++) {
        scrollTop += heightList[i] || 0;
      }
      return Math.max(0, scrollTop - 2);
    },
  
    onDishesScroll: function (e) {
      if (this.isManualSwitching) return;
      const { scrollTop } = e.detail;
      const { heightList, categories, activeCategoryId } = this.data;
      let sum = 0;
      let newId = activeCategoryId;
      for (let i = 0; i < heightList.length; i++) {
        const h = heightList[i] || 0;
        if (scrollTop <= sum + h + 10) {
          newId = categories[i].id;
          break;
        }
        sum += h;
      }
      if (newId !== activeCategoryId) {
        this.setData({ activeCategoryId: newId });
      }
    },
  
    calculateHeight: function () {
      const query = wx.createSelectorQuery();
      query.selectAll(".category-section").boundingClientRect();
      query.exec(res => {
        if (res && res[0]) {
          const heights = res[0].map(r => (r.height > 0 ? r.height : 0));
          this.setData({ heightList: heights });
        }
      });
    },
  
    filterDishes: function () {
      const { dishes, categories } = this.data;
      const grouped = {};
      categories.forEach(cat => {
        grouped[cat.id] = dishes.filter(d => d.categoryId === cat.id);
      });
      this.setData({ dishesByCategory: grouped });
    },
  
    showCustomToast: function (message, duration = 1500) {
      this.setData({ showToast: true, toastMessage: message });
      setTimeout(() => {
        this.setData({ showToast: false });
      }, duration);
    },
  
    addToCart: function (e) {
      const { clientX, clientY } = e.touches[0];
      this.setData({
        showFlyAnimation: true,
        flyAnimationData: { x: clientX, y: clientY }
      });
  
      const dish = e.currentTarget.dataset.dish;
      let { cartList } = this.data;
      const index = cartList.findIndex(item => item.id === dish.id);
  
      if (index !== -1) {
        cartList[index].count++;
      } else {
        cartList.push({ ...dish, count: 1 });
      }
  
      const cartCount = cartList.reduce((sum, item) => sum + item.count, 0);
      this.setData({ cartList, cartCount });
      wx.setStorageSync("cartList", cartList);
  
      const query = wx.createSelectorQuery();
      query.select(".cart-bar").boundingClientRect();
      query.exec(res => {
        if (res && res[0]) {
          const x = res[0].left + res[0].width / 2;
          const y = res[0].top + res[0].height / 2;
          setTimeout(() => {
            this.setData({
              "flyAnimationData.x": x,
              "flyAnimationData.y": y
            });
            setTimeout(() => {
              this.setData({ showFlyAnimation: false });
            }, 500);
          }, 50);
        } else {
          setTimeout(() => {
            this.setData({ showFlyAnimation: false });
          }, 500);
        }
      });
    },
  
    onImageError: function (e) {
      const { id } = e.currentTarget.dataset;
      const updatedDishes = this.data.dishes.map(d =>
        d.id === id ? { ...d, imageUrl: "/images/default.jpg" } : d
      );
      const updatedGrouped = {};
      Object.keys(this.data.dishesByCategory).forEach(catId => {
        updatedGrouped[catId] = this.data.dishesByCategory[catId].map(d =>
          d.id === id ? { ...d, imageUrl: "/images/default.jpg" } : d
        );
      });
      this.setData({
        dishes: updatedDishes,
        dishesByCategory: updatedGrouped
      });
    },
  
    goToCart: function () {
      if (this.data.cartCount === 0) {
        this.showCustomToast("购物车为空");
      } else {
        wx.navigateTo({ url: "/packageA/pages/cart/cart" });
      }
    },
  
    showLargeImage: function (e) {
      const { imageurl } = e.currentTarget.dataset;
      this.setData({
        showLargeImage: true,
        currentLargeImage: imageurl
      });
    },
  
    closeLargeImage: function () {
      this.setData({ showLargeImage: false });
    },
        
      
  });
  