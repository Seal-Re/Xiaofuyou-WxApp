const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const usersRes = await db.collection('users').get()
    const users = usersRes.data

    if (!users.length) {
      return { code: 0, data: [], msg: '无用户数据' }
    }

    const env = process.env.WX_CLOUD_ENV || cloud.DYNAMIC_CURRENT_ENV
    const fileList = users.map(user => ({
      fileID: `cloud://${env}/qr-codes/${user.userId}.jpg`,
      maxAge: 3600
    }))

    const qrRes = await cloud.getTempFileURL({ fileList })

    const usersWithQr = users.map((user, index) => {
      const qrInfo = qrRes.fileList[index]
      const qrUrl = qrInfo?.tempFileURL || null

      if (!qrUrl) {
        console.warn(`用户 ${user.userId} 的二维码 URL 获取失败: ${qrInfo?.errMsg}`)
      }

      return { ...user, qrUrl }
    })

    return { code: 0, data: usersWithQr, msg: '获取成功' }
  } catch (err) {
    console.error('云函数出错:', err)
    return { code: 1, msg: '服务器异常', error: err }
  }
}
