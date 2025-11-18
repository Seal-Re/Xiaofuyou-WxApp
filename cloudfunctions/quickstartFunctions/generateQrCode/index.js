const cloud = require('wx-server-sdk');
const rp = require('request-promise');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { userId } = event;

  try {
    // 获取 access_token
    const tokenRes = await rp({
      method: 'GET',
      uri: `https://api.weixin.qq.com/cgi-bin/token`,
      qs: {
        grant_type: 'client_credential',
        appid: 'wx1d20fbad7d2075cf',
        secret: '0bb7295a67509c0f51f0a2f55e418198',
      },
      json: true
    });

    const access_token = tokenRes.access_token;
    if (!access_token) {
      throw new Error('无法获取 access_token');
    }

    // 请求生成二维码
    const qrCodeBuffer = await rp({
      method: 'POST',
      uri: `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${access_token}`,
      body: JSON.stringify({
        scene: `userId=${userId}`,
        page: 'pages/mine/mine',
        width: 280,
        is_hyaline: false
      }),
      encoding: null,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 上传二维码图片到云存储
    const uploadRes = await cloud.uploadFile({
      cloudPath: `qr-codes/${userId}.jpg`,
      fileContent: qrCodeBuffer,
    });

    // 获取临时访问链接
    const tempUrlRes = await cloud.getTempFileURL({
      fileList: [uploadRes.fileID],
    });

    const tempFileURL = tempUrlRes.fileList[0]?.tempFileURL || null;

    // 返回结果
    return {
      msg: '二维码生成成功',
      fileID: uploadRes.fileID,
      url: tempFileURL,
    };
  } catch (err) {
    console.error(err);
    return {
      msg: '上传二维码失败',
      error: err.message || err,
      userId: userId
    };
  }
};
