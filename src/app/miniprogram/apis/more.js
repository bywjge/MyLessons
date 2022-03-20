import logger from '../utils/log'
import request from '../utils/request'
import tools from '../utils/tools'
import lessonApi from './lessons'
import  * as database from '../static/js/database'

const log = new logger()
log.setKeyword('apis/more.js')

const collegeId = {
 "LED研究院": "00026",
 "人事处": "00043",
 "人才培养质量管理办公室（高教研究所）": "106667751",
 "企业（行业）联盟联络服务中心": "00042",
 "体育部": "00016",
 "侨乡文化研究中心": "00017",
 "党政办公室": "00029",
 "全校公选": "00025",
 "其它开课部门": "00001",
 "军事教研室": "00020",
 "创新创业学院": "00028",
 "医务所": "00023",
 "后勤处": "00033",
 "团委": "00046",
 "图书馆": "00022",
 "土木建筑学院": "00011",
 "基建工程管理中心": "00034",
 "外事处、港澳台办、国际文化交流中心": "00047",
 "外国语学院": "00005",
 "学报编辑部": "107849543",
 "学生工作部（学生处）": "00052",
 "学生综合服务中心": "00053",
 "学科与科技（社科）发展中心": "00040",
 "实验室与设备管理处": "00045",
 "审计处": "00044",
 "宣传部": "00051",
 "就业指导中心": "00021",
 "工会": "00032",
 "师资处": "105230932",
 "应用物理与材料学院": "00007",
 "心理教育服务中心": "00019",
 "招投标服务中心": "00055",
 "招生办": "105231048",
 "政法学院": "00003",
 "教务处": "00038",
 "教师教学发展中心": "00037",
 "教育教学评估中心": "00039",
 "数学与计算科学学院": "00006",
 "文化交流中心": "00049",
 "文学院": "00004",
 "智能制造学部": "105230934",
 "柔性传感材料与器件应用研究中心": "106328701",
 "武装部、校园安全保卫处": "00050",
 "现代教育技术中心": "00024",
 "生物科技与大健康学院": "00012",
 "研究生学院": "00054",
 "离退老干处": "00041",
 "纪委办，监察处": "00036",
 "纺织材料与工程学院": "00013",
 "组织部、统战部、党校办公室": "00057",
 "经济管理学院": "00002",
 "继续教育学院": "00035",
 "综合信息管理中心": "00056",
 "网络管理中心": "00048",
 "美育教育中心": "107412358",
 "艺术设计学院": "00014",
 "财务处": "00027",
 "轨道交通学院": "00018",
 "通识教育学院": "105230931",
 "马克思主义学院": "00015",
 "高层次人才引进办公室": "00030",
 "高教研究所、学报编辑部": "00031"
}

const allRooms = {
  '南主楼': {
    id: '00001',
    value: '201,202,212,213,218,233,239,240,249,250,230,302,306,316,320,328,351,352,353,355,356,361,362,363,364,366,369,370,371,372,401,402,405,406,413,417,418,421,422,423,427,428,429,430,439,441,442,444,445,450,451,453/455,453,454,456,457,458,463,465,467,470,472,473,474,475,476,501,505,509,517,524,525,529,533,534,535,543,545,549,555,556,559,568,575'
  },

  '马兰芳教学楼': {
    id: '00018',
    value: '101,102,103,104,201,202,203,204,301,302,303,304,401,402,403,404,501,502,503,504'
  },


  '黄浩川教学楼': {
    id: '00019',
    value: '101,102,103,104,201,202,203,204,301,302,303,304,401,402,403,404,501,502,503,504'
  },

  '北主楼': {
    id: '00024',
    value: '201,202,203,204,205,301,302,303,304,305,401,402,403,404,405,501,502,503,504,505,601,602,603,604,605,701,702,703,704,705,801,802,803,804,805,901,902,903,904,905,1001,1002,1003,1004,1005,1101,1102,1103,1104,1105'
  }
}

/**
 * 从教务系统获取全校课表
 * @param {string} date 需要查询的日期，格式为yyyy-mm-dd；为空则不限制日期
 * @param {string} teacherName 需要查询的老师姓名，为空则全校查询
 * @param {string} collegeId 需要查询的院校代码
 */
