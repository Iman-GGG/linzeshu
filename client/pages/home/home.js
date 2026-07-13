const app = getApp();

Page({
  data: {
    successCount: 0,
    failureCount: 0,
    marqueeList: [
      '作为普通市民我们要在保护好自己的前提下进行劝烟',
      '前有林则徐销烟，后有林则鼠劝烟',
      '林则徐有执法权，咱们林则鼠没有',
      '咱们积极举报，让执法机关看到我们的需求强度',
      '相信自己是对的，相信有人支持你'
    ]
  },

  onLoad() {
    this.updateStats();
  },

  onShow() {
    this.updateStats();
  },

  updateStats() {
    const records = wx.getStorageSync('smoke_records') || [];
    const successCount = records.filter(i => i.result === 'success').length;
    const failureCount = records.filter(i => i.result === 'failure').length;
    this.setData({ successCount, failureCount });
  },

  goGuide() { wx.navigateTo({ url: '/pages/guide/guide' }); },
  goCamera() { wx.navigateTo({ url: '/pages/camera/camera' }); },
  goRecords() { wx.navigateTo({ url: '/pages/records/records' }); },
  showPrivacy() { app.showPrivacyModal(true); },
  playStopSmoking() {
    const audioCtx = wx.createInnerAudioContext();
    audioCtx.src = '/audio/stopsmoking.mp3';
    audioCtx.play();
    audioCtx.onError((err) => {
      console.error('音频播放失败', err);
      wx.showToast({ title: '音频播放失败', icon: 'none' });
    });
  }
});
