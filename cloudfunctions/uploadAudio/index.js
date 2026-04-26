const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  let orderId = null;
  let audioMetaData = [];

  if (event.multiPartFormData) {
    orderId = event.multiPartFormData.order_id;
    try {
      if (event.multiPartFormData.audio_meta_data) {
        audioMetaData = JSON.parse(event.multiPartFormData.audio_meta_data);
      }
    } catch (e) {
      console.error('解析 audio_meta_data 失败:', e);
      return { success: false, message: '音频元数据解析失败', details: e.message };
    }
  } else if (typeof event.body === 'string') {
    try {
      const parsedBody = new URLSearchParams(event.body);
      orderId = parsedBody.get('order_id');
      const metaStr = parsedBody.get('audio_meta_data');
      if (metaStr) audioMetaData = JSON.parse(metaStr);
    } catch (e) {
      console.error('从 event.body 解析失败:', e);
    }
  } else if (typeof event.body === 'object' && event.body !== null) {
    orderId = event.body.order_id;
    try {
      if (event.body.audio_meta_data) {
        audioMetaData = JSON.parse(event.body.audio_meta_data);
      }
    } catch (e) {
      console.error('解析 event.body.audio_meta_data 失败:', e);
      return { success: false, message: '音频元数据解析失败', details: e.message };
    }
  }

  if (!orderId) {
    return { success: false, message: '缺少订单ID (order_id)。' };
  }
  if (!audioMetaData || audioMetaData.length === 0) {
    return { success: false, message: '缺少音频元数据或为空。' };
  }

  const uploadResults = [];

  for (const meta of audioMetaData) {
    const { audio_id: audioId, file_key: fileKey } = meta;
    const file = event.files && event.files[fileKey];

    if (!file) {
      console.warn(`未找到文件：${fileKey}，音频ID：${audioId}`);
      uploadResults.push({ audioId, success: false, message: `未找到文件：${fileKey}` });
      continue;
    }

    const cloudPath = `songs/${orderId}/${audioId}/sound.mp3`;

    try {
      const uploadResult = await cloud.uploadFile({ cloudPath, fileContent: file.path });

      if (uploadResult.fileID) {
        const fileList = await cloud.getTempFileURL({ fileList: [uploadResult.fileID] });
        uploadResults.push({
          audioId,
          success: true,
          fileID: uploadResult.fileID,
          fileURL: fileList.fileList[0].tempFileURL,
          message: '上传成功'
        });
      } else {
        uploadResults.push({ audioId, success: false, message: '文件上传到云存储失败', details: uploadResult });
      }
    } catch (uploadError) {
      console.error(`上传音频 ${audioId} 时发生错误:`, uploadError);
      uploadResults.push({ audioId, success: false, message: `上传时发生异常: ${uploadError.message}` });
    }
  }

  return { success: true, message: '所有音频文件处理完成', results: uploadResults };
};
