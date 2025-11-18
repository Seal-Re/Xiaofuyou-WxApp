const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前云函数环境
});

exports.main = async (event, context) => {
  const { userId, page } = event; // 从前端传入的参数
  const scene = `userId=${userId}`; // 构造 scene 参数

  // 检查 scene 参数长度，微信限制为最大32个可见字符
  if (scene.length > 32) {
    return {
      errcode: -1,
      errmsg: 'scene 参数长度超过限制（最大32字符）',
    };
  }

  try {
    const result = await cloud.openapi.wxacode.getUnlimitedQRCode({
      scene: scene,
      page: page || 'pages/index/index', // 如果前端没有传 page，默认跳转到主页
      // 以下参数可选，根据需求添加
      // width: 430, // 二维码的宽度，单位 px，最小 280px，最大 1280px
      // auto_color: false, // 自动配置线条颜色
      // line_color: {"r":0,"g":0,"b":0}, // auto_color 为 false 时生效
      // is_hyaline: false, // 是否需要透明底色
      // env_version: 'release', // 要打开的小程序版本。'release'（正式版）、'trial'（体验版）、'develop'（开发版）
    });

    // 成功时，result.buffer 是一个 ArrayBuffer
    // 我们将其直接返回给前端，由前端转换为 base64
    return {
      errcode: 0,
      errmsg: 'ok',
      buffer: result.buffer // 直接返回 ArrayBuffer
    };

  } catch (err) {
    console.error('调用 getUnlimitedQRCode 接口异常:', err);
    return {
      errcode: -1,
      errmsg: `服务器内部错误: ${err.errCode || err.message || '未知错误'}`,
      detail: err // 返回详细错误信息以便调试
    };
  }
};