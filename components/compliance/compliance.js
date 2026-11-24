// Reusable compliance marks. Add data-compliance-marks to any container.
document.querySelectorAll('[data-compliance-marks]').forEach(container => {
  container.classList.add('compliance-marks');
  container.setAttribute('aria-label', 'Responsible gaming and regulatory information');
  const marks = [
    ['pagcor.webp', 'PAGCOR'],
    ['npgh.webp', 'NPGH'],
    ['age21.webp', '21 and above']
  ];
  marks.forEach(([file, label]) => {
    const image = document.createElement('img');
    image.src = new URL(file, document.currentScript.src).href;
    image.alt = label;
    container.append(image);
  });
});
