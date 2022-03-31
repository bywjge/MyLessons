/**
 * 计划同步任务，定时同步考试安排，成绩更新等数据
 */

import lessonApi from '../../apis/lessons'
const dayGap = 3600 * 24 * 1000 // ms


export async function doSync() {
  /**
   * 更新考试安排：3天一次
   */
  const examSyncTime = wx.getStorageSync('examSyncTime')
  if (!examSyncTime || (Date.now() - examSyncTime.getTime() > dayGap * 3)) {
    await lessonApi.getExamFromSchool()
  }

  /**
   * 成绩变动安排：3天一次
   */
  const scoresSyncTime = wx.getStorageSync('scoresSyncTime')
  if (!scoresSyncTime || (Date.now() - scoresSyncTime.getTime() > dayGap * 3)) {
    await lessonApi.getScoreFromSchool()
  }
}

// doSync()