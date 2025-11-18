const cloud = require('wx-server-sdk');

// 初始化云函数，使用当前环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 获取数据库引用
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext(); // 获取微信上下文，包含 openid

  const { userId, cartList, remark, isSubscribed } = event;

  // 1. 数据校验
  if (!userId) {
    return {
      success: false,
      message: '用户ID缺失，无法创建订单'
    };
  }

  if (!cartList || cartList.length === 0) {
    return {
      success: false,
      message: '购物车为空，无法创建订单'
    };
  }

  // 2. 计算订单总价
  const totalPrice = cartList.reduce((sum, item) => {
    return sum + (item.price * item.count || 0);
  }, 0);

  // 3. 获取当前时间字符串（用于展示）
  const now = new Date();

  // 手动加上 8 小时（8 * 60 * 60 * 1000 毫秒）
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  
  const localTimeStr = beijingTime.toLocaleString('zh-CN', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  console.log(localTimeStr); // 应该输出北京时间
  

  // 4. 构建订单数据
  const orderData = {
    userId,
    items: cartList,
    remark,
    createTime: db.serverDate(), // 云端时间（排序用）
    localTimeStr,                // 本地格式化时间（展示用）
    totalPrice,
    status: 'pending'
  };

  try {
    // 5. 插入订单到数据库
    const addRes = await db.collection('orders').add({
      data: orderData
    });

    // 6. 发送订阅消息
    if (isSubscribed && wxContext.OPENID) {
      const tmplId = "R39av-2oWX4eNy6HzaEeSoK2Au3belmQ_KK8M4kYgqI"; // 替换为你的模板ID

      try {
        await cloud.openapi.subscribeMessage.send({
          touser: wxContext.OPENID,
          templateId: tmplId,
          page: `packageA/pages/order-detail/order-detail?orderId=${addRes._id}`,
          data: {
            name1: {
              value: cartList[0].name + (cartList.length > 1 ? `等${cartList.length}件商品` : '')
            },
            amount3: {
              value: totalPrice.toFixed(2) + '元'
            },
            thing2: {
              value: remark || '无'
            },
            character_string4: {
              value: addRes._id
            },
            date6: {
              value: localTimeStr
            }
          },
          miniprogramState: 'developer' // 可设为 'formal' 或 'trial'
        });
        console.log('订阅消息发送成功');
      } catch (sendErr) {
        console.error('订阅消息发送失败：', sendErr);
      }
    }

    // 7. 返回成功响应
    return {
      success: true,
      message: '订单创建成功',
      orderId: addRes._id
    };

  } catch (e) {
    console.error('创建订单失败：', e);
    return {
      success: false,
      message: `订单创建失败：${e.message || e.errMsg || '未知错误'}`
    };
  }
};
