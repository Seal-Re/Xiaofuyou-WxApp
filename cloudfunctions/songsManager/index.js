const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const getCategoryAndMusicModule = require('./modules/getCategoryAndMusic')
const updateCategoryAndMusicModule = require('./modules/updateCategoryAndMusic')

exports.main = async (event, context) => {
  let action;
  let eventToProcess = event; // 默认使用原始 event 对象

  try {
    if (event.body && typeof event.body === 'string') {
      const parsedBody = JSON.parse(event.body);
      action = parsedBody.action;
      eventToProcess = parsedBody; // **关键改动：如果 body 被解析，就用解析后的对象作为要处理的事件**
      // 同时将原始 event 对象的其他属性（如 context 或文件上传信息）合并进去，以防子模块需要
      // Object.assign(eventToProcess, event); // 可选，如果子模块需要原始 event 中的其他字段
    } else {
      action = event.action;
      // 如果没有 event.body，说明 action 就在 event 的顶层，
      // 此时 eventToProcess 保持为原始 event 对象即可。
    }
  } catch (e) {
    console.error('云函数解析请求体失败:', e);
    action = event.action; // 解析失败时回退
  }

  try {
    switch (action) {
      case 'getCategoryAndMusic':
        return await getCategoryAndMusicModule(eventToProcess, context)

      case 'updateCategoryAndMusic':
        // **这里是关键：将包含 'updates' 的 parsedBody 传递给子模块**
        return await updateCategoryAndMusicModule.main(eventToProcess, context)

      default:
        console.warn(`未知的 action: ${action}, 接收到的事件:`, event);
        return {
          code: 1,
          msg: `未知的 action: ${action}`
        }
    }
  } catch (err) {
    console.error('云函数执行错误:', err)
    return {
      code: 1,
      msg: '服务器内部错误',
      error: err.message || '未知错误',
      stack: err.stack
    }
  }
}