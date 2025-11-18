
// cloudfunctions/fetchUserOrders/index.js
const cloud = require('wx-server-sdk');

// 初始化云函数，使用当前环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 获取数据库引用
const db = cloud.database();

// 云函数入口函数
// 这个云函数只负责根据 userId 获取订单数据
exports.main = async (event, context) => {
  const { userId } = event; // 从前端接收 userId

  // 1. 基础数据校验
  if (!userId) {
    return {
      success: false,
      message: '用户ID缺失，无法获取订单'
    };
  }

  try {
    // 2. 根据 userId 查询订单，并按创建时间倒序排列
    const res = await db.collection('orders')
      .where({
        userId: userId
      })
      .orderBy('createTime', 'desc') // 最新订单在前
      .get();

    // 3. 根据 userId 查询用户信息
    const userinfo = await db.collection('users')
      .where({
        userId: userId
      }).get();

    // 4. 返回查询到的订单数据
    return {
      success: true,
      message: '订单获取成功',
      orders: res.data, // 返回查询到的订单数据
      nick: userinfo.data[0].nick,
      bedId: userinfo.data[0].bedId
    };
  } catch (e) {
    // 4. 捕获并返回错误信息
    console.error('获取用户订单失败：', e);
    return {
      success: false,
      message: `获取订单失败：${e.message || e.errMsg || '未知错误'}`
    };
  }
};