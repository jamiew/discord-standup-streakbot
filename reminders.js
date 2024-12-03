const schedule = require("node-schedule");
const { isWeekday } = require("./utils");
const {
  getUsersWhoPostedYesterday,
  getUsersWhoCouldLoseTheirStreak,
} = require("./streaks");

// Reminder message functions
const sendMorningAnnouncement = (channel, dayStartHour, dayStartMinute) => {
  console.log(`New day starting: ${new Date().toUTCString()}`);
  let announcement =
    "Let the new day begin! Post your standup to start or continue your daily streak. Check the pinned messages for a full explanation.";
  announcement += "\n\n";
  announcement += getUsersWhoPostedYesterday(dayStartHour, dayStartMinute);
  channel.send(announcement);
};

const sendReminder = (channel, dayStartHour, dayStartMinute) => {
  let announcement =
    "The day is half done! Don't forget to post an update if you haven't. A quick note about what you plan to do tomorrow is great too.";
  announcement += "\n\n";
  announcement += getUsersWhoCouldLoseTheirStreak(dayStartHour, dayStartMinute);
  channel.send(announcement);
};

// Scheduler class to manage reminder jobs
class RemindersScheduler {
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
          sendMorningAnnouncement(channel, dayStartHour, dayStartMinute);
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

module.exports = RemindersScheduler;
