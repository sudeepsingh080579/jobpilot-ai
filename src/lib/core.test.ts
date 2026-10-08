import { afterEach, describe, expect, it } from "vitest";
import { AI_TASKS } from "@/lib/ai/types";
import { aiMode, completeJson } from "@/lib/ai";
import { mockAi } from "@/lib/ai/mock";
import { routeIntent } from "@/lib/assistant/route";
import { extensions, OUTREACH_STATUSES } from "@/lib/extensions";
import { nextOutreachStep } from "@/lib/domain";
import { QUESTION_BANK } from "@/lib/interview/bank";
import { searchCatalog } from "@/lib/jobs/catalog";
import { fillTemplate } from "@/lib/outreach/templates";
import { htmlToText, parseResumeText } from "@/lib/resume/parse";
import { matchKeywords } from "@/lib/scoring/ats";
import { scoreFit } from "@/lib/scoring/fit";
import { analyzeAnswer } from "@/lib/scoring/interview";
import { scoreNegotiation } from "@/lib/scoring/negotiation";
import { scoreResume } from "@/lib/scoring/resume-score";
import { journeyState } from "@/lib/journey";
import { buildWeeklyPlan } from "@/lib/scoring/weekly";
import type { ResumeContent } from "@/lib/resume/types";

const baseNiche = {
  title: "Director of Platform Engineering",
  aliases: ["Head of Platform"],
  industries: ["fintech", "saas"],
  seniority: "Director",
  locations: ["Bengaluru", "Remote"],
  includeKeywords: ["kubernetes", "terraform", "finops"],
  excludeKeywords: ["helpdesk"],
  companyTypes: ["product"],
};

const strongJob = {
  title: "Director, Platform Engineering",
  company: "Razorpay",
  location: "Bengaluru",
  description:
    "Director role for a fintech SaaS platform on kubernetes and terraform. FinOps, reliability, and developer experience. Remote-friendly hybrid in Bengaluru.",
};

function strongResume(): ResumeContent {
  return {
    name: "Sudeep",
    headline: "Director, Cloud Platform and DevOps",
    location: "Bengaluru",
    email: "demo@jobpilot.local",
    phone: "+91 98450 10001",
    links: [],
    summary:
      "Platform director who replaces ticket queues with a paved path, puts unit cost in the operating review, and runs an on-call a new hire can join.",
    skills: [{ group: "Platform", items: ["Kubernetes", "Terraform", "AWS", "FinOps", "CI/CD", "Observability", "IAM", "SRE"] }],
    experience: [
      {
        company: "Northwind Cloud",
        title: "Director, Platform",
        location: "Bengaluru",
        start: "2021",
        end: "2026",
        bullets: [
          "Led a golden path that cut new-service lead time from 3 weeks to 2 days.",
          "Cut cloud run-rate 28% by assigning unit cost owners.",
          "Built an on-call rotation that held through a holiday week.",
        ],
      },
      {
        company: "Harborline",
        title: "Head of DevOps",
        location: "Bengaluru",
        start: "2017",
        end: "2021",
        bullets: [
          "Migrated 40 services to Kubernetes without a feature freeze.",
          "Established error budgets the product directors actually used.",
          "Hired two managers and a staff engineer.",
        ],
      },
    ],
    education: [{ school: "A university", credential: "B.Tech", year: "2008" }],
    certifications: ["AWS"],
  };
}

