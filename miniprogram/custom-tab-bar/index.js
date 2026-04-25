// custom-tab-bar/index.js
const app = getApp(); 

Component({
    data: {
      indicator: 0,
      selected: 0, // 这个 selected 将由 switchTab 立即设置，并由页面 onShow 中的 updateState 保持
      list1: [
        { "pagePath": "/pages/home/home", "text": "首页", "iconPath": "/images/tabbar/home.png", "selectedIconPath": "/images/tabbar/home-active.png" },
        { "pagePath": "/pages/index/index", "text": "点单", "iconPath": "/images/tabbar/order.png", "selectedIconPath": "/images/tabbar/order-active.png" },
        { "pagePath": "/pages/voicebox/voicebox", "text": "我想说", "iconPath": "/images/tabbar/micro.png", "selectedIconPath": "/images/tabbar/micro-active.png" }
      ],
      list2: [
        { "pagePath": "/pageVolunteer/home/home", "text": "首页", "iconPath": "/images/tabbar/home.png", "selectedIconPath": "/images/tabbar/home-active.png" },
        { "pagePath": "/pageVolunteer/mine/mine", "text": "我的", "iconPath": "/images/tabbar/mine.png", "selectedIconPath": "/images/tabbar/mine-active.png" }
      ]
    },
  
    attached() {
      // 首次加载时，仍然需要根据全局 indicator 初始化 TabBar 的列表类型
      // 但不在此刻设置 selected，selected 应该由当前页面的 onShow 触发
      this.updateIndicatorState(); // 调用一个新的方法，只更新 indicator
    },
  
    pageLifetimes: {
      show() {
        // 页面显示时，确保 TabBar 的列表类型 (indicator) 是正确的
        this.updateIndicatorState();
        // 注意：这里不调用 updateState 来设置 selected，而是由页面 onShow 负责
      },
      hide() {
      },
      resize() {
      }
    },
  
    methods: {
      // 新增方法：只更新 indicator，不负责 selected 的计算
      updateIndicatorState() {
        const currentGlobalIndicator = app.globalData.indicator || 0;
        if (this.data.indicator !== currentGlobalIndicator) { // 避免不必要的 setData
            this.setData({
                indicator: currentGlobalIndicator
            }, () => {
            });
        }
      },

      // 提供一个方法让外部页面设置 selected 状态
      // 这个方法将被各个 Tab 页面的 onShow 调用
      setSelected(index) {
        if (this.data.selected !== index) { // 避免不必要的 setData
            this.setData({
                selected: index
            }, () => {
            });
        }
      },

      switchTab(e) {
        const { path, index } = e.currentTarget.dataset;
        
        // **核心点：立即更新组件内部的 selected 状态，提供即时视觉反馈**
        this.setData({
          selected: index
        });
  
        // 执行页面跳转，页面自身的 onShow 会负责 TabBar 的最终更新
        wx.switchTab({ 
          url: path,
          fail: (err) => {
            console.error(`[TabBar Debug] wx.switchTab FAILED for path: ${path}. Error:`, err);
          }
        });
      }
    }
});