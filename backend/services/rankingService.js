const complexityOrder = {
  'O(1)': 1,
  'O(log n)': 2,
  'O(n)': 3,
  'O(n log n)': 4,
  'O(n²)': 5,
  'O(n²log n)': 6,
  'O(n³)': 7,
  'O(2^n)': 8,
  'O(n!)': 9,
  'Unknown': 10,
};

class RankingService {
  /**
   * Rank participants based on:
   * 1. Test cases passed (more is better)
   * 2. Submission time (earlier is better)
   * 3. Time complexity (lower is better)
   * 4. Execution time (faster is better)
   */
  calculateRankings(submissions, roomStartTime) {
    // Sort submissions by ranking criteria
    const sorted = [...submissions].sort((a, b) => {
      // 1. More tests passed is better
      if (b.testsPassed !== a.testsPassed) {
        return b.testsPassed - a.testsPassed;
      }

      // 2. Earlier submission is better
      const timeA = new Date(a.submittedAt).getTime() - new Date(roomStartTime).getTime();
      const timeB = new Date(b.submittedAt).getTime() - new Date(roomStartTime).getTime();
      if (timeA !== timeB) {
        return timeA - timeB;
      }

      // 3. Better time complexity is better
      const complexityA = complexityOrder[a.timeComplexity] || 10;
      const complexityB = complexityOrder[b.timeComplexity] || 10;
      if (complexityA !== complexityB) {
        return complexityA - complexityB;
      }

      // 4. Faster execution time is better
      return a.execTime - b.execTime;
    });

    // Assign ranks
    return sorted.map((submission, index) => ({
      userId: submission.userId._id || submission.userId,
      userName: submission.userId.fullName || 'Unknown',
      userEmail: submission.userId.email || '',
      userPicture: submission.userId.picture || '',
      rank: index + 1,
      passed: submission.passed,
      submittedAt: submission.submittedAt,
      timeComplexity: submission.timeComplexity,
      execTime: submission.execTime,
      testsPassed: submission.testsPassed,
      testsTotal: submission.testsTotal,
      badges: [],
    }));
  }

  /**
   * Get leaderboard with user details
   */
  async getLeaderboard(rankings, users) {
    return rankings.map(ranking => {
      // If user details are already in ranking, use them
      if (ranking.userName) {
        return ranking;
      }
      
      // Otherwise, find user from users array
      const user = users.find(u => u._id.toString() === ranking.userId.toString());
      return {
        ...ranking,
        userName: user ? user.fullName : 'Unknown',
        userEmail: user ? user.email : '',
        userPicture: user ? user.picture : '',
      };
    });
  }
}

module.exports = new RankingService();
