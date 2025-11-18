const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    console.log('开始执行云函数...')

    // 获取 users 数据表
    const usersRes = await db.collection('users').get()
    const users = usersRes.data
    console.log(`共获取到 ${users.length} 个用户`)

    if (!users.length) {
      console.log('无用户数据，返回空数组')
      return { code: 0, data: [], msg: '无用户数据' }
    }

    // 构造文件ID列表
    const fileList = users.map(user => ({
      fileID: `cloud://cloud1-0gzwtgrxbaa45ab1.636c-cloud1-0gzwtgrxbaa45ab1-1358563859/qr-codes/${user.userId}.jpg`,
      maxAge: 3600
    }))

    console.log('构造的 fileList:', JSON.stringify(fileList, null, 2))

    // 获取临时文件 URL
    const qrRes = await cloud.getTempFileURL({ fileList })

    console.log('getTempFileURL 返回结果:', JSON.stringify(qrRes, null, 2))

    // 合并用户数据与 qrUrl
    const usersWithQr = users.map((user, index) => {
      const qrInfo = qrRes.fileList[index]
      const qrUrl = qrInfo?.tempFileURL || null

      if (!qrUrl) {
        console.warn(`用户 ${user.userId} 的二维码 URL 获取失败，状态: ${qrInfo?.status}, errMsg: ${qrInfo?.errMsg}`)
      }

      return {
        ...user,
        qrUrl
      }
    })

    console.log('最终返回用户数据数量:', usersWithQr.length)

    return {
      code: 0,
      data: usersWithQr,
      msg: '获取成功'
    }

  } catch (err) {
    console.error('云函数出错:', err)
    return {
      code: 1,
      msg: '服务器异常',
      error: err
    }
  }
}
