const geo = require('../../utils/geo');

function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}:${s}`;
}

Page({
  data: {
    items: [],
    showVideo: false,
    videoSrc: ''
  },

  onLoad() {
    this.fetchLocalRecords();
  },

  onShow() {
    this.fetchLocalRecords();
  },

  fetchLocalRecords() {
    let records = wx.getStorageSync('smoke_records') || [];
    records = records.map(item => ({
      ...item,
      displayTime: formatTime(item.timestamp),
      coordText: (item.lat != null && item.lng != null)
        ? `${Number(item.lat).toFixed(4)}, ${Number(item.lng).toFixed(4)}`
        : ''
    }));
    this.setData({ items: records });
    // 尝试为没有 address 的旧记录补解析地址
    if (geo.TX_MAP_KEY) {
      this.backfillAddresses(records);
    }
  },

  // 为已有记录补解析地址（需要填入 TX_MAP_KEY）
  backfillAddresses(records) {
    records.forEach((item, index) => {
      if (!item.address && item.lat != null && item.lng != null) {
        geo.reverseGeocode(item.lat, item.lng, (address) => {
          if (address) {
            const key = `items[${index}].address`;
            this.setData({ [key]: address });
            const all = wx.getStorageSync('smoke_records') || [];
            const found = all.find(r => r.record_id === item.record_id);
            if (found) { found.address = address; wx.setStorageSync('smoke_records', all); }
          }
        });
      }
    });
  },

  // 预览截图
  previewImage(e) {
    const src = e.currentTarget.dataset.src;
    if (!src) return;
    wx.previewImage({ urls: [src], current: src });
  },

  // 播放视频
  playVideo(e) {
    const src = e.currentTarget.dataset.src;
    if (!src) {
      wx.showToast({ title: '视频路径无效', icon: 'none' });
      return;
    }
    this.setData({ videoSrc: src, showVideo: true });
  },

  // 关闭视频
  closeVideo() {
    this.setData({ showVideo: false, videoSrc: '' });
  },

  // 清空记录
  clearRecords() {
    const that = this;
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有劝烟记录吗？此操作不可恢复。',
      success(res) {
        if (res.confirm) {
          wx.removeStorageSync('smoke_records');
          that.setData({ items: [] });
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  }
});
