// 菜品数据
const dishes = [
    // 自然之声
    {
      id: 'm001',
      categoryId: 'c001',
      name: '森林漫步',
      image: '/images/music/forest.jpg',
      description: '鸟鸣虫叫与微风树叶的自然合奏，带来宁静与放松',
      isPopular: true,
      order: 1
    },
    {
      id: 'm002',
      categoryId: 'c001',
      name: '海边冥想',
      image: '/images/music/beach.jpg',
      description: '海浪轻拍沙滩的声音，帮助缓解压力与焦虑',
      isPopular: true,
      order: 2
    },
    {
      id: 'm003',
      categoryId: 'c001',
      name: '细雨滴答',
      image: '/images/music/rain.jpg',
      description: '舒缓的雨声背景，营造平静氛围，助于睡眠',
      isPopular: false,
      order: 3
    },
    
    // 古典舒缓
    {
      id: 'm004',
      categoryId: 'c002',
      name: '巴赫：哥德堡变奏曲',
      image: '/images/music/bach.jpg',
      description: '巴洛克时期经典，平静心灵，增强专注力',
      isPopular: true,
      order: 1
    },
    {
      id: 'm005',
      categoryId: 'c002',
      name: '肖邦：夜曲集',
      image: '/images/music/chopin.jpg',
      description: '柔和的钢琴旋律，带来宁静与慰藉',
      isPopular: true,
      order: 2
    },
    {
      id: 'm006',
      categoryId: 'c002',
      name: '德彪西：月光',
      image: '/images/music/debussy.jpg',
      description: '如梦如幻的经典之作，舒缓情绪',
      isPopular: false,
      order: 3
    },
    
    // 轻音乐韵
    {
      id: 'm007',
      categoryId: 'c003',
      name: '班得瑞：安妮的仙境',
      image: '/images/music/bandari.jpg',
      description: '清新自然的轻音乐，带来愉悦心情',
      isPopular: true,
      order: 1
    },
    {
      id: 'm008',
      categoryId: 'c003',
      name: '神秘园：夜曲',
      image: '/images/music/secretgarden.jpg',
      description: '空灵的旋律，缓解紧张情绪',
      isPopular: true,
      order: 2
    },
    {
      id: 'm009',
      categoryId: 'c003',
      name: '久石让：天空之城',
      image: '/images/music/joe.jpg',
      description: '温暖治愈的钢琴与弦乐，抚慰心灵',
      isPopular: false,
      order: 3
    },
    
    // 冥想放松
    {
      id: 'm010',
      categoryId: 'c004',
      name: '阿尔法脑波音乐',
      image: '/images/music/alpha.jpg',
      description: '科学设计的频率音乐，促进深度放松',
      isPopular: true,
      order: 1
    },
    {
      id: 'm011',
      categoryId: 'c004',
      name: '深度冥想引导',
      image: '/images/music/meditation.jpg',
      description: '专业语音引导，帮助进入冥想状态',
      isPopular: true,
      order: 2
    },
    {
      id: 'm012',
      categoryId: 'c004',
      name: '白噪音冥想',
      image: '/images/music/whitenoise.jpg',
      description: '恒定频率背景音，屏蔽外界干扰',
      isPopular: false,
      order: 3
    },
    
    // 摇篮曲集
    {
      id: 'm013',
      categoryId: 'c005',
      name: '勃拉姆斯摇篮曲',
      image: '/images/music/brahms.jpg',
      description: '经典舒缓的摇篮曲，安抚情绪',
      isPopular: true,
      order: 1
    },
    {
      id: 'm014',
      categoryId: 'c005',
      name: '舒伯特摇篮曲',
      image: '/images/music/schubert.jpg',
      description: '温柔的旋律，助于入睡',
      isPopular: true,
      order: 2
    },
    {
      id: 'm015',
      categoryId: 'c005',
      name: '轻柔睡眠曲',
      image: '/images/music/sleep.jpg',
      description: '专为失眠设计的舒缓音乐',
      isPopular: false,
      order: 3
    },
    
    // 新世纪音乐
    {
      id: 'm016',
      categoryId: 'c006',
      name: '雅尼：夜莺',
      image: '/images/music/yanni.jpg',
      description: '融合东西方音乐元素的经典之作',
      isPopular: true,
      order: 1
    },
    {
      id: 'm017',
      categoryId: 'c006',
      name: '恩雅：Only Time',
      image: '/images/music/enya.jpg',
      description: '空灵女声与舒缓旋律的完美结合',
      isPopular: true,
      order: 2
    },
    {
      id: 'm018',
      categoryId: 'c006',
      name: '喜多郎：丝绸之路',
      image: '/images/music/kitaro.jpg',
      description: '富有东方神秘色彩的新世纪音乐',
      isPopular: false,
      order: 3
    },
    
    // 钢琴独奏
    {
      id: 'm019',
      categoryId: 'c007',
      name: '肖邦：雨滴前奏曲',
      image: '/images/music/chopin2.jpg',
      description: '富有诗意的钢琴小品，平静心情',
      isPopular: true,
      order: 1
    },
    {
      id: 'm020',
      categoryId: 'c007',
      name: '理查德·克莱德曼：秋日私语',
      image: '/images/music/richard.jpg',
      description: '浪漫的钢琴旋律，唤起美好回忆',
      isPopular: true,
      order: 2
    },
    {
      id: 'm021',
      categoryId: 'c007',
      name: '久石让：菊次郎的夏天',
      image: '/images/music/joe2.jpg',
      description: '温暖治愈的钢琴小品，带来轻松感',
      isPopular: false,
      order: 3
    },
    
    // 其他治愈旋律
    {
      id: 'm022',
      categoryId: 'c008',
      name: '风居住的街道',
      image: '/images/music/wind.jpg',
      description: '二胡与钢琴的深情对话，舒缓忧伤',
      isPopular: true,
      order: 1
    },
    {
      id: 'm023',
      categoryId: 'c008',
      name: '故乡的原风景',
      image: '/images/music/hometown.jpg',
      description: '陶笛演奏的经典曲目，唤起思乡之情',
      isPopular: true,
      order: 2
    },
    {
      id: 'm024',
      categoryId: 'c008',
      name: '神秘园之歌',
      image: '/images/music/secretgarden2.jpg',
      description: '简单而深刻的旋律，抚慰疲惫心灵',
      isPopular: false,
      order: 3
    }
  ];

module.exports = dishes; 