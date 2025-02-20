const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const ChatSession = require('../models/ChatSession');

// Cleanup old files and chat sessions
const cleanup = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find old chat sessions
    const oldSessions = await ChatSession.find({
      lastActivity: { $lt: thirtyDaysAgo }
    });

    // Delete files and sessions
    for (const session of oldSessions) {
      if (session.activeFile?.path) {
        try {
          await fs.unlink(session.activeFile.path);
          logger.info(`Deleted old file: ${session.activeFile.path}`);
        } catch (error) {
          logger.error('Error deleting file:', error);
        }
      }
    }

    // Delete old sessions from database
    const result = await ChatSession.deleteMany({
      lastActivity: { $lt: thirtyDaysAgo }
    });

    logger.info(`Cleanup completed: Removed ${result.deletedCount} old chat sessions`);
  } catch (error) {
    logger.error('Cleanup error:', error);
  }
};

// Run cleanup every day
const startCleanupSchedule = () => {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(cleanup, TWENTY_FOUR_HOURS);
  logger.info('Cleanup schedule started');
};

module.exports = {
  cleanup,
  startCleanupSchedule
}; 