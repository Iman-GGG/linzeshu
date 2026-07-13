// Simple AI mock module (can be expanded or replaced with real AI service integration)
module.exports = {
  respond: function(utterance){
    const u = (utterance||'').toLowerCase();
    if(u.includes('活到')) return '个例不能代表整体，建议关注科学数据与公共健康。';
    if(u.includes('自由')) return '自由不应以侵害他人健康为代价，公共场所应遵守禁烟规定。';
    return '请您配合维护无烟环境，谢谢。';
  }
};
