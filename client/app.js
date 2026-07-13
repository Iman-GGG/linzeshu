App({
  onLaunch() {
    this.showPrivacyModal();
  },

  showPrivacyModal(force = false) {
    if (!force) {
      const accepted = wx.getStorageSync('privacy_accepted');
      if (accepted) return;
    }
    wx.showModal({
      title: '隐私说明与用户协议',
      content: '林则鼠为公益控烟辅助工具。使用劝烟相机时，需获取摄像头、麦克风及定位权限。录制的音视频与劝阻记录台账仅保存在您的手机本地，不会上传云端。如需向官方举报，请通过"偷偷举报"跳转上海控烟热力地图，自行上传图片、填写信息完成举报。点击确定即表示您同意上述规则。',
      showCancel: false,
      confirmText: '我知道了',
      success: () => {
        wx.setStorageSync('privacy_accepted', true);
      }
    });
  }
});
