const cloud = require('wx-server-sdk');
const COS = require('cos-nodejs-sdk-v5');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { orderId, audioId, fileExtension } = event;

  if (!orderId || !audioId || !fileExtension) {
    return {
      code: 400,
      message: '缺少必要的参数: orderId, audioId 或 fileExtension。',
      data: null,
      error: { type: 'ParameterValidation', details: 'Required parameters are missing.' }
    };
  }

  const secretId = process.env.COS_SECRET_ID;
  const secretKey = process.env.COS_SECRET_KEY;
  const bucket = process.env.COS_BUCKET;
  const region = process.env.COS_REGION;

  if (!secretId || !secretKey || !bucket || !region) {
    return {
      code: 500,
      message: '服务器配置错误：COS 密钥或桶信息未设置。',
      data: null,
      error: { type: 'ServerConfiguration', details: 'COS environment variables are not properly set.' }
    };
  }

  const cos = new COS({ SecretId: secretId, SecretKey: secretKey });
  const cosFileKey = `songs/${orderId}/${audioId}/sound.${fileExtension}`;

  try {
    const uploadUrl = await new Promise((resolve, reject) => {
      cos.getObjectUrl(
        { Bucket: bucket, Region: region, Key: cosFileKey, Method: 'PUT', Expires: 3600 },
        (err, data) => (err ? reject(err) : resolve(data.Url))
      );
    });

    return {
      code: 0,
      message: '成功获取上传URL',
      data: {
        fileID: `cloud://${cloud.DYNAMIC_CURRENT_ENV}/${cosFileKey}`,
        uploadUrl
      },
      error: null
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      code: 500,
      message: `生成上传URL失败: ${detail}`,
      data: null,
      error: { type: 'ExecutionFailed', details: detail }
    };
  }
};
