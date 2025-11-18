const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  try {
    const path = event.path 
    console.error('path error:', path)
    if (!path || typeof path !== 'string') {
      throw new Error('参数 path 缺失或无效')
    }

    // 清除开头多余的 /
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;

    const fileID = `cloud://cloud1-0gzwtgrxbaa45ab1.636c-cloud1-0gzwtgrxbaa45ab1-1358563859/${cleanPath}`;
    console.log("fileID:", fileID);

    const tempRes = await cloud.getTempFileURL({
      fileList: [{ fileID, maxAge: 24 * 60 * 60 }]
    });

    const file = tempRes.fileList[0];
    if (file.tempFileURL && !file.errMsg.includes("fail")) {
      return {
        success: true,
        url: file.tempFileURL
      };
    } else {
      throw new Error(file.errMsg || '获取临时链接失败');
    }

  } catch (err) {
    console.error('getImageTempUrl error:', err)
    return {
      success: false,
      message: err.message || '未知错误'
    }
  }
}
