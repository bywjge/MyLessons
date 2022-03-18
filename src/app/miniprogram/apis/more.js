import logger from '../utils/log'
import request from '../utils/request'
import tools from '../utils/tools'
import  * as database from '../static/js/database'

export default {
  getAllLessons
}

const log = new logger()
log.setKeyword('apis/more.js')

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
    value: '201,202,203,204,205,301,302,303,304,305,401,402,403,404,405,501,502,503,504,505,601,602,603,604,605,701,702,703,704,705,801,802,803,804,805,901,902,903,904,905,1001,1002,1003,1004,1005,1101,1102,1103,1104,1105,1205,1206'
  }
}

/**
 * 从教务系统获取全校课表
 * @param {string} date 需要查询的日期，格式为yyyy-mm-dd
 */
async function getAllLessonsFromSchool(date) {
  const ret = await request.post(
    `https://jxgl.wyu.edu.cn/xsgrkbcx!getQxkbDataList.action`,
    {
      xnxqdm: '202102',
      xqdm: '',
      zc: '',
      xq: '',
      kcdm: '',
      kkyxdm: '',
      kkjysdm: '',
      jcdm: '',
      gnqdm: '',
      rq: date,
      jzwdm: '',
      kcrwdm: '',
      teaxm: '',
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
    // pkrq: '上课日期'
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

    Object.assign(e, {
      教学地点: 上课地点,
      编号: 上课教室编号
    })

    return true
  })
  // formattedRows = formattedRows.filter(e => buildings.indexOf(e['教学地点'].substr(0, 3)) !== -1)

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