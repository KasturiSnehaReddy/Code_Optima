const User = require('../models/userModel');

class BadgeService {
  /**
   * Award badges based on room performance
   * Badges: first-solver, best-complexity, zero-wrong-attempts, top-3
   */
  async awardBadges(room, rankings, submissions) {
    const badgeUpdates = [];

    // Find first solver (first to pass all tests)
    const firstSolver = rankings.find(r => r.passed);
    if (firstSolver) {
      firstSolver.badges.push('first-solver');
      badgeUpdates.push({
        userId: firstSolver.userId,
        badge: 'first-solver',
        credits: 50,
      });
    }

    // Find best complexity
    const complexityOrder = {
      'O(1)': 1,
      'O(log n)': 2,
      'O(n)': 3,
      'O(n log n)': 4,
      'O(n²)': 5,
      'O(n²log n)': 6,
      'O(n³)': 7,
    };

    let bestComplexity = null;
    let bestComplexityUser = null;

    rankings.forEach(ranking => {
      if (ranking.passed) {
        const order = complexityOrder[ranking.timeComplexity];
        if (order && (!bestComplexity || order < bestComplexity)) {
          bestComplexity = order;
          bestComplexityUser = ranking;
        }
      }
    });

    if (bestComplexityUser && bestComplexityUser.userId.toString() !== firstSolver?.userId.toString()) {
      bestComplexityUser.badges.push('best-complexity');
      badgeUpdates.push({
        userId: bestComplexityUser.userId,
        badge: 'best-complexity',
        credits: 40,
      });
    }

    // Zero wrong attempts (only one submission and it passed)
    for (const ranking of rankings) {
      if (ranking.passed) {
        const userSubmissions = submissions.filter(
          s => s.userId.toString() === ranking.userId.toString()
        );
        if (userSubmissions.length === 1) {
          ranking.badges.push('zero-wrong-attempts');
          badgeUpdates.push({
            userId: ranking.userId,
            badge: 'zero-wrong-attempts',
            credits: 30,
          });
        }
      }
    }

    // Top 3 participants
    for (let i = 0; i < Math.min(3, rankings.length); i++) {
      if (rankings[i].passed && !rankings[i].badges.includes('top-3')) {
        rankings[i].badges.push('top-3');
        const credits = i === 0 ? 100 : i === 1 ? 60 : 40;
        badgeUpdates.push({
          userId: rankings[i].userId,
          badge: 'top-3',
          credits,
        });
      }
    }

    // Update user badges and credits
    for (const update of badgeUpdates) {
      try {
        await User.findByIdAndUpdate(
          update.userId,
          {
            $addToSet: { badges: update.badge },
            $inc: { credits: update.credits },
          }
        );
      } catch (error) {
        console.error('Error updating user badges:', error);
      }
    }

    return rankings;
  }

  /**
   * Get badge display information
   */
  getBadgeInfo(badgeName) {
    const badges = {
      'first-solver': {
        name: 'First Solver',
        description: 'First to solve the problem',
        icon: '🥇',
        credits: 50,
      },
      'best-complexity': {
        name: 'Best Complexity',
        description: 'Most optimal time complexity',
        icon: '⚡',
        credits: 40,
      },
      'zero-wrong-attempts': {
        name: 'Perfect Score',
        description: 'Solved on first attempt',
        icon: '🎯',
        credits: 30,
      },
      'top-3': {
        name: 'Top 3',
        description: 'Finished in top 3',
        icon: '🏆',
        credits: 100,
      },
    };

    return badges[badgeName] || { name: badgeName, icon: '🎖️', credits: 0 };
  }
}

module.exports = new BadgeService();
