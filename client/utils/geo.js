// TODO: 请填入你的腾讯位置服务 Key
// 申请地址: https://lbs.qq.com
const TX_MAP_KEY = '';

function reverseGeocode(lat, lng, callback) {
  if (!TX_MAP_KEY) { callback(''); return; }
  wx.request({
    url: 'https://apis.map.qq.com/ws/geocoder/v1/',
    data: { location: `${lat},${lng}`, key: TX_MAP_KEY, output: 'json' },
    success(res) {
      if (res.data && res.data.status === 0 && res.data.result) {
        callback(res.data.result.address || '');
      } else {
        callback('');
      }
    },
    fail() { callback(''); }
  });
}

module.exports = { reverseGeocode, TX_MAP_KEY };
