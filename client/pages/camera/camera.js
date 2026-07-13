const geo = require('../../utils/geo');
const { RESULT } = require('../../utils/constants');

let currentAudio = null;

function stopCurrentAudio() {
  if (currentAudio) {
    try {
      currentAudio.stop();
      currentAudio.destroy();
    } catch (e) {
      // ignore
    }
    currentAudio = null;
  }
}

function speak(audioPath, text, page) {
  stopCurrentAudio();
  // Toast 只做简短提示（真机有 7 字限制），完整文案渲染到页面播报栏
  wx.showToast({ title: '语音播报中', icon: 'none', duration: 2000 });
  wx.vibrateShort({ type: 'light' });
  if (page) {
    page.setData({ announceText: text });
  }
  const audioCtx = wx.createInnerAudioContext();
  currentAudio = audioCtx;
  audioCtx.src = audioPath;
  audioCtx.play();
  audioCtx.onError((err) => {
    console.error('音频播放失败', err);
  });
  audioCtx.onEnded(() => {
    if (currentAudio === audioCtx) {
      currentAudio = null;
    }
    if (page) {
      page.setData({ announceText: '' });
    }
  });
}

Page({
  data: { recording: false, showCamera: false, screenshotPath: '', finishing: false, announceText: '' },

  // 录像劝烟：先走隐私授权，再检查/申请权限，全部获取后激活相机
  activateCamera() {
    if (this.data.showCamera || this.data.recording) {
      wx.showToast({ title: '正在录制中，请先结束当前录制', icon: 'none' });
      return;
    }
    wx.requirePrivacyAuthorize({
      success: () => {
        this.ensurePermissions(() => this.openCamera());
      },
      fail: () => {
        wx.showToast({ title: '需要同意隐私协议才能使用劝烟相机', icon: 'none', duration: 3000 });
      }
    });
  },

  // 确保相机+录音权限，缺失时引导申请
  ensurePermissions(onGranted) {
    wx.getSetting({
      success: (res) => {
        const camera = res.authSetting['scope.camera'];
        const record = res.authSetting['scope.record'];

        if (camera === true && record === true) {
          onGranted && onGranted();
          return;
        }

        if (this._permPrompted || this._wentToSetting) {
          onGranted && onGranted();
          return;
        }

        if (camera !== true) {
          wx.authorize({
            scope: 'scope.camera',
            success: () => {
              if (record !== true) {
                wx.authorize({
                  scope: 'scope.record',
                  success: () => {
                    this._permPrompted = true;
                    wx.showToast({ title: '权限已获取，请重新激活录像劝烟', icon: 'none', duration: 2500 });
                  },
                  fail: () => this.showSettingGuide('麦克风')
                });
              } else {
                this._permPrompted = true;
                wx.showToast({ title: '权限已获取，请重新激活录像劝烟', icon: 'none', duration: 2500 });
              }
            },
            fail: () => this.showSettingGuide('摄像头')
          });
        } else if (record !== true) {
          wx.authorize({
            scope: 'scope.record',
            success: () => {
              this._permPrompted = true;
              wx.showToast({ title: '权限已获取，请重新激活录像劝烟', icon: 'none', duration: 2500 });
            },
            fail: () => this.showSettingGuide('麦克风')
          });
        }
      }
    });
  },

  showSettingGuide(permissionName) {
    wx.showModal({
      title: '需要授权',
      content: `需要使用${permissionName}权限才能进行录像取证，请前往设置页开启。`,
      confirmText: '去设置',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this._wentToSetting = true;
          wx.openSetting();
        }
      }
    });
  },

  openCamera() {
    this.setData({ showCamera: true, screenshotPath: '' }, () => {
      setTimeout(() => {
        this._cameraCtx = wx.createCameraContext();
        this.startRecording(this._cameraCtx);
      }, 800);
    });
  },

  // 录制过程中手动拍照并保存到相册
  takeSnapshot() {
    if (!this._cameraCtx) return;
    this._cameraCtx.takePhoto({
      quality: 'high',
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempImagePath,
          success: () => {
            wx.showToast({ title: '照片已保存到相册', icon: 'success' });
          },
          fail: () => {
            wx.showToast({ title: '保存照片失败', icon: 'none' });
          }
        });
        this.persistScreenshot(res.tempImagePath);
      },
      fail: (err) => {
        console.error('takePhoto failed', err);
        wx.showToast({ title: '拍照失败', icon: 'none' });
      }
    });
  },

  // 将截图临时文件保存到本地持久路径
  persistScreenshot(tempPath) {
    const fs = wx.getFileSystemManager();
    const savedPath = `${wx.env.USER_DATA_PATH}/screenshot_${Date.now()}.jpg`;
    fs.saveFile({
      tempFilePath: tempPath,
      filePath: savedPath,
      success: () => {
        this.setData({ screenshotPath: savedPath });
      },
      fail: (err) => {
        console.error('保存截图失败', err);
      }
    });
  },

  // 开始录制与播报，58秒后自动结束
  startRecording(ctx) {
    this.clearRecordTimer();
    this._recordTimer = setTimeout(() => {
      if (this.data.recording) {
        wx.showToast({ title: '录制已达上限，自动结束', icon: 'none', duration: 3000 });
        this.stopSuccess();
      }
    }, 58000);

    ctx.startRecord({
      success: () => {
        this.setData({ recording: true });
        speak('/audio/start.mp3', '开始取证，全程录音录像，现在根据《上海市控制吸烟条例》第十二条依法对你进行劝阻，依照法律法规此处禁烟！麻烦立刻把烟灭掉！', this);
      },
      fail: (err) => {
        this.clearRecordTimer();
        console.error('startRecord failed', err);
        wx.showToast({ title: '无法启动录制，请检查权限', icon: 'none' });
        this.setData({ showCamera: false, recording: false, screenshotPath: '' });
      }
    });
  },

  clearRecordTimer() {
    if (this._recordTimer) {
      clearTimeout(this._recordTimer);
      this._recordTimer = null;
    }
  },

  // 成功且结束
  stopSuccess() {
    if (this.data.finishing) return;
    this.setData({ finishing: true });
    this.clearRecordTimer();
    this.stopRecord(RESULT.SUCCESS);
  },

  // 失败且结束
  stopFailure() {
    if (this.data.finishing) return;
    this.setData({ finishing: true });
    this.clearRecordTimer();
    this.stopRecord(RESULT.FAILURE);
  },

  // 停止录制：停止当前语音 -> 播报结束 -> 停止录像 -> 获取定位 -> 保存视频 -> 保存本地记录
  stopRecord(result) {
    const that = this;
    const ctx = this._cameraCtx || wx.createCameraContext();

    this._endResult = result;
    stopCurrentAudio();

    if (result === RESULT.SUCCESS) {
      speak('/audio/success.mp3', '取证完毕，已制止。感谢配合，请共同维护无烟环境。', this);
    } else {
      speak('/audio/failure.mp3', '对方拒绝遵守上海市禁烟法规，本次劝阻失败。我将向场所管理方及12345热线举报。', this);
    }

    setTimeout(() => {
      ctx.stopRecord({
        success(res) {
          that.fetchLocation((location) => {
            that.saveVideoAndRecord(res.tempVideoPath, result, location);
          });
        },
        fail(err) {
          console.error('stopRecord fail', err);
          wx.showToast({ title: '停止录制失败', icon: 'none' });
          that.setData({ finishing: false });
        }
      });
    }, 3000);
  },

  // 获取当前定位（含逆地址解析）
  fetchLocation(callback) {
    wx.getLocation({
      type: 'gcj02',
      success(res) {
        geo.reverseGeocode(res.latitude, res.longitude, (address) => {
          callback({ lat: res.latitude, lng: res.longitude, address: address });
        });
      },
      fail(err) {
        console.error('获取定位失败', err);
        callback(null);
      }
    });
  },

  // 保存视频到持久路径 -> 存入相册 -> 写入本地记录
  saveVideoAndRecord(tempVideoPath, result, location) {
    const that = this;
    const fs = wx.getFileSystemManager();
    const savedVideoPath = `${wx.env.USER_DATA_PATH}/video_${Date.now()}.mp4`;

    fs.saveFile({
      tempFilePath: tempVideoPath,
      filePath: savedVideoPath,
      success() {
        wx.saveVideoToPhotosAlbum({
          filePath: savedVideoPath,
          success() {
            wx.showToast({ title: '已保存到相册', icon: 'success' });
          },
          fail(err) {
            console.error('保存视频到相册失败', err);
          }
        });
        that.finishRecord(result, savedVideoPath, location);
      },
      fail(err) {
        console.error('持久化视频失败', err);
        wx.showToast({ title: '保存视频失败', icon: 'none' });
        that.finishRecord(result, tempVideoPath, location);
      }
    });
  },

  // 结束录制状态并保存记录
  finishRecord(result, videoPath, location) {
    this.saveLocalRecord(result, videoPath, location);
    this.setData({ recording: false, showCamera: false, screenshotPath: '', finishing: false, announceText: '' });
  },

  // 用户取消录制：立即停止，不播报、不保存相册、不生成记录
  cancelRecord() {
    if (this.data.finishing) return;
    this.setData({ finishing: true });
    this.clearRecordTimer();

    const that = this;
    const ctx = this._cameraCtx || wx.createCameraContext();

    stopCurrentAudio();

    ctx.stopRecord({
      success() {
        that.setData({ recording: false, showCamera: false, screenshotPath: '', finishing: false, announceText: '' });
        wx.showToast({ title: '已取消录制', icon: 'none' });
      },
      fail() {
        that.setData({ recording: false, showCamera: false, screenshotPath: '', finishing: false, announceText: '' });
        wx.showToast({ title: '已取消录制', icon: 'none' });
      }
    });
  },

  onCameraError(e) {
    console.error('camera error', e);
    this.clearRecordTimer();
    wx.showToast({ title: '相机错误，请检查权限', icon: 'none' });
    this.setData({ showCamera: false, recording: false });
  },

  onCameraStop(e) {
    console.log('camera stop', e);
  },

  onUnload() {
    this.cleanupOnExit();
  },

  onHide() {
    this.cleanupOnExit();
  },

  // 页面卸载时的资源清理，尽力保存已录制的视频
  cleanupOnExit() {
    this.clearRecordTimer();
    const { recording, finishing } = this.data;
    const ctx = this._cameraCtx || wx.createCameraContext();

    if (recording) {
      stopCurrentAudio();
      ctx.stopRecord({ success: () => {}, fail: () => {} });
      this.setData({ recording: false, showCamera: false, screenshotPath: '', finishing: false, announceText: '' });
      return;
    }

    if (finishing) {
      stopCurrentAudio();
      const that = this;
      ctx.stopRecord({
        success(res) {
          const fs = wx.getFileSystemManager();
          const savedVideoPath = `${wx.env.USER_DATA_PATH}/video_${Date.now()}.mp4`;
          fs.saveFile({
            tempFilePath: res.tempVideoPath,
            filePath: savedVideoPath,
            success() {
              that.saveLocalRecord(that._endResult, savedVideoPath, null);
            },
            fail() {
              that.saveLocalRecord(that._endResult, res.tempVideoPath, null);
            }
          });
        },
        fail() {}
      });
      this.setData({ recording: false, showCamera: false, screenshotPath: '', finishing: false, announceText: '' });
    }
  },

  // 保存记录到本地存储
  saveLocalRecord(result, videoPath, location) {
    const record = {
      record_id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      result: result,
      summary: result === RESULT.SUCCESS ? '劝烟成功' : '劝烟失败',
      videoPath: videoPath,
      screenshotPath: this.data.screenshotPath || '',
      lat: location ? location.lat : null,
      lng: location ? location.lng : null,
      address: location ? location.address || '' : ''
    };
    const records = wx.getStorageSync('smoke_records') || [];
    records.unshift(record);
    wx.setStorageSync('smoke_records', records);
  },

  // 偷偷举报：跳转上海市控烟热力地图
  secretReport() {
    const KONGYAN_APP_ID = 'wx27a7f31823b33c4f';

    wx.navigateToMiniProgram({
      appId: KONGYAN_APP_ID,
      path: '',
      success() {
        console.log('跳转控烟热力地图成功');
      },
      fail(err) {
        console.error('跳转失败', err);
        wx.showToast({ title: '跳转失败，请手动搜索"控烟热力图"小程序', icon: 'none', duration: 3000 });
      }
    });
  }
});
