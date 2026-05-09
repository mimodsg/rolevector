import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const demoMasterCv = {
  basics: {
    full_name: "Demo User",
    title: "Full Stack Developer",
    email: "demo@rolevector.local",
    phone: "+1 555 0100",
    location: "Remote",
    linkedin: "",
    website: ""
  },
  summary: "Full stack developer with experience building web applications.",
  hard_skills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
  soft_skills: ["Communication", "Collaboration", "Ownership"],
  technical_skills: {
    languages: ["TypeScript", "JavaScript"],
    frameworks: ["Next.js", "React"],
    cms: [],
    tools: ["Prisma", "PostgreSQL", "Git"]
  },
  work_experience: [
    {
      company: "Example Studio",
      title: "Software Developer",
      location: "Remote",
      engagement_type: "full-time",
      start_date: "2021-01",
      end_date: "",
      current: true,
      description: "Builds production web applications.",
      hard_skills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
      soft_skills: ["Communication", "Collaboration"],
      programming_languages: ["TypeScript", "JavaScript"],
      frameworks: ["Next.js", "React"],
      cms: [],
      tools: ["Prisma", "PostgreSQL", "Git"]
    }
  ],
  projects: [],
  education: [],
  certifications: [],
  languages: ["English"],
  hidden_context: {
    additional_experience: [],
    keywords: ["ATS", "resume optimization"]
  }
};

const demoJobDescription =
  "We are hiring a Full Stack Developer with Next.js, TypeScript, Node.js, PostgreSQL, and API development experience.";

const demoCoverLetterTemplate = `Dear [Company] Team,

I am writing to apply for the Full Stack Developer position. I am a seasoned engineer with experience building scalable web applications, with a strong focus on frontend architecture, component-driven development, and system integrations.

I have had the opportunity to contribute to a range of high-impact projects, including:

[Projects]

These experiences have strengthened my ability to deliver robust, scalable solutions while collaborating effectively across multidisciplinary teams.

Thank you for your time and consideration. I look forward to the opportunity to speak with you.

Regards,
Demo User`;

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);
  const localAdminPasswordHash = await bcrypt.hash("admin", 12);

  await prisma.user.upsert({
    where: { email: "admin@local.local" },
    update: {
      name: "Local Admin",
      passwordHash: localAdminPasswordHash,
      role: "Admin"
    },
    create: {
      name: "Local Admin",
      email: "admin@local.local",
      passwordHash: localAdminPasswordHash,
      role: "Admin"
    }
  });

  const user = await prisma.user.upsert({
    where: { email: "demo@rolevector.local" },
    update: {
      role: "Admin"
    },
    create: {
      name: "Demo User",
      email: "demo@rolevector.local",
      passwordHash,
      role: "Admin"
    }
  });

  await prisma.masterCV.upsert({
    where: { userId: user.id },
    update: {
      fullName: demoMasterCv.basics.full_name,
      title: demoMasterCv.basics.title,
      email: demoMasterCv.basics.email,
      phone: demoMasterCv.basics.phone,
      location: demoMasterCv.basics.location,
      linkedin: demoMasterCv.basics.linkedin,
      website: demoMasterCv.basics.website,
      summary: demoMasterCv.summary,
      hardSkills: demoMasterCv.hard_skills,
      softSkills: demoMasterCv.soft_skills,
      technicalLanguages: demoMasterCv.technical_skills.languages,
      technicalFrameworks: demoMasterCv.technical_skills.frameworks,
      technicalCms: demoMasterCv.technical_skills.cms,
      technicalTools: demoMasterCv.technical_skills.tools,
      certifications: demoMasterCv.certifications,
      languages: demoMasterCv.languages,
      hiddenAdditionalExperience: demoMasterCv.hidden_context.additional_experience,
      hiddenKeywords: demoMasterCv.hidden_context.keywords,
      workExperiences: {
        deleteMany: {},
        create: demoMasterCv.work_experience.map((item, index) => ({
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
        }))
      },
      projects: {
        deleteMany: {},
        create: demoMasterCv.projects.map((item, index) => ({
          sortOrder: index,
          title: item.title,
          description: item.description,
          client: item.client ?? ""
        }))
      },
      educationEntries: {
        deleteMany: {},
        create: demoMasterCv.education.map((item, index) => ({
          sortOrder: index,
          institution: item.institution,
          degree: item.degree,
          location: item.location ?? "",
          startDate: item.start_date,
          endDate: item.end_date
        }))
      }
    },
    create: {
      userId: user.id,
      fullName: demoMasterCv.basics.full_name,
      title: demoMasterCv.basics.title,
      email: demoMasterCv.basics.email,
      phone: demoMasterCv.basics.phone,
      location: demoMasterCv.basics.location,
      linkedin: demoMasterCv.basics.linkedin,
      website: demoMasterCv.basics.website,
      summary: demoMasterCv.summary,
      hardSkills: demoMasterCv.hard_skills,
      softSkills: demoMasterCv.soft_skills,
      technicalLanguages: demoMasterCv.technical_skills.languages,
      technicalFrameworks: demoMasterCv.technical_skills.frameworks,
      technicalCms: demoMasterCv.technical_skills.cms,
      technicalTools: demoMasterCv.technical_skills.tools,
      certifications: demoMasterCv.certifications,
      languages: demoMasterCv.languages,
      hiddenAdditionalExperience: demoMasterCv.hidden_context.additional_experience,
      hiddenKeywords: demoMasterCv.hidden_context.keywords,
      workExperiences: {
        create: demoMasterCv.work_experience.map((item, index) => ({
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
        }))
      },
      projects: {
        create: demoMasterCv.projects.map((item, index) => ({
          sortOrder: index,
          title: item.title,
          description: item.description,
          client: item.client ?? ""
        }))
      },
      educationEntries: {
        create: demoMasterCv.education.map((item, index) => ({
          sortOrder: index,
          institution: item.institution,
          degree: item.degree,
          location: item.location ?? "",
          startDate: item.start_date,
          endDate: item.end_date
        }))
      }
    }
  });

  await prisma.coverLetterTemplate.upsert({
    where: { userId: user.id },
    update: {
      content: demoCoverLetterTemplate
    },
    create: {
      userId: user.id,
      content: demoCoverLetterTemplate
    }
  });

  const existingApplication = await prisma.application.findFirst({
    where: { userId: user.id, companyName: "Acme Talent" }
  });

  if (!existingApplication) {
    await prisma.application.create({
      data: {
        userId: user.id,
        companyName: "Acme Talent",
        positionTitle: "Full Stack Developer",
        salary: "",
        location: "Remote",
        jobDetails: demoJobDescription,
        parsedMetadata: {
          company_name: "Acme Talent",
          position_title: "Full Stack Developer",
          salary: null,
          location: "Remote",
          seniority: "Mid",
          required_skills: ["Next.js", "TypeScript", "Node.js", "PostgreSQL"],
          preferred_skills: [],
          responsibilities: ["Build API-backed product features"],
          keywords: ["Next.js", "TypeScript", "PostgreSQL"]
        },
        optimizedCvJson: demoMasterCv,
        optimizedCvText: "",
        coverLetterText:
          "Dear hiring team,\n\nI am excited to apply for the Full Stack Developer role. My experience with Next.js, TypeScript, Node.js, and PostgreSQL aligns closely with your requirements.\n\nSincerely,\nDemo User",
        atsScore: 8.4
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
