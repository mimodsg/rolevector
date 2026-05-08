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
  core_skills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
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
      start_date: "2021-01",
      end_date: "",
      current: true,
      description: "Builds production web applications.",
      achievements: ["Delivered internal tools with React and Node.js."]
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
      coreSkills: demoMasterCv.core_skills,
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
          startDate: item.start_date,
          endDate: item.end_date,
          current: item.current,
          description: item.description,
          achievements: item.achievements
        }))
      },
      projects: {
        deleteMany: {},
        create: demoMasterCv.projects.map((item, index) => ({
          sortOrder: index,
          title: item.title,
          description: item.description,
          technologies: item.technologies
        }))
      },
      educationEntries: {
        deleteMany: {},
        create: demoMasterCv.education.map((item, index) => ({
          sortOrder: index,
          institution: item.institution,
          degree: item.degree,
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
      coreSkills: demoMasterCv.core_skills,
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
          startDate: item.start_date,
          endDate: item.end_date,
          current: item.current,
          description: item.description,
          achievements: item.achievements
        }))
      },
      projects: {
        create: demoMasterCv.projects.map((item, index) => ({
          sortOrder: index,
          title: item.title,
          description: item.description,
          technologies: item.technologies
        }))
      },
      educationEntries: {
        create: demoMasterCv.education.map((item, index) => ({
          sortOrder: index,
          institution: item.institution,
          degree: item.degree,
          startDate: item.start_date,
          endDate: item.end_date
        }))
      }
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
        location: "Remote",
        originalJobDescription: demoJobDescription,
        parsedMetadata: {
          company_name: "Acme Talent",
          position_title: "Full Stack Developer",
          location: "Remote",
          seniority: "Mid",
          required_skills: ["Next.js", "TypeScript", "Node.js", "PostgreSQL"],
          preferred_skills: [],
          responsibilities: ["Build API-backed product features"],
          keywords: ["Next.js", "TypeScript", "PostgreSQL"]
        },
        optimizedCvJson: demoMasterCv,
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
