// Only a completed, internally consistent grader result is a classification.
export function readGradeProcess(processResult) {
  const invalid = reason => ({status:'infrastructure_error', error:reason,
    stderr:processResult.stderr ?? '', processError:String(processResult.error ?? '')});
  if (processResult.error || processResult.signal || ![0,1].includes(processResult.status))
    return invalid('grader did not complete with exit 0 or 1');
  let grade;
  try { grade = JSON.parse(processResult.stdout); }
  catch (error) { return invalid(String(error)); }
  if (!grade || !['pass','fail'].includes(grade.status) || !Array.isArray(grade.results)
      || !Number.isInteger(grade.total) || grade.total < 1 || grade.total !== grade.results.length
      || grade.results.some(row => !row || typeof row.passed !== 'boolean')
      || grade.passed !== grade.results.filter(row => row.passed).length)
    return invalid('invalid grader result schema or counts');
  const allPassed = grade.passed === grade.total;
  if (grade.status !== (allPassed ? 'pass' : 'fail') || processResult.status !== (allPassed ? 0 : 1))
    return invalid('grader status and exit disagree');
  return grade;
}
