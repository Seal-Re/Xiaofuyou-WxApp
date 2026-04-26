const cloud = require('wx-server-sdk');
const rp = require('request-promise');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { userId } = event;

  const appid = process.env.WX_APPID;
  const secret = process.env.WX_APP_SECRET;

  if (!appid || !secret) {
    return { msg: '服务器配置错误：微信凭据未设置', error: 'Missing WX_APPID or WX_APP_SECRET env var' };
  }

  try {
    const tokenRes = await rp({
      method: 'GET',
      uri: 'https://api.weixin.qq.com/cgi-bin/token',
      qs: { grant_type: 'client_credential', appid, secret },
      json: true
    });

    const access_token = tokenRes.access_token;
    if (!access_token) {
      throw new Error('无法获取 access_token');
    }

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
      headers: { 'Content-Type': 'application/json' }
    });

    const uploadRes = await cloud.uploadFile({
      cloudPath: `qr-codes/${userId}.jpg`,
      fileContent: qrCodeBuffer,
    });

    const tempUrlRes = await cloud.getTempFileURL({ fileList: [uploadRes.fileID] });
    const tempFileURL = tempUrlRes.fileList[0]?.tempFileURL || null;

    return { msg: '二维码生成成功', fileID: uploadRes.fileID, url: tempFileURL };
  } catch (err) {
    console.error('generateQrCode error:', err);
    return { msg: '上传二维码失败', error: err.message || err, userId };
  }
};
