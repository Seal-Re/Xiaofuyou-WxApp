const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  try {
    // 1. 查询数据库，获取 home 集合中的所有记录
    const db = cloud.database()
    const res = await db.collection('home').get()

    // 2. 提取 name 字段（如 "img3.jpg"），并构造 fileID
    const fileList = res.data.map(item => ({
      fileID: `cloud://cloud1-0gzwtgrxbaa45ab1.636c-cloud1-0gzwtgrxbaa45ab1-1358563859/home/${item.name}`,
      maxAge: 24 * 60 * 60 // 临时链接有效期（秒）
    }))

    // 3. 获取临时链接
    const tempRes = await cloud.getTempFileURL({ fileList })

    // 4. 返回 URL 列表
    return tempRes.fileList.map(file => file.tempFileURL)
  } catch (err) {
    console.error('listHomeJpg error:', err)
    return [] // 出错返回空数组
  }
}