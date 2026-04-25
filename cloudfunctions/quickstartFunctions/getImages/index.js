const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const CLOUD_ENV = process.env.WX_CLOUD_ENV || 'cloud1-0gzwtgrxbaa45ab1.636c-cloud1-0gzwtgrxbaa45ab1-1358563859'

exports.main = async (event, context) => {
  try {
    const path = event.path

    if (!path || typeof path !== 'string') {
      throw new Error('参数 path 缺失或无效')
    }

    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    const fileID = `cloud://${CLOUD_ENV}/${cleanPath}`

    const tempRes = await cloud.getTempFileURL({
      fileList: [{ fileID, maxAge: 24 * 60 * 60 }]
    })

    const file = tempRes.fileList[0]
    if (file.tempFileURL && !file.errMsg.includes('fail')) {
      return { success: true, url: file.tempFileURL }
    }
    throw new Error(file.errMsg || '获取临时链接失败')
  } catch (err) {
    console.error('getImages error:', err)
    return { success: false, message: err.message || '未知错误' }
  }
}
