// 云函数名：getOrders
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 自动使用当前环境
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const res = await db.collection('orders').get()
    return {
      code: 0,
      data: res.data,
      msg: 'success'
    }
  } catch (err) {
    return {
      code: 1,
      data: null,
      msg: err.message
    }
  }
}
