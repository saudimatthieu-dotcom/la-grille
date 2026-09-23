export const getWeek = (date = new Date()) => {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date - start;
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
};
