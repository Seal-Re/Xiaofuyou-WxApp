const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  try {
    const { path } = event
    
    if (!path) {
      return {
        success: false,
        message: '缺少路径参数 path'
      }
    }

    // 构造 fileID（你应根据自己的云环境 ID 进行调整）
    const fileID = `cloud://cloud1-0gzwtgrxbaa45ab1.636c-cloud1-0gzwtgrxbaa45ab1-1358563859${path}`

    const result = await cloud.getTempFileURL({
      fileList: [
        {
          fileID,
          maxAge: 24 * 60 * 60
        }
      ]
    })

    const file = result.fileList[0]
    if (file.status === 0) {
      return {
        success: true,
        url: file.tempFileURL
      }
    } else {
      return {
        success: false,
        message: file.errMsg || '无法获取临时链接'
      }
    }
  } catch (error) {
    console.error('getTempFileURL error:', error)
    return {
      success: false,
      message: error.message || '系统异常'
    }
  }
}
