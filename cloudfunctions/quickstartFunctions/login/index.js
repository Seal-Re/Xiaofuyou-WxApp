const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 初始化当前环境

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  return {
    openid: wxContext.OPENID
  }
}
