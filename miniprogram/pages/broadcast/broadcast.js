Page({
  data: {
      order: null, // 保持此字段，尽管在此处它的直接作用不大了，但 WXML 不用改
      audioList: [], // 存储音频列表
      currentPlayingIndex: 0, // 当前播放音频的索引
      audioContext: null,
      backgroundUrl: null
  },

  async onLoad(options) {
      // --- 背景图获取逻辑 (保持不变) ---
      const bgImages = ['bj1.jpg', 'bj2.jpg', 'bj3.jpg', 'bj4.jpg', 'bj5.jpg'];
      const randomImage = bgImages[Math.floor(Math.random() * bgImages.length)];

      try {
          const [imageRes] = await Promise.all([
              wx.cloud.callFunction({
                  name: 'quickstartFunctions',
                  data: { type: 'getImages', path: `songsBackground/${randomImage}` }
              })
          ]);
          this.setData({
              backgroundUrl: imageRes.result.url
          });
      } catch (err) {
          console.error('获取背景图失败:', err);
      }
      // --- 背景图获取逻辑结束 ---

      // 创建并初始化 InnerAudioContext
      const audioContext = wx.createInnerAudioContext();
      audioContext.obeyMuteSwitch = false; // 不受静音键控制
      this.setData({ audioContext });

      // --- 解析传入的音频数据 ---
      let passedAudioData = [];
      try {
          // 注意：当通过URL传递复杂数组时，通常需要对其进行JSON字符串化和解码
          if (options.audioData) {
              passedAudioData = JSON.parse(decodeURIComponent(options.audioData));
          }
      } catch (e) {
          console.error('解析音频数据失败:', e);
          wx.showToast({ title: '音频数据解析错误', icon: 'none' });
          return;
      }

      if (!passedAudioData || passedAudioData.length === 0) {
          console.error('错误: 未传入任何音频数据。');
          wx.showToast({ title: '无音频数据', icon: 'none' });
          return;
      }

      // 格式化传入的数据，以匹配 audioList 期望的结构
      const formattedAudioList = passedAudioData.map(item => ({
          fileID: item.audioUrl,
          image: item.imageUrl || '/images/default_audio_cover.png', // 使用传入的图片或默认图片
          name: item.audioName || '未知歌曲',
          isPlaying: false,
          currentTimeRaw: 0,
          currentTime: '00:00',
          duration: 0,
          totalTime: '00:00'
      }));

      this.setData({
          audioList: formattedAudioList,
          currentPlayingIndex: 0 // 默认从第一个音频开始
      }, () => {
          // 设置完 audioList 后，尝试播放第一个音频
          // 使用 setTimeout 确保 setData 完成且 WXML 已渲染
          setTimeout(() => {
              this.togglePlay({ currentTarget: { dataset: { index: 0 } } });
          }, 100);
      });

      // --- 音频事件监听 ---
      audioContext.onPlay(() => {
          const { currentPlayingIndex } = this.data;
          if (currentPlayingIndex !== null) {
              this.setData({
                  [`audioList[${currentPlayingIndex}].isPlaying`]: true
              });
          }
      });

      audioContext.onTimeUpdate(() => {
          const { currentPlayingIndex, audioList } = this.data;
          if (currentPlayingIndex !== null && audioList[currentPlayingIndex]) {
              const currentTimeRaw = audioContext.currentTime;
              const duration = audioContext.duration;

              const formatTime = (seconds) => {
                  const minutes = Math.floor(seconds / 60);
                  const secs = Math.floor(seconds % 60);
                  return `${minutes < 10 ? '0' + minutes : minutes}:${secs < 10 ? '0' + secs : secs}`;
              };

              this.setData({
                  [`audioList[${currentPlayingIndex}].currentTimeRaw`]: currentTimeRaw,
                  [`audioList[${currentPlayingIndex}].currentTime`]: formatTime(currentTimeRaw),
                  [`audioList[${currentPlayingIndex}].duration`]: duration,
                  [`audioList[${currentPlayingIndex}].totalTime`]: formatTime(duration)
              });
          }
      });

      audioContext.onEnded(() => {
          const { currentPlayingIndex, audioList } = this.data;
          if (currentPlayingIndex !== null) {
              this.setData({
                  [`audioList[${currentPlayingIndex}].isPlaying`]: false,
                  [`audioList[${currentPlayingIndex}].currentTimeRaw`]: 0, // 重置当前时间
                  [`audioList[${currentPlayingIndex}].currentTime`]: '00:00' // 重置当前时间显示
              });

              // 自动播放下一首
              if (currentPlayingIndex < audioList.length - 1) {
                  this.setData({
                      currentPlayingIndex: currentPlayingIndex + 1
                  }, () => {
                      // 增加一个短暂延迟，确保Swiper动画完成再播放
                      setTimeout(() => {
                          this.togglePlay({ currentTarget: { dataset: { index: this.data.currentPlayingIndex } } });
                      }, 1000); // 1秒延迟
                  });
              } else {
                  // **这是修改点：如果是最后一首，则暂停并重置为第一首的索引，但不自动播放**
                  this.setData({
                      currentPlayingIndex: 0 // 重置为第一首的索引，以便下次点击播放时从头开始
                  });
                  wx.showToast({ title: '播放列表已结束', icon: 'none' });
                  // 注意：由于是 onEnded 事件，音频已经停止，所以不需要再调用 audioContext.pause()
                  // 也不再调用 togglePlay() 来自动播放下一首
              }
          }
      });

      audioContext.onError((res) => {
          console.error('音频播放错误:', res.errMsg);
          wx.showToast({
              title: '音频播放失败',
              icon: 'none'
          });
          const { currentPlayingIndex } = this.data;
          if (currentPlayingIndex !== null) {
              this.setData({
                  [`audioList[${currentPlayingIndex}].isPlaying`]: false,
              });
          }
      });

      audioContext.onCanplay(() => {
          const { currentPlayingIndex, audioList, audioContext } = this.data;
          if (currentPlayingIndex !== null && audioList[currentPlayingIndex] && audioContext.duration > 0) {
              const formatTime = (seconds) => {
                  const minutes = Math.floor(seconds / 60);
                  const secs = Math.floor(seconds % 60);
                  return `${minutes < 10 ? '0' + minutes : minutes}:${secs < 10 ? '0' + secs : secs}`;
              };

              // 仅当时长未设置或为0时才更新
              if (audioList[currentPlayingIndex].duration === 0) {
                  this.setData({
                      [`audioList[${currentPlayingIndex}].duration`]: audioContext.duration,
                      [`audioList[${currentPlayingIndex}].totalTime`]: formatTime(audioContext.duration)
                  });
              }
          }
      });
      // --- 音频事件监听结束 ---
  },

  /**
   * 滑块拖动中事件 (实时更新时间显示)
   */
  onSliderChanging(e) {
      const { currentPlayingIndex, audioList } = this.data;
      if (currentPlayingIndex === null || !audioList[currentPlayingIndex]) return;

      const currentTimeRaw = e.detail.value;
      const formatTime = (seconds) => {
          const minutes = Math.floor(seconds / 60);
          const secs = Math.floor(seconds % 60);
          return `${minutes < 10 ? '0' + minutes : minutes}:${secs < 10 ? '0' + secs : secs}`;
      };
      this.setData({
          [`audioList[${currentPlayingIndex}].currentTimeRaw`]: currentTimeRaw,
          [`audioList[${currentPlayingIndex}].currentTime`]: formatTime(currentTimeRaw)
      });
  },

  /**
   * 滑块拖动结束事件 (跳转播放位置)
   */
  onSliderChange(e) {
      const { currentPlayingIndex, audioContext, audioList } = this.data;
      if (currentPlayingIndex === null || !audioList[currentPlayingIndex] || !audioContext.duration) {
          console.warn('非当前播放音频或音频未准备好，无法跳转播放位置。');
          return;
      }
      const seekTime = e.detail.value;
      audioContext.seek(seekTime);
  },

  /**
   * Swiper `bindchange` 事件: 处理滑动切换音频
   */
  onSwiperChange(e) {
      const newIndex = e.detail.current;
      const { currentPlayingIndex, audioContext, audioList } = this.data;

      // 如果索引没变或没有音频，则不处理
      if (newIndex === currentPlayingIndex || !audioList.length) {
          return;
      }

      // 停止当前播放的音频，并重置其状态
      if (currentPlayingIndex !== null && audioList[currentPlayingIndex] && audioList[currentPlayingIndex].isPlaying) {
          audioContext.stop();
          this.setData({
              [`audioList[${currentPlayingIndex}].isPlaying`]: false,
              [`audioList[${currentPlayingIndex}].currentTimeRaw`]: 0,
              [`audioList[${currentPlayingIndex}].currentTime`]: '00:00'
          });
      }

      // 更新当前播放索引，并触发新音频的播放
      this.setData({
          currentPlayingIndex: newIndex
      }, () => {
          this.togglePlay({ currentTarget: { dataset: { index: newIndex } } });
      });
  },

  /**
   * 播放/暂停控制
   * @param {Object} e - 事件对象，包含被点击音频的索引
   */
  togglePlay(e) {
      const index = e.currentTarget.dataset.index;
      const { audioList, audioContext, currentPlayingIndex } = this.data;

      // 基本数据校验
      if (!audioList[index] || !audioList[index].fileID) {
          console.error('无法播放：音频数据无效或URL为空', audioList[index]);
          wx.showToast({ title: '音频地址无效', icon: 'none' });
          return;
      }

      // 如果点击的是当前正在播放的音频，则暂停
      if (index === currentPlayingIndex && audioList[index].isPlaying) {
          audioContext.pause();
          this.setData({
              [`audioList[${index}].isPlaying`]: false,
          });
          return;
      }

      // 如果点击了其他音频或当前音频未播放，则停止之前的，播放新的
      if (currentPlayingIndex !== null && currentPlayingIndex !== index && audioList[currentPlayingIndex] && audioList[currentPlayingIndex].isPlaying) {
          audioContext.stop();
          this.setData({
              [`audioList[${currentPlayingIndex}].isPlaying`]: false,
              [`audioList[${currentPlayingIndex}].currentTimeRaw`]: 0,
              [`audioList[${currentPlayingIndex}].currentTime`]: '00:00'
          });
      }

      // 设置新的音频源并播放
      const selectedAudio = audioList[index];
      audioContext.src = selectedAudio.fileID; // 设置音频源
      audioContext.play();

      // 更新状态
      this.setData({
          [`audioList[${index}].isPlaying`]: true,
          currentPlayingIndex: index // 确保 currentPlayingIndex 正确
      });
  },
  onBackTap() { // 将原 navigateBack 更名为 onBackTap
    wx.navigateBack({
      delta: 1 // 返回上一页
    });
  },
  /**
   * 页面卸载时停止并销毁音频实例
   */
  onUnload() {
      const { audioContext } = this.data;
      if (audioContext) {
          audioContext.stop(); // 停止播放
          audioContext.destroy(); // 销毁实例
      }
  }
});