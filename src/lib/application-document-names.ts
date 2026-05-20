export type ApplicationDocumentNames = {
  coverLetterDocx: string;
  coverLetterPdf: string;
  cvDocx: string;
  cvPdf: string;
  folderName: string;
  zipName: string;
};

export function applicationDocumentNames({
  candidateName,
  companyName,
  positionTitle
}: {
  candidateName: string;
  companyName?: string | null;
  positionTitle?: string | null;
}): ApplicationDocumentNames {
  const company = displaySafe(companyName, "Company");
  const position = displaySafe(positionTitle, "Position");
  const candidate = displaySafe(candidateName, "Candidate");
  const folderName = `${company} - ${position}`;

  return {
    coverLetterDocx: `Cover Letter - ${company}.docx`,
    coverLetterPdf: `Cover Letter - ${company}.pdf`,
    cvDocx: `CV - ${candidate}.docx`,
    cvPdf: `CV - ${candidate}.pdf`,
    folderName,
    zipName: `${folderName} - RoleVector Documents.zip`
  };
}

function displaySafe(value: string | null | undefined, fallback: string) {
  const cleaned = (value ?? "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || fallback;
}
