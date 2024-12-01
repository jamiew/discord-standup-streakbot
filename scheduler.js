const schedule = require("node-schedule");
const { isWeekday } = require("./utils");
const {
  broadcastMorningAnnouncement,
  broadcastSummary,
} = require("./broadcasts");

class Scheduler {
  constructor() {
    this.morningAnnouncementJob = null;
    this.midDayReminderJob = null;
    this.reconnectJob = null;
    this.midweekJob = null;
  }

  scheduleJobs(channel, config) {
    const {
      morningAnnouncementHour,
      morningAnnouncementMinute,
      midWeekSummaryHour,
      midWeekSummaryMinute,
      midWeekDayOfWeek,
      dayStartHour,
      dayStartMinute,
    } = config;

    if (!this.morningAnnouncementJob) {
      this.morningAnnouncementJob = schedule.scheduleJob(
        `00 ${morningAnnouncementMinute
          .toString()
          .padStart(2, "0")} ${morningAnnouncementHour
          .toString()
          .padStart(2, "0")} * * 1-5`,
        () => {
          broadcastMorningAnnouncement(channel, dayStartHour, dayStartMinute);
        }
      );
    }

    if (!this.midweekJob) {
      this.midweekJob = schedule.scheduleJob(
        `00 ${midWeekSummaryMinute
          .toString()
          .padStart(2, "0")} ${midWeekSummaryHour
          .toString()
          .padStart(2, "0")} * * ${midWeekDayOfWeek}`,
        () => {
          if (isWeekday(new Date())) {
            broadcastSummary(channel);
          }
        }
      );
    }
  }

  cleanup() {
    if (this.morningAnnouncementJob) {
      this.morningAnnouncementJob.cancel();
      this.morningAnnouncementJob = null;
    }
    if (this.midDayReminderJob) {
      this.midDayReminderJob.cancel();
      this.midDayReminderJob = null;
    }
    if (this.reconnectJob) {
      this.reconnectJob.cancel();
      this.reconnectJob = null;
    }
    if (this.midweekJob) {
      this.midweekJob.cancel();
      this.midweekJob = null;
    }
  }
}

module.exports = Scheduler;
