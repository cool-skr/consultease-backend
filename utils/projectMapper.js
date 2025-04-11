/**
 * @param {Array} row - Row data from spreadsheet
 * @returns {Object} Formatted project object
 */
export const mapRowToProject = (row) => {
  return {
    projectId: row[0],
    email: row[1],
    industryName: row[2],
    projectDuration: row[3],
    projectTitle: row[4],
    principalInvestigator: row[5],
    coPrincipalInvestigator: row[6],
    academicYear: row[7],
    amountSanctioned: row[8],
    amountReceived: row[9],
    studentDetails: row[10],
    projectSummary: row[11],
    billSettlement: row[12],
    agreement: row[13],
    completed: row[14]
  };
};