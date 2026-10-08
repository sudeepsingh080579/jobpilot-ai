export type NicheInput = {
  id?: string;
  name: string;
  title: string;
  aliases: string;
  industries: string;
  seniority: string;
  roleCategory: string;
  functionName: string;
  companyTypes: string;
  locations: string;
  workModes: string;
  targetCompanies: string;
  includeKeywords: string;
  excludeKeywords: string;
  why: string;
  payBenchmark: string;
  isPrimary: boolean;
};

export type ResumeInput = {
  id?: string;
  title: string;
  template: string;
  isPrimary: boolean;
  content: import("@/lib/resume/types").ResumeContent;
  rawText?: string;
};