describe("AI mock", () => {
  const previous = process.env.LLM_API_KEY;
  const previousMock = process.env.LLM_MOCK;
  afterEach(() => {
    process.env.LLM_API_KEY = previous;
    process.env.LLM_MOCK = previousMock;
  });

  it("stays in mock mode when no key is set", () => {
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_MOCK;
    expect(aiMode()).toBe("mock");
  });

  it("uses live mode only when a key is set", () => {
    process.env.LLM_API_KEY = "sk-test";
    delete process.env.LLM_MOCK;
    expect(aiMode()).toBe("live");
    process.env.LLM_MOCK = "1";
    expect(aiMode()).toBe("mock");
  });

  it("returns a structured object for every task", async () => {
    delete process.env.LLM_API_KEY;
    for (const task of AI_TASKS) {
      const direct = mockAi(task, { name: "Sudeep", title: "Director", company: "Razorpay", message: "Plan my week" });
      expect(direct && typeof direct === "object").toBe(true);
      const result = await completeJson(task, { name: "Sudeep", kind: "follow_up", message: "What next?" });
      expect(result.mode).toBe("mock");
      expect(result.task).toBe(task);
      expect(result.data).toBeTruthy();
    }
  });
});

describe("fit, resume, and ATS", () => {
  it("scores a close role higher than an excluded one", () => {
    const strong = scoreFit({ niche: baseNiche, job: strongJob, skills: ["kubernetes", "terraform", "finops"] });
    const weak = scoreFit({
      niche: baseNiche,
      job: {
        title: "Director of IT Support",
        company: "Northline",
        location: "Austin",
        description: "Helpdesk leadership and laptop provisioning. Not a platform role.",
      },
      skills: ["kubernetes"],
    });
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(strong.band === "Strong" || strong.band === "Partial").toBe(true);
    expect(weak.band).toBe("Weak");
    expect(weak.excluded).toContain("helpdesk");
  });

  it("bands resume scores the way the checker describes", () => {
    const good = scoreResume(strongResume());
    expect(good.score).toBeGreaterThanOrEqual(75);
    expect(good.band).toBe("green");
    const poor = scoreResume({ ...strongResume(), name: "", email: "", summary: "Hi", experience: [], skills: [], education: [], certifications: [] });
    expect(poor.score).toBeLessThan(50);
    expect(poor.band).toBe("red");
  });

  it("matches and misses JD keywords", () => {
    const result = matchKeywords("Kubernetes and Terraform on AWS", "We need Kubernetes, Terraform, FinOps, and Grafana");
    expect(result.matched).toEqual(expect.arrayContaining(["kubernetes", "terraform"]));
    expect(result.missed).toEqual(expect.arrayContaining(["finops", "grafana"]));
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
  });
});

