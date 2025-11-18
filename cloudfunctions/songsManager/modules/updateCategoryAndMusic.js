// updateCategoryAndMusic.js
// 这是一个独立的云函数文件，仅包含更新逻辑

const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 推荐使用动态当前环境，或者填写你的环境 ID
});

const db = cloud.database();
const _ = db.command; // 用于数据库操作指令，例如更新字段

/**
 * 云函数入口函数
 * @param {Object} event - 包含客户端调用信息及参数 (这里主要期待来自Flask的updates)
 * @param {Object} context - 包含云函数运行环境信息
 */
exports.main = async (event, context) => {
  const { updates } = event; // 直接从事件中解构 updates

  // 确保 updates 字段存在且是对象
  if (!updates || typeof updates !== 'object') {
    return {
      code: 1,
      message: '缺少或 updates 字段格式不正确'
    };
  }

  const categoryChanges = updates.categories || { add: [], update: [], delete: [] };
  const songChanges = updates.songs || { add: [], update: [], delete: [] };

  const results = {
    category: { add: [], update: [], delete: [] },
    song: { add: [], update: [], delete: [] },
    errors: []
  };

  try {
    // --- 1. 处理删除操作 (优先处理，避免冲突和数据残留) ---

    // 获取被删除分类的 user_defined_id (id 字段)，用于删除相关歌曲
    let deletedCategoryUserIds = [];
    if (categoryChanges.delete && categoryChanges.delete.length > 0) {
      console.log('--- 开始处理分类删除:', categoryChanges.delete);
      const getDeletedCategoriesPromises = categoryChanges.delete.map(_id =>
        db.collection('category').doc(_id).get()
      );
      const deletedCategoryDocs = await Promise.allSettled(getDeletedCategoriesPromises);

      deletedCategoryDocs.forEach(result => {
        if (result.status === 'fulfilled' && result.value.data && result.value.data.id) {
          deletedCategoryUserIds.push(result.value.data.id);
        } else if (result.status === 'rejected') {
          console.error('获取待删除分类信息失败:', result.reason);
          results.errors.push(`获取待删除分类信息失败: ${result.reason}`);
        } else {
            console.warn(`待删除分类 ${_id} 未找到或数据不完整:`, result.value);
            results.errors.push(`待删除分类 ${_id} 未找到或数据不完整`);
        }
      });

      // 删除分类文档本身
      const deleteCategoryPromises = categoryChanges.delete.map(_id =>
        db.collection('category').doc(_id).remove()
      );

      // 删除与这些分类相关联的歌曲 (使用 user_defined_id 进行匹配)
      const deleteRelatedSongsPromises = deletedCategoryUserIds.length > 0 ?
        [db.collection('music').where({ categoryId: _.in(deletedCategoryUserIds) }).remove()] : [];

      const categoryDeleteResults = await Promise.allSettled([...deleteCategoryPromises, ...deleteRelatedSongsPromises]);
      categoryDeleteResults.forEach(r => {
        if (r.status === 'rejected') {
          results.errors.push(`删除分类或其关联歌曲失败: ${r.reason}`);
        }
      });
      results.category.delete = categoryChanges.delete;
      console.log('--- 分类删除完成。');
    }

    // 处理歌曲删除 (非分类联动删除的部分，即手动删除的歌曲)
    if (songChanges.delete && songChanges.delete.length > 0) {
      console.log('--- 开始处理歌曲删除:', songChanges.delete);
      const deleteSongPromises = songChanges.delete.map(_id =>
        db.collection('music').doc(_id).remove()
      );
      const songDeleteResults = await Promise.allSettled(deleteSongPromises);
      songDeleteResults.forEach(r => {
        if (r.status === 'rejected') {
          results.errors.push(`删除歌曲失败: ${r.reason}`);
        }
      });
      results.song.delete = songChanges.delete;
      console.log('--- 歌曲删除完成。');
    }

    // --- 2. 处理添加操作 ---

    // 添加新分类及其下的歌曲
    if (categoryChanges.add && categoryChanges.add.length > 0) {
      console.log('--- 开始处理分类添加:', categoryChanges.add);
      const addCategoryPromises = categoryChanges.add.map(async (catData) => {
        const { musicList, ...categoryDoc } = catData; // 提取 musicList，它将单独处理
        const addResult = await db.collection('category').add({ data: categoryDoc }); // add 方法需要 data: {} 结构

        // 如果新分类中有歌曲，则添加这些歌曲
        if (musicList && musicList.length > 0) {
          const newCategoryUserDefinedId = categoryDoc.id; // 新分类的用户定义 ID
          const addSongPromises = musicList.map(song => {
            const { _id, ...songDoc } = song; // 确保不传递前端的临时 _id
            return db.collection('music').add({ // add 方法需要 data: {} 结构
              data: {
                ...songDoc,
                categoryId: newCategoryUserDefinedId // 关联到新分类的用户定义 ID
              }
            });
          });
          const songAddResults = await Promise.allSettled(addSongPromises); // 等待所有歌曲添加完成
          songAddResults.forEach(r => {
            if (r.status === 'rejected') {
                results.errors.push(`添加新分类中的歌曲失败: ${r.reason}`);
            }
          });
        }
        results.category.add.push(addResult._id); // 记录新添加的分类 ID
        return addResult;
      });
      const addCategoryResults = await Promise.allSettled(addCategoryPromises);
      addCategoryResults.forEach(r => {
        if (r.status === 'rejected') {
            results.errors.push(`添加分类失败: ${r.reason}`);
        }
      });
      console.log('--- 分类添加完成。');
    }

    // 添加到现有分类的歌曲 (这部分歌曲在 Flask 后端已经被正确区分了)
    if (songChanges.add && songChanges.add.length > 0) {
      console.log('--- 开始处理歌曲添加:', songChanges.add);
      const addSongPromises = songChanges.add.map(songData => {
        const { _id, ...songDoc } = songData; // 确保不传递前端的临时 _id
        return db.collection('music').add({ data: songDoc }); // add 方法需要 data: {} 结构
      });
      const addSongResults = await Promise.allSettled(addSongPromises);
      addSongResults.forEach(r => {
        if (r.status === 'rejected') {
            results.errors.push(`添加歌曲失败: ${r.reason}`);
        }
      });
      // 记录添加的歌曲信息，这里记录的可以是原始数据，也可以是数据库返回的 _id
      results.song.add.push(...songChanges.add.map(s => s.id || JSON.stringify(s))); 
      console.log('--- 歌曲添加完成。');
    }

    // --- 3. 处理更新操作 ---

    // 更新分类
    if (categoryChanges.update && categoryChanges.update.length > 0) {
      console.log('--- 开始处理分类更新:', categoryChanges.update);
      const updateCategoryPromises = categoryChanges.update.map(catData => {
        const { _id, musicList, ...updateDoc } = catData; // 提取 _id 和 musicList
        return db.collection('category').doc(_id).update({ data: updateDoc }); // update 方法需要 data: {} 结构
      });
      const updateCategoryResults = await Promise.allSettled(updateCategoryPromises);
      updateCategoryResults.forEach(r => {
        if (r.status === 'rejected') {
            results.errors.push(`更新分类失败: ${r.reason}`);
        }
      });
      results.category.update.push(...categoryChanges.update.map(c => c._id));
      console.log('--- 分类更新完成。');
    }

    // 更新歌曲
    if (songChanges.update && songChanges.update.length > 0) {
      console.log('--- 开始处理歌曲更新:', songChanges.update);
      const updateSongPromises = songChanges.update.map(songData => {
        const { _id, ...updateDoc } = songData; // 提取 _id
        return db.collection('music').doc(_id).update({ data: updateDoc }); // update 方法需要 data: {} 结构
      });
      const updateSongResults = await Promise.allSettled(updateSongPromises);
      updateSongResults.forEach(r => {
        if (r.status === 'rejected') {
            results.errors.push(`更新歌曲失败: ${r.reason}`);
        }
      });
      results.song.update.push(...songChanges.update.map(s => s._id));
      console.log('--- 歌曲更新完成。');
    }

    // --- 4. 返回最终结果 ---
    if (results.errors.length > 0) {
      return {
        code: 1,
        message: '部分数据更新失败',
        data: results,
        detail: results.errors
      };
    } else {
      return {
        code: 0,
        message: '所有数据更新成功',
        data: results
      };
    }

  } catch (e) {
    console.error('云函数执行异常:', e);
    return {
      code: 1,
      message: '云函数执行异常',
      error: e.message,
      data: results // 返回部分结果用于调试
    };
  }
};