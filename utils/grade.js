/**
 * Calculates grade and remarks based on a score and a grading scale.
 * @param {Number} score - The total score
 * @param {Array} scale - The grading scale array from School config
 * @returns {Object} { grade, remark }
 */
exports.calculateGrade = (score, scale) => {
    if (!scale || !Array.isArray(scale) || scale.length === 0) {
        // Fallback to default if no scale provided
        if (score >= 70) return { grade: 'A', remark: 'Excellent' };
        if (score >= 60) return { grade: 'B', remark: 'Very Good' };
        if (score >= 50) return { grade: 'C', remark: 'Good' };
        if (score >= 45) return { grade: 'D', remark: 'Pass' };
        if (score >= 40) return { grade: 'E', remark: 'Pass' };
        return { grade: 'F', remark: 'Fail' };
    }

    for (const range of scale) {
        if (score >= range.min && score <= range.max) {
            return { grade: range.grade, remark: range.remark };
        }
    }

    return { grade: 'F', remark: 'Fail' }; // Default fallthrough
};
