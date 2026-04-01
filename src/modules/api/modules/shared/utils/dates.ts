export const extractDay = (date: string | [string, string] | null): number[] => {
  const typeofDate = typeof date;
  const days: number[] = [];
  if (!date) {
    const defaultDay = new Date();
    days.push(defaultDay.getDate());
  }

  if (Array.isArray(date)) {
    const days = date.map((d) => {
      const parseDate = new Date(d.toString());
      return parseDate.getDate();
    });
    return days;
  }

  if (['string', 'object'].includes(typeofDate) && date) {
    const parseDate = new Date(date.toString());
    const day = parseDate.getDate();
    days.push(day);
  }
  return days;
};
