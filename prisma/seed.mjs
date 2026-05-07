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

  const user = await prisma.user.upsert({
    where: { email: "demo@rolevector.local" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@rolevector.local",
      passwordHash
    }
  });

  await prisma.masterCV.upsert({
    where: { userId: user.id },
    update: { content: demoMasterCv },
    create: {
      userId: user.id,
      content: demoMasterCv
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