describe("plans, routing, interviews, outreach", () => {
  it("puts an empty desk on resume first", () => {
    const plan = buildWeeklyPlan({
      saved: 0,
      applied: 0,
      screening: 0,
      interviewing: 0,
      offers: 0,
      staleFollowups: 0,
      outreachDue: 0,
      resumeScore: null,
      hasPrimaryResume: false,
      postsThisWeek: 0,
    });
    expect(plan[0]?.id).toBe("resume");
    expect(plan.find((item) => item.id === "offer")).toBeUndefined();
  });

  it("prioritises an offer and a live interview", () => {
    const plan = buildWeeklyPlan({
      saved: 4,
      applied: 2,
      screening: 1,
      interviewing: 1,
      offers: 1,
      staleFollowups: 2,
      outreachDue: 1,
      resumeScore: 82,
      hasPrimaryResume: true,
      postsThisWeek: 3,
    });
    expect(plan.map((item) => item.id)).toEqual(expect.arrayContaining(["offer", "mock", "follow", "outreach"]));
  });

  it("routes job-context requests", () => {
    expect(routeIntent("Write a cover letter for this role").module).toBe("letters");
    expect(routeIntent("Run an ATS check").module).toBe("resumes");
    expect(routeIntent("Tailor my resume").module).toBe("resumes");
    expect(routeIntent("Tell me why I am a right fit").module).toBe("strategy");
    expect(routeIntent("Practice interview questions").module).toBe("interview");
    expect(routeIntent("What should I do this week?").href).toBe("/dashboard");
  });

  it("counts fillers and pace", () => {
    const analysis = analyzeAnswer("Um, I basically led the migration and cut cost by 28 percent. You know, it was hard.", 30, ["cost", "migration"]);
    expect(analysis.fillerCount).toBeGreaterThan(0);
    expect(analysis.hits).toEqual(expect.arrayContaining(["cost", "migration"]));
    expect(analysis.wpm).toBeGreaterThan(0);
    expect(analysis.content).toBeGreaterThan(0);
  });

  it("scores a negotiation that names a number and a trade", () => {
    const report = scoreNegotiation(
      [
        { role: "recruiter", text: "The offer is firm." },
        { role: "you", text: "I am targeting 280k base. If base cannot move, a sign-on and a six-month review would help. Can we write that into the letter?" },
      ],
      "$280k",
    );
    expect(report.overall).toBeGreaterThan(5);
    expect(report.tradeoffs.length).toBeGreaterThan(0);
  });

  it("filters the sample market", () => {
    const remote = searchCatalog({ workMode: "remote", title: "director" });
    expect(remote.every((job) => job.workMode === "remote")).toBe(true);
    expect(remote.length).toBeGreaterThan(0);
    const senior = searchCatalog({ experience: "16", location: "Bengaluru" });
    expect(senior.every((job) => job.minYears >= 16)).toBe(true);
  });

  it("walks the four-step outreach sequence and only drafts", () => {
    expect(nextOutreachStep(null)).toBe("PITCH");
    expect(nextOutreachStep("PITCH")).toBe("FOLLOW_UP_1");
    expect(nextOutreachStep("FOLLOW_UP_2")).toBe("FINAL");
    expect(nextOutreachStep("FINAL")).toBeNull();
    expect(OUTREACH_STATUSES).toEqual(["DRAFT", "COPIED"]);
    expect(extensions.linkedinSend.enabled).toBe(false);
    expect(extensions.payments.enabled).toBe(false);
    expect(fillTemplate("Hi {{firstName}} at {{company}}", { firstName: "Asha", company: "Razorpay" })).toBe("Hi Asha at Razorpay");
  });

  it("parses pasted resume text and strips html", () => {
    const text = htmlToText("<style>x</style><p>Director</p> &amp; platform");
    expect(text).toContain("Director");
    expect(text).not.toContain("<p>");
    const parsed = parseResumeText(`Sudeep\nsudeep@example.com\n+91 9845010001\nSummary\nPlatform director with a long record of paved paths and cost ownership across product teams.\nExperience\nDirector, Platform — Northwind Cloud\n- Led the golden path\nSkills\nKubernetes, Terraform, AWS, FinOps\nEducation\nB.Tech, 2008`);
    expect(parsed.email).toBe("sudeep@example.com");
    expect(parsed.skills[0]?.items).toContain("Kubernetes");
    expect(parsed.experience.length).toBeGreaterThan(0);
  });

  it("opens the first unfinished journey step and does not skip ahead", () => {
    const early = journeyState({
      resumeReady: false,
      nicheReady: false,
      tailored: false,
      referralReady: false,
      pitchReady: false,
      negotiateReady: false,
    });
    expect(early.next?.id).toBe("resume");
    expect(early.completed).toBe(0);

    const mid = journeyState({
      resumeReady: true,
      nicheReady: true,
      tailored: false,
      referralReady: true,
      pitchReady: true,
      negotiateReady: false,
    });
    expect(mid.next?.id).toBe("match");
    expect(mid.steps.filter((step) => step.status === "done").map((step) => step.id)).toEqual(["resume", "niche"]);
    expect(mid.steps.find((step) => step.id === "referral")?.status).toBe("upcoming");

    const done = journeyState({
      resumeReady: true,
      nicheReady: true,
      tailored: true,
      referralReady: true,
      pitchReady: true,
      negotiateReady: true,
    });
    expect(done.next).toBeNull();
    expect(done.completed).toBe(6);
  });

  it("keeps a deep question bank", () => {
    expect(QUESTION_BANK.length).toBeGreaterThanOrEqual(20);
  });
});
