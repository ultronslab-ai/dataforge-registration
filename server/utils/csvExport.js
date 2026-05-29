/**
 * Simple utility to convert an array of objects to a CSV string
 * @param {Array} data - Array of objects
 * @returns {String} CSV string
 */
exports.json2csv = (data) => {
  if (!data || !data.length) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row => {
    return headers.map(header => {
      let cell = row[header] === null || row[header] === undefined ? '' : row[header];
      cell = cell.toString().replace(/"/g, '""');
      if (cell.search(/("|,|\n)/g) >= 0) {
        cell = `"${cell}"`;
      }
      return cell;
    }).join(',');
  });
  return [headers.join(','), ...rows].join('\n');
};
