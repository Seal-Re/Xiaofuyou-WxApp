const cloud = require('wx-server-sdk')

cloud.init()

exports.main = async (event, context) => {
  const { encryptedData, iv } = event

  try {
    const res = await cloud.openapi.cloudbase.decryptPhoneNumber({
      encryptedData,
      iv
    });

    return {
      phoneNumber: res.phoneNumber
    };
  } catch (err) {
    console.error('解密失败', err);
    return {
      errMsg: '解密失败',
      error: err
    };
  }
}
