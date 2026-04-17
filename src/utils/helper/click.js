export const clickPercent = (elem) => {
  const rect = elem.currentTarget.getBoundingClientRect();
  const elementWidth = rect.width;
  const clickX = elem.clientX - rect.left;

  return (clickX / elementWidth) * 100;
};
