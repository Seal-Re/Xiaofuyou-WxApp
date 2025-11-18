// cloud functions/uploadOrderAudio/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: 'cloud1-0gzwtgrxbaa45ab1' // 你的环境ID
});

exports.main = async (event, context) => {
  console.log('Received event keys:', Object.keys(event)); // 打印 event 的顶层 key
  console.log('Received event.multiPartFormData:', event.multiPartFormData); // 专门打印这个，看文本字段是否在这里
  console.log('Received event.body type:', typeof event.body); // 打印 event.body 的类型

  let orderId = null; // 初始化为 null
  let audioMetaData = [];

  // 优先级1: 优先从 event.multiPartFormData 获取数据
  // 这种方式最适合 Python requests 的 files=... 和 data=... 混合发送
  if (event.multiPartFormData) {
    orderId = event.multiPartFormData.order_id;
    try {
      if (event.multiPartFormData.audio_meta_data) {
        audioMetaData = JSON.parse(event.multiPartFormData.audio_meta_data);
      }
    } catch (e) {
      console.error("解析 event.multiPartFormData.audio_meta_data 失败:", e);
      return { success: false, message: "音频元数据解析失败", details: e.message };
    }
  } 
  // 优先级2: 如果 event.multiPartFormData 不存在，尝试从 event.body (假设是 URL-encoded 字符串) 获取
  // 这种情况在 multipart/form-data 中一般不会发生，但作为兼容性考虑
  else if (typeof event.body === 'string') {
    try {
      const parsedBody = new URLSearchParams(event.body);
      orderId = parsedBody.get('order_id');
      const metaStr = parsedBody.get('audio_meta_data');
      if (metaStr) {
          audioMetaData = JSON.parse(metaStr);
      }
    } catch (e) {
        console.error("尝试从 event.body 解析失败:", e);
    }
  }
  // 优先级3: 如果 event.body 直接就是对象 (比如 application/json)
  else if (typeof event.body === 'object' && event.body !== null) {
      orderId = event.body.order_id;
      try {
          if (event.body.audio_meta_data) {
              audioMetaData = JSON.parse(event.body.audio_meta_data);
          }
      } catch (e) {
          console.error("解析 event.body.audio_meta_data 失败:", e);
          return { success: false, message: "音频元数据解析失败", details: e.message };
      }
  }


  // --- 关键调试输出 ---
  console.log('Extracted orderId:', orderId);
  console.log('Extracted audioMetaData:', audioMetaData);
  // ---

  if (!orderId) {
    return {
      success: false,
      message: '缺少订单ID (order_id)。',
      details: `实际收到的 orderId 类型: ${typeof orderId}, 值: ${orderId}` // 更多调试信息
    };
  }
  if (!audioMetaData || audioMetaData.length === 0) {
      return {
          success: false,
          message: '缺少音频元数据或为空。',
          details: `实际收到的 audioMetaData 类型: ${typeof audioMetaData}, 值: ${JSON.stringify(audioMetaData)}`
      };
  }

  const uploadResults = [];

  // 2. 遍历每个文件并上传到云存储
  for (const meta of audioMetaData) {
      const audioId = meta.audio_id;
      const fileKey = meta.file_key; // 对应 Python 端 files 参数中的 key

      // 文件数据通常在 event.files 中
      const file = event.files && event.files[fileKey];

      if (!file) {
          console.warn(`未找到文件：${fileKey}，对应的音频ID：${audioId}`);
          uploadResults.push({
              audioId: audioId,
              success: false,
              message: `未找到文件：${fileKey}`
          });
          continue;
      }

      const cloudPath = `songs/${orderId}/${audioId}/sound.mp3`; // 确保这里是 .mp3 扩展名

      try {
          const uploadResult = await cloud.uploadFile({
              cloudPath: cloudPath,
              fileContent: file.path, // 文件在云函数临时目录中的路径
          });

          console.log(`音频 ${audioId} 上传结果:`, uploadResult);

          if (uploadResult.fileID) {
              const fileList = await cloud.getTempFileURL({
                  fileList: [uploadResult.fileID],
              });
              const fileURL = fileList.fileList[0].tempFileURL;

              uploadResults.push({
                  audioId: audioId,
                  success: true,
                  fileID: uploadResult.fileID,
                  fileURL: fileURL,
                  message: '上传成功'
              });
          } else {
              uploadResults.push({
                  audioId: audioId,
                  success: false,
                  message: '文件上传到云存储失败',
                  details: uploadResult
              });
          }
      } catch (uploadError) {
          console.error(`上传音频 ${audioId} 时发生错误:`, uploadError);
          uploadResults.push({
              audioId: audioId,
              success: false,
              message: `上传时发生异常: ${uploadError.message}`
          });
      }
  }

  // 返回所有文件的上传结果
  return {
    success: true,
    message: '所有音频文件处理完成',
    results: uploadResults
  };

};