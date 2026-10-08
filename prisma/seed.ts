import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { brand } from "../src/lib/brand";
import { stringifyJson } from "../src/lib/json";
import { DEFAULT_TEMPLATES } from "../src/lib/outreach/templates";
import { emptyResume, resumeToText, type ResumeContent } from "../src/lib/resume/types";
import { scoreFit } from "../src/lib/scoring/fit";
import { scoreResume } from "../src/lib/scoring/resume-score";
import { extractKeywords } from "../src/lib/scoring/ats";
import { weekKey } from "../src/lib/utils";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: brand.demoEmail } });
  if (existing) {
    console.log("Demo user already present.");
    return;
  }

  const passwordHash = await bcrypt.hash(brand.demoPassword, 10);
  const user = await prisma.user.create({
    data: {
      email: brand.demoEmail,
      passwordHash,
      name: "Sudeep",
      headline: "Director, cloud platform and DevOps",
      location: "Bengaluru · open to US remote",
      yearsExperience: 16,
      currentTitle: "Director, Cloud Platform & DevOps",
      seniority: "Director",
      targetCompensation: "₹90L–₹1.4Cr in India, or $230k–$300k US remote",
      timezone: "Asia/Kolkata",
      templates: { create: DEFAULT_TEMPLATES },
    },
  });

  const niche = await prisma.niche.create({
    data: {
      userId: user.id,
      name: "Platform leadership",
      title: "Director of Platform Engineering",
      aliases: stringifyJson(["Head of Platform", "Director, Cloud Infrastructure", "Head of SRE"]),
      industries: stringifyJson(["Fintech", "B2B SaaS"]),
      seniority: "Director",
      roleCategory: "Engineering leadership",
      functionName: "Platform",
      companyTypes: stringifyJson(["Product companies past Series C"]),
      locations: stringifyJson(["Bengaluru", "Remote India", "US remote"]),
      workModes: stringifyJson(["hybrid", "remote"]),
      targetCompanies: stringifyJson(["Razorpay", "Freshworks", "Atlassian", "Groww", "Cloudflare"]),
      includeKeywords: stringifyJson(["kubernetes", "terraform", "finops", "reliability", "platform"]),
      excludeKeywords: stringifyJson(["helpdesk", "it support"]),
      why: "The work is already director-shaped: a paved path, a bill with an owner, and an on-call a new hire can join. DevOps Manager titles would down-level it.",
      payBenchmark: "India ₹80L–₹1.4Cr. US remote director bands $220k–$310k where the cloud bill is large.",
      isPrimary: true,
    },
  });

  const skills = [
    ["Kubernetes", "technical", ["EKS", "GKE"]],
    ["Terraform", "tool", ["Pulumi"]],
    ["AWS", "technical", ["GCP"]],
    ["FinOps", "technical", ["unit cost"]],
    ["Observability", "technical", ["Prometheus", "Grafana"]],
    ["CI/CD", "tool", ["GitHub Actions", "GitOps"]],
    ["Incident command", "soft", ["error budgets"]],
    ["Executive communication", "soft", ["finance reviews"]],
    ["Org design", "soft", ["platform teams"]],
    ["IAM", "technical", ["SOC2"]],
  ] as const;
  await prisma.skill.createMany({
    data: skills.map(([name, category, variants]) => ({
      userId: user.id,
      name,
      category,
      level: 4,
      variants: stringifyJson([...variants]),
      source: "profile",
    })),
  });

  const content: ResumeContent = {
    ...emptyResume(),
    name: "Sudeep",
    headline: "Director, Cloud Platform & DevOps",
    location: "Bengaluru · US remote",
    email: brand.demoEmail,
    phone: "+91 98450 11020",
    summary:
      "Platform director for product companies that have outgrown a ticket queue. I have run the path teams use to ship, the on-call that survives a holiday, and a cloud bill finance can explain. Sixteen years, India and US hours.",
    skills: [{ group: "Platform", items: ["Kubernetes", "Terraform", "AWS", "FinOps", "CI/CD", "Observability", "IAM", "SRE", "GitOps"] }],
    experience: [
      {
        company: "Northwind Cloud",
        title: "Director, Platform",
        location: "Bengaluru",
        start: "2021",
        end: "2026",
        bullets: [
          "Led a golden path that cut new-service lead time from 3 weeks to 2 days across 40 squads.",
          "Cut cloud run-rate 28% in two quarters by assigning unit-cost owners.",
          "Built an on-call rotation that held through a holiday week without a hero page.",
        ],
      },
      {
        company: "Harborline Payments",
        title: "Head of DevOps",
        location: "Bengaluru",
        start: "2016",
        end: "2021",
        bullets: [
          "Migrated 40 services to Kubernetes on AWS without a feature freeze.",
          "Established error budgets product directors used in the weekly review.",
          "Hired two managers and a staff engineer and handed them real scope.",
        ],
      },
    ],
    education: [{ school: "Visvesvaraya Technological University", credential: "B.E. Computer Science", year: "2009" }],
    certifications: ["AWS Solutions Architect"],
  };
  const scored = scoreResume(content);
  const resume = await prisma.resume.create({
    data: {
      userId: user.id,
      title: "Director resume",
      template: "executive",
      isPrimary: true,
      content: stringifyJson(content),
      rawText: resumeToText(content),
      score: scored.score,
      scoreDetail: stringifyJson(scored),
    },
  });

  const postings = [
    {
      title: "Director, Platform Engineering",
      company: "Razorpay",
      location: "Bengaluru, India",
      workMode: "hybrid",
      experience: "14+ years",
      salary: "₹90L–₹1.4Cr",
      status: "INTERVIEWING",
      description:
        "Director, Platform Engineering. Turn a central DevOps queue into a product. Kubernetes on AWS, Terraform, CI/CD, developer experience, FinOps, and reliability in the staff review. Partner with security on IAM. Hybrid Bengaluru. Leadership, not a ticket desk.",
    },
    {
      title: "Head of SRE",
      company: "Freshworks",
      location: "Chennai / Bengaluru",
      workMode: "hybrid",
      experience: "12+ years",
      salary: "₹70L–₹1.1Cr",
      status: "SCREENING",
      description:
        "Head of SRE. Error budgets, incident command, Prometheus, Grafana, and an on-call model. AWS and Kubernetes. Present reliability to product directors. Not a NOC seat.",
    },
    {
      title: "Head of DevOps",
      company: "Atlassian",
      location: "Remote, India",
      workMode: "remote",
      experience: "12+ years",
      salary: "₹80L–₹1.2Cr",
      status: "APPLIED",
      appliedDaysAgo: 12,
      description:
        "Head of DevOps, remote India. CI/CD, GitHub Actions, GitOps, Kubernetes, and FinOps with a US platform group. The cloud bill needs an owner.",
    },
    {
      title: "Director, Cloud Infrastructure",
      company: "Groww",
      location: "Bengaluru, India",
      workMode: "hybrid",
      experience: "13+ years",
      salary: "₹85L–₹1.3Cr",
      status: "SAVED",
      description:
        "Director, Cloud Infrastructure. AWS, Terraform, Kubernetes, cost optimization, and a migration off brittle paths. Sit with finance on FinOps and security on IAM.",
    },
    {
      title: "Director of Infrastructure",
      company: "Cloudflare",
      location: "Remote, United States",
      workMode: "remote",
      experience: "15+ years",
      salary: "$240k–$310k",
      status: "OFFER",
      description:
        "Director of Infrastructure, US remote. Linux, networking, Terraform, capacity, incident culture, and cost with finance. Platform judgment over a single cloud logo.",
    },
    {
      title: "Director of IT Support",
      company: "Northline Apps",
      location: "Austin, United States",
      workMode: "onsite",
      experience: "8+ years",
      salary: "$160k",
      status: "REJECTED",
      description: "Director of IT support and helpdesk. Laptop provisioning and the service desk. Onsite Austin. Not platform engineering.",
    },
  ];

  const nicheInput = {
    title: niche.title,
    aliases: ["Head of Platform", "Director, Cloud Infrastructure", "Head of SRE"],
    industries: ["Fintech", "B2B SaaS"],
    seniority: "Director",
    locations: ["Bengaluru", "Remote India", "US remote"],
    includeKeywords: ["kubernetes", "terraform", "finops", "reliability", "platform"],
    excludeKeywords: ["helpdesk", "it support"],
    companyTypes: ["Product companies past Series C"],
  };

  for (const posting of postings) {
    const fit = scoreFit({
      niche: nicheInput,
      job: posting,
      skills: skills.map(([name]) => name),
    });
    const job = await prisma.job.create({
      data: {
        userId: user.id,
        nicheId: niche.id,
        title: posting.title,
        company: posting.company,
        location: posting.location,
        workMode: posting.workMode,
        experience: posting.experience,
        salary: posting.salary,
        source: "sample",
        description: posting.description,
        status: posting.status,
        fitScore: fit.score,
        fitBand: fit.band,
        fitDetail: stringifyJson(fit),
        keywords: stringifyJson(extractKeywords(posting.description)),
        appliedAt: posting.appliedDaysAgo ? new Date(Date.now() - posting.appliedDaysAgo * 86400000) : posting.status === "APPLIED" ? new Date() : null,
        notes: posting.company === "Razorpay" ? "Panel is next Thursday. Ask about the ticket themes." : "",
      },
    });
    if (posting.company === "Razorpay") {
      await prisma.stageDraft.create({
        data: {
          jobId: job.id,
          kind: "thank_you",
          content: "Thank you for the conversation on the platform seat. I am still thinking about the tension between reliability work and feature pressure. I will send a one-page 90-day outline.",
        },
      });
      await prisma.coverLetter.create({
        data: {
          userId: user.id,
          jobId: job.id,
          resumeId: resume.id,
          title: "Razorpay · Director, Platform Engineering",
          template: "letterhead",
          content:
            "Dear hiring manager,\n\nI am writing for the Director, Platform Engineering role. The part I want to pressure-test is whether the platform is a product or a queue.\n\nRecent work cut new-service lead time from three weeks to two days and took 28% out of cloud run-rate without a freeze.\n\nI would like forty minutes on the ticket themes and the bill.\n\nSincerely,\nSudeep",
        },
      });
    }
  }

  const razorpay = await prisma.targetCompany.create({
    data: {
      userId: user.id,
      name: "Razorpay",
      industry: "Fintech",
      website: "https://razorpay.com",
      location: "Bengaluru",
      status: "CONVERSATION",
      notes: "Payments scale. Platform likely still takes tickets for environments.",
      problems: stringifyJson([
        { title: "Platform is still a ticket queue", detail: "Product squads likely wait on a central group for environments and access." },
        { title: "Cloud cost has no product owner", detail: "Unit cost is probably not in the operating review." },
      ]),
    },
  });
  await prisma.targetCompany.create({
    data: {
      userId: user.id,
      name: "Cloudflare",
      industry: "Infrastructure",
      location: "US remote",
      status: "WARM",
      notes: "Offer in hand. Decide on hours and base.",
      problems: stringifyJson([{ title: "Incidents depend on a few people", detail: "A global on-call that a new director can join." }]),
    },
  });

  const contact = await prisma.contact.create({
    data: {
      userId: user.id,
      companyId: razorpay.id,
      name: "Asha Raman",
      title: "Engineering Manager, Platform",
      email: "asha.raman@example.com",
      type: "POTENTIAL_REFERRER",
      notes: "Met at a Bengaluru reliability meetup. Not a close friend.",
      tags: stringifyJson(["meetup", "platform"]),
    },
  });
  await prisma.outreachMessage.create({
    data: {
      contactId: contact.id,
      step: "PITCH",
      status: "DRAFT",
      body: "Hi Asha — I am Sudeep, a director looking at a platform conversation with Razorpay. I will not ask for a call in this note. If you are close to the hiring manager, I can send a five-line brief.",
    },
  });

  await prisma.carStatement.createMany({
    data: [
      {
        userId: user.id,
        company: "Northwind Cloud",
        role: "Director, Platform",
        challenge: "Product squads waited three weeks for a new service because access, a pipeline, and an environment were tickets.",
        action: "Reset the team around one golden path and stopped taking bespoke pipeline requests.",
        result: "Lead time fell to two days for the common case, and the queue got quieter.",
        skills: stringifyJson(["platform", "kubernetes"]),
        resumeBullet: "Led a golden path that cut new-service lead time from 3 weeks to 2 days across 40 squads.",
      },
      {
        userId: user.id,
        company: "Northwind Cloud",
        role: "Director, Platform",
        challenge: "The cloud bill grew faster than revenue and had no service owner.",
        action: "Installed a monthly FinOps review with engineering owners and commitment coverage.",
        result: "Run-rate dropped 28% in two quarters without a feature freeze.",
        skills: stringifyJson(["finops", "aws"]),
        resumeBullet: "Cut cloud run-rate 28% in two quarters by assigning unit-cost owners.",
      },
    ],
  });

  await prisma.swotReport.create({
    data: {
      userId: user.id,
      strengths: stringifyJson(["Director-level scope is already in the story.", "Cost, reliability, and lead time are all concrete."]),
      weaknesses: stringifyJson(["Security depth should be explicit when a role asks for it."]),
      opportunities: stringifyJson(["Product companies are hiring platform directors to replace ticket-driven DevOps."]),
      threats: stringifyJson(["DevOps Manager titles will down-level the search."]),
      actions: stringifyJson(["Keep one primary niche.", "Score every saved role before tailoring."]),
    },
  });

  await prisma.linkedInPost.createMany({
    data: [
      {
        userId: user.id,
        theme: "Achievement",
        weekOf: weekKey(),
        content: "We stopped measuring the platform team on tickets closed.\n\nLead time for a new service was three weeks. We paved one path. It dropped to two days.",
      },
      {
        userId: user.id,
        theme: "Industry note",
        weekOf: weekKey(),
        content: "A lot of DevOps transformation postings are a reliability and cost problem with a tool list stapled on.",
      },
      {
        userId: user.id,
        theme: "Personal observation",
        weekOf: weekKey(),
        content: "Working India hours with a US team taught me to write the decision down before the other timezone wakes up.",
      },
    ],
  });

  await prisma.pitchDeck.create({
    data: {
      userId: user.id,
      companyId: razorpay.id,
      companyName: "Razorpay",
      problem: "Platform is still a ticket queue",
      slides: stringifyJson([
        { id: "s1", kicker: "For the hiring manager", title: "A platform product squads can use", body: "A short brief, not a tool tour.", bullets: ["The central team is still the bottleneck."] },
        { id: "s2", kicker: "90 days", title: "What I would do first", body: "I would not start with a migration.", bullets: ["Map the tickets that should not exist", "Ship one self-serve path", "Put cost in the staff review"] },
      ]),
    },
  });

  await prisma.reminder.createMany({
    data: [
      {
        userId: user.id,
        title: "Send Asha the five-line brief",
        body: "Only if the pitch draft still feels right.",
        dueAt: new Date(Date.now() - 3600_000),
      },
      {
        userId: user.id,
        title: "Razorpay panel prep",
        body: "One story on lead time, one on cost.",
        dueAt: new Date(Date.now() + 2 * 86400000),
      },
    ],
  });

  await prisma.chatMessage.createMany({
    data: [
      { userId: user.id, role: "user", content: "What should I do this week?", module: "assistant" },
      {
        userId: user.id,
        role: "assistant",
        content: "Sudeep, the Razorpay panel and the Cloudflare offer are the week. Rehearse the panel, then write the counter before you talk numbers. Do not open a wider search until those two move.",
        module: "assistant",
      },
    ],
  });

  console.log(`Seeded ${brand.demoEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
