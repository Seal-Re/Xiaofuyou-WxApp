const cloud = require('wx-server-sdk')
const db = cloud.database()

module.exports = async (event, context) => {
  try {
    const [categoryRes, musicRes] = await Promise.all([
      db.collection('category').get(),
      db.collection('music').get()
    ])

    return {
      code: 0,
      msg: '获取成功',
      data: {
        category: categoryRes.data,
        music: musicRes.data
      }
    }
  } catch (err) {
    console.error('getCategoryAndMusic 错误:', err)
    return {
      code: 1,
      msg: '获取失败',
      error: err
    }
  }
}
