Page({
  data: {
    activePanel: null
  },
  togglePanel(e) {
    const panel = e.currentTarget.dataset.panel;
    this.setData({
      activePanel: this.data.activePanel === panel ? null : panel
    });
  },
  openSource() {
    const url = 'https://cgzf.sh.gov.cn/channel_89/20210811/18c5956b08754e40ad58f593a35503d3.html';
    wx.navigateTo({ url: '/pages/webview/webview?src=' + encodeURIComponent(url) });
  }
});
