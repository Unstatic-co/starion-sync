export function isWithinOneMinuteRange(date1: Date, date2: Date): boolean {
  // Calculate the difference in milliseconds between the two dates
  const differenceInMilliseconds = date1.getTime() - date2.getTime();

  // Check if the difference is exactly 1 minute (60 seconds * 1000 milliseconds)
  return Math.abs(differenceInMilliseconds) <= 60 * 1000;
}