async function getAllLessonsFromSchool(date, teacherName = '', collegeId = '') {
  const { year, term } = lessonApi.getTerm()
  const ret = await request.post(
    `https://jxgl.wyu.edu.cn/xsgrkbcx!getQxkbDataList.action`,
    {
      xnxqdm: `${year}0${term}`,
      xqdm: '',
      zc: '',
      xq: '',
      kcdm: '',
      kkyxdm: collegeId,
      kkjysdm: '',
      jcdm: '',
      gnqdm: '',
      rq: date,
      jzwdm: '',
      kcrwdm: '',
      teaxm: teacherName,
      jhlxdm: '',
      'queryParams[primarySort]': 'dgksdm asc',
      page: 1,
      rows: 1000,
      sort: 'kxh',
      order: 'asc',
    }
  )

  const keyMap = {
    kcrwdm: '课程任务代码',
    kcmc: '课程名称',
    teaxms: '教师姓名',
    jxbmc: ['上课班级', str => str.split(',')],
    sknrjj: ['上课内容', str => tools.decodeHTML(str)],
    // zc: '上课周次',
    /** 只有每周课表是jcdm2 */
    jcdm: ['节次', str => {
      str = str.trim()
      if (str.length < 4)
        return null;

      let arr = [0, 0]
      arr[0] = Number(str.slice(0, 2))
      arr[1] = Number(str.slice(str.length - 2, str.length))
      return arr;``
    }],
    // xq: '星期',
    jxcdmc: '教学地点',
    pkrs: ['排课人数', ret => Number(ret)],
    pkrq: '上课日期'
  }

  const { total, rows } = ret.data
  let formattedRows = tools.keyMapConvert(rows, keyMap)

  // 所有可以查询的教学楼
  const buildings = Object.keys(allRooms).join('')

  // 过滤
  formattedRows = formattedRows.filter(e => {
    const 上课地点 = e['教学地点'].replace(/\w/g, "")
    if (!buildings.includes(上课地点))
      return false;

    let 上课教室编号 = /\d+/.exec(e['教学地点'])
    上课教室编号 = 上课教室编号 ? 上课教室编号[0]: ''

    if (allRooms[上课地点].value.indexOf(上课教室编号) === -1) {
      return false
    }

    const dayDate = new Date(e['上课日期'])
    let _time = lessonApi.convertIndexToTime(Number(e['节次'][0]), false)[1]
    const startTime = new Date(dayDate.getTime())
    const endTime = new Date(dayDate.getTime())
    startTime.setHours(_time.getHours())
    startTime.setMinutes(_time.getMinutes())
    _time = lessonApi.convertIndexToTime(Number(e['节次'][1]), true)[1]
    endTime.setHours(_time.getHours())
    endTime.setMinutes(_time.getMinutes())

    Object.assign(e, {
      教学地点: 上课地点,
      编号: 上课教室编号,
      上课时间: startTime,
      下课时间: endTime
    })

    return true
  })
  // formattedRows = formattedRows.filter(e => buildings.indexOf(e['教学地点'].substr(0, 3)) !== -1)
  formattedRows.sort((a, b) => a['上课时间'] - b['上课时间'])
  return Promise.resolve(formattedRows)
}

/**
 * 获取某日的全校课表
 * @param {string} date 需要查询的日期，格式为yyyy-mm-dd
 * @param {boolean} [forceFromSchool = false] 是否强制从学校获取数据 
 */
async function getAllLessons(date, forceFromSchool = false) {
  // 检查数据库
  date = date || new Date().format('YYYY-mm-dd')
  log.info('调用getAllLessons')
  if (!forceFromSchool) {
    try {
      const ret = await database.getSchoolLesson(date)
      return Promise.resolve(ret);
    } catch {
      log.warn('数据库中不存在全日课表')
    }
  }

  /** 如果数据库没有，则从教务系统获取 */
  log.info('从教务系统获取全校课程')
  const lessons = await getAllLessonsFromSchool(date)
  log.info('上传当日全校课程到数据库')
  database.updateSchoolLesson(lessons, date)
  return Promise.resolve({
    lessons,
    date,
    time: new Date()
  })
}

export default {
  allRooms,
  collegeId,
  getAllLessons,
  getAllLessonsFromSchool
}