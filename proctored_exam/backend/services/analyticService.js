const Attempt = require('../models/attempt');
const Certification = require('../models/certification');
const mongoose = require('mongoose');

/**
 * Get certification pass rates
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Array of certification pass rates
 */
exports.getCertificationPassRates = async (days = 30) => {
  try {
    // Get attempts from the last X days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get all certifications
    const certifications = await Certification.find({ active: true });
    
    // Get attempt data for each certification
    const passRatesPromises = certifications.map(async (cert) => {
      const attempts = await Attempt.find({
        certificationId: cert._id,
        completed: true,
        endTime: { $gte: startDate }
      });
      
      const totalAttempts = attempts.length;
      const passCount = attempts.filter(a => a.passed).length;
      const passRate = totalAttempts > 0 ? (passCount / totalAttempts) * 100 : 0;
      
      return {
        _id: cert._id,
        name: cert.name,
        passRate,
        totalAttempts,
        passCount
      };
    });
    
    const passRates = await Promise.all(passRatesPromises);
    
    // Sort by highest pass rate
    return passRates.sort((a, b) => b.passRate - a.passRate);
  } catch (error) {
    console.error('Error getting certification pass rates:', error);
    throw error;
  }
};

/**
 * Get attempt analytics by time period
 * @param {string} period - 'day', 'week', or 'month'
 * @param {number} limit - Number of periods to return
 * @returns {Promise<Array>} Array of attempt counts by period
 */
exports.getAttemptsByTimePeriod = async (period = 'day', limit = 30) => {
  try {
    let groupBy;
    let dateFormat;
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        groupBy = { 
          year: { $year: '$endTime' }, 
          month: { $month: '$endTime' }, 
          day: { $dayOfMonth: '$endTime' } 
        };
        dateFormat = '%Y-%m-%d';
        startDate.setDate(startDate.getDate() - limit);
        break;
      case 'week':
        groupBy = { 
          year: { $year: '$endTime' }, 
          week: { $week: '$endTime' } 
        };
        dateFormat = '%Y-W%U';
        startDate.setDate(startDate.getDate() - (limit * 7));
        break;
      case 'month':
        groupBy = { 
          year: { $year: '$endTime' }, 
          month: { $month: '$endTime' } 
        };
        dateFormat = '%Y-%m';
        startDate.setMonth(startDate.getMonth() - limit);
        break;
      default:
        groupBy = { 
          year: { $year: '$endTime' }, 
          month: { $month: '$endTime' }, 
          day: { $dayOfMonth: '$endTime' } 
        };
        dateFormat = '%Y-%m-%d';
        startDate.setDate(startDate.getDate() - limit);
    }
    
    const results = await Attempt.aggregate([
      {
        $match: {
          completed: true,
          endTime: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: groupBy,
          count: { $sum: 1 },
          passCount: {
            $sum: {
              $cond: [{ $eq: ['$passed', true] }, 1, 0]
            }
          },
          totalScore: { $sum: '$score.overall' }
        }
      },
      {
        $project: {
          _id: 0,
          period: {
            $dateToString: {
              format: dateFormat,
              date: {
                $dateFromParts: {
                  'year': '$_id.year',
                  'month': { $ifNull: ['$_id.month', 1] },
                  'day': { $ifNull: ['$_id.day', 1] }
                }
              }
            }
          },
          count: 1,
          passCount: 1,
          passRate: {
            $multiply: [
              { $divide: ['$passCount', { $max: ['$count', 1] }] },
              100
            ]
          },
          avgScore: {
            $divide: ['$totalScore', { $max: ['$count', 1] }]
          }
        }
      },
      {
        $sort: { period: 1 }
      }
    ]);
    
    return results;
  } catch (error) {
    console.error('Error getting attempts by time period:', error);
    throw error;
  }
};

/**
 * Get exam performance analytics
 * @returns {Promise<Array>} Array of exam performance data
 */
exports.getExamPerformance = async () => {
  try {
    const results = await Attempt.aggregate([
      {
        $match: { completed: true }
      },
      {
        $group: {
          _id: '$examId',
          totalAttempts: { $sum: 1 },
          passCount: {
            $sum: {
              $cond: [{ $eq: ['$passed', true] }, 1, 0]
            }
          },
          avgScore: { $avg: '$score.overall' },
          avgDuration: { $avg: { $subtract: ['$endTime', '$startTime'] } }
        }
      },
      {
        $lookup: {
          from: 'exams',
          localField: '_id',
          foreignField: '_id',
          as: 'examDetails'
        }
      },
      {
        $unwind: '$examDetails'
      },
      {
        $project: {
          _id: 1,
          examName: '$examDetails.name',
          totalAttempts: 1,
          passCount: 1,
          passRate: {
            $multiply: [
              { $divide: ['$passCount', { $max: ['$totalAttempts', 1] }] },
              100
            ]
          },
          avgScore: 1,
          // Convert duration from milliseconds to minutes
          avgDurationMinutes: { $divide: [{ $divide: ['$avgDuration', 1000] }, 60] }
        }
      },
      {
        $sort: { passRate: -1 }
      }
    ]);
    
    return results;
  } catch (error) {
    console.error('Error getting exam performance:', error);
    throw error;
  }
};