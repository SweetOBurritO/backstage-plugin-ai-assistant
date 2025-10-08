export const getProgressStats = (completed: number, total: number) => {
  const percentage = total === 0 ? 100 : Math.round((completed / total) * 100);
  return { total, completed, percentage };
};
