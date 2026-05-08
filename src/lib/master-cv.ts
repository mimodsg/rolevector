import type {
  MasterCV as MasterCvRecord,
  MasterCVEducation,
  MasterCVProject,
  MasterCVWorkExperience
} from "@prisma/client";
import { masterCvSchema, type MasterCv } from "@/lib/schemas/master-cv";

type MasterCvRecordWithRelations = MasterCvRecord & {
  workExperiences: MasterCVWorkExperience[];
  projects: MasterCVProject[];
  educationEntries: MasterCVEducation[];
};

export function masterCvRecordToMasterCv(
  record: MasterCvRecordWithRelations
): MasterCv {
  return masterCvSchema.parse({
    basics: {
      full_name: record.fullName,
      title: record.title,
      email: record.email,
      phone: record.phone,
      location: record.location,
      linkedin: record.linkedin,
      website: record.website
    },
    summary: record.summary,
    hard_skills: record.hardSkills,
    soft_skills: record.softSkills,
    technical_skills: {
      languages: record.technicalLanguages,
      frameworks: record.technicalFrameworks,
      cms: record.technicalCms,
      tools: record.technicalTools
    },
    work_experience: record.workExperiences.map((item) => ({
      company: item.company,
      title: item.title,
      location: item.location,
      engagement_type: item.engagementType,
      start_date: item.startDate,
      end_date: item.endDate,
      current: item.current,
      description: item.description,
      hard_skills: item.hardSkills,
      soft_skills: item.softSkills,
      programming_languages: item.programmingLanguages,
      frameworks: item.frameworks,
      cms: item.cms,
      tools: item.tools
    })),
    projects: record.projects.map((item) => ({
      title: item.title,
      description: item.description,
      client: item.client
    })),
    education: record.educationEntries.map((item) => ({
      institution: item.institution,
      degree: item.degree,
      location: item.location,
      start_date: item.startDate,
      end_date: item.endDate
    })),
    certifications: record.certifications,
    languages: record.languages,
    hidden_context: {
      additional_experience: record.hiddenAdditionalExperience,
      keywords: record.hiddenKeywords
    }
  });
}

export function masterCvToScalarData(masterCv: MasterCv) {
  return {
    fullName: masterCv.basics.full_name,
    title: masterCv.basics.title,
    email: masterCv.basics.email,
    phone: masterCv.basics.phone,
    location: masterCv.basics.location,
    linkedin: masterCv.basics.linkedin,
    website: masterCv.basics.website,
    summary: masterCv.summary,
    hardSkills: masterCv.hard_skills,
    softSkills: masterCv.soft_skills,
    technicalLanguages: masterCv.technical_skills.languages,
    technicalFrameworks: masterCv.technical_skills.frameworks,
    technicalCms: masterCv.technical_skills.cms,
    technicalTools: masterCv.technical_skills.tools,
    certifications: masterCv.certifications,
    languages: masterCv.languages,
    hiddenAdditionalExperience: masterCv.hidden_context.additional_experience,
    hiddenKeywords: masterCv.hidden_context.keywords,
  };
}

function workExperienceCreateItems(masterCv: MasterCv) {
  return masterCv.work_experience.map((item, index) => ({
    sortOrder: index,
    company: item.company,
    title: item.title,
    location: item.location,
    engagementType: item.engagement_type,
    startDate: item.start_date,
    endDate: item.end_date,
    current: item.current,
    description: item.description,
    hardSkills: item.hard_skills,
    softSkills: item.soft_skills,
    programmingLanguages: item.programming_languages,
    frameworks: item.frameworks,
    cms: item.cms,
    tools: item.tools
  }));
}

function projectCreateItems(masterCv: MasterCv) {
  return masterCv.projects.map((item, index) => ({
    sortOrder: index,
    title: item.title,
    description: item.description,
    client: item.client
  }));
}

function educationCreateItems(masterCv: MasterCv) {
  return masterCv.education.map((item, index) => ({
    sortOrder: index,
    institution: item.institution,
    degree: item.degree,
    location: item.location,
    startDate: item.start_date,
    endDate: item.end_date
  }));
}

export function masterCvToCreateData(masterCv: MasterCv) {
  return {
    ...masterCvToScalarData(masterCv),
    workExperiences: {
      create: workExperienceCreateItems(masterCv)
    },
    projects: {
      create: projectCreateItems(masterCv)
    },
    educationEntries: {
      create: educationCreateItems(masterCv)
    }
  };
}

export function masterCvToUpdateData(masterCv: MasterCv) {
  return {
    ...masterCvToScalarData(masterCv),
    workExperiences: {
      deleteMany: {},
      create: workExperienceCreateItems(masterCv)
    },
    projects: {
      deleteMany: {},
      create: projectCreateItems(masterCv)
    },
    educationEntries: {
      deleteMany: {},
      create: educationCreateItems(masterCv)
    }
  };
}
