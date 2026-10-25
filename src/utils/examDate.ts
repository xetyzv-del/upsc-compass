export function getExamCountdown(targetDate: string, now = new Date()): number | null {
  const [year, month, day] = targetDate.split('-').map(Number);
  const parsedDate = new Date(year, month - 1, day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day ||
    parsedDate.getTime() < today.getTime()
  ) {
    return null;
  }

  return Math.round((parsedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
