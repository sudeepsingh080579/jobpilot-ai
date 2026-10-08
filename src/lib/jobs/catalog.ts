export type JobQuery = {
  title?: string;
  location?: string;
  workMode?: string;
  experience?: string;
  keywords?: string;
};

export type JobResult = {
  externalId: string;
  title: string;
  company: string;
  location: string;
  workMode: string;
  experience: string;
  minYears: number;
  salary: string;
  url: string;
  source: string;
  description: string;
};

export const SAMPLE_JOBS: JobResult[] = [
  {
    externalId: "sample-razorpay-director-platform",
    title: "Director, Platform Engineering",
    company: "Razorpay",
    location: "Bengaluru, India",
    workMode: "hybrid",
    experience: "14+ years",
    minYears: 14,
    salary: "₹90L–₹1.4Cr",
    url: "",
    source: "sample",
    description:
      "Razorpay is hiring a Director, Platform Engineering to turn a central DevOps queue into a product. You will own Kubernetes on AWS, Terraform, CI/CD, developer experience, and the golden path used by product squads. Reliability, on-call health, and unit cost sit in your staff review. Partner with security on IAM and SOC2. This is a leadership role, not a hands-on ticket desk. Hybrid in Bengaluru, with overlap to other Indian offices.",
  },
  {
    externalId: "sample-freshworks-head-sre",
    title: "Head of SRE",
    company: "Freshworks",
    location: "Chennai / Bengaluru",
    workMode: "hybrid",
    experience: "12+ years",
    minYears: 12,
    salary: "₹70L–₹1.1Cr",
    url: "",
    source: "sample",
    description:
      "Head of SRE for a multi-product SaaS company. Build the error budget practice, incident command, Prometheus and Grafana observability, and an on-call model that does not depend on heroes. Experience with AWS, Kubernetes, and SLOs is expected. You will coach staff engineers and present reliability to product directors. Helpdesk and NOC-only backgrounds will not fit.",
  },
  {
    externalId: "sample-cloudflare-director-edge",
    title: "Director of Infrastructure",
    company: "Cloudflare",
    location: "Remote, United States",
    workMode: "remote",
    experience: "15+ years",
    minYears: 15,
    salary: "$240k–$310k",
    url: "",
    source: "sample",
    description:
      "Director of Infrastructure, US remote. Lead teams running global systems on a mix of bare metal and cloud. We care about Linux, networking, Terraform, capacity, and a calm incident culture. You will work with finance on cost and with product on developer experience. Overlap with US Eastern hours is required. Platform engineering judgment matters more than a specific public cloud logo.",
  },
  {
    externalId: "sample-atlassian-head-devops",
    title: "Head of DevOps",
    company: "Atlassian",
    location: "Remote, India",
    workMode: "remote",
    experience: "12+ years",
    minYears: 12,
    salary: "₹80L–₹1.2Cr",
    url: "",
    source: "sample",
    description:
      "Head of DevOps for an India hub. Own CI/CD, GitHub Actions, GitOps, and the paved road for services on Kubernetes. Partner with security and with a US platform group. FinOps is part of the job: the cloud bill needs an owner. Jira is how the company works, not the thing you are administering. Remote within India.",
  },
  {
    externalId: "sample-stripe-staff-platform",
    title: "Staff Platform Engineer",
    company: "Stripe",
    location: "Remote, United States",
    workMode: "remote",
    experience: "10+ years",
    minYears: 10,
    salary: "$220k–$280k",
    url: "",
    source: "sample",
    description:
      "Staff platform engineer, individual contributor. Design multi-region infrastructure, Ruby and Go service tooling, and reliability practices. This is not a people-management seat. Strong software engineering is required. US remote.",
  },
  {
    externalId: "sample-phonepe-vp-cloud",
    title: "VP, Cloud and Reliability",
    company: "PhonePe",
    location: "Bengaluru, India",
    workMode: "onsite",
    experience: "18+ years",
    minYears: 18,
    salary: "₹1.6Cr+",
    url: "",
    source: "sample",
    description:
      "VP cloud and reliability. Onsite in Bengaluru. Accountable for uptime of a large payments estate, vendor management, budget, and a multi-level organization. AWS at serious scale, incident leadership, and board-level communication. Pure sales engineering profiles are not a match.",
  },
  {
    externalId: "sample-notion-director-it",
    title: "Director of IT Support",
    company: "Northline Apps",
    location: "Austin, United States",
    workMode: "onsite",
    experience: "8+ years",
    minYears: 8,
    salary: "$160k",
    url: "",
    source: "sample",
    description:
      "Director of IT support and helpdesk operations. Own laptop provisioning, the service desk, and vendor tickets. This is an IT support leadership role, not platform engineering. Onsite in Austin.",
  },
  {
    externalId: "sample-groww-director-cloud",
    title: "Director, Cloud Infrastructure",
    company: "Groww",
    location: "Bengaluru, India",
    workMode: "hybrid",
    experience: "13+ years",
    minYears: 13,
    salary: "₹85L–₹1.3Cr",
    url: "",
    source: "sample",
    description:
      "Director, Cloud Infrastructure for a fintech product. AWS, Terraform, Kubernetes, cost optimization, and a migration off a few brittle monolith paths. You will sit with finance on FinOps and with security on IAM. Hybrid Bengaluru. Leadership of platform and SRE managers.",
  },
];

function includes(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase().trim());
}

export function searchCatalog(query: JobQuery, jobs: JobResult[] = SAMPLE_JOBS) {
  const minYears = Number(query.experience || 0);
  const words = (query.keywords ?? "")
    .split(/[,\s]+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 1);

  return jobs.filter((job) => {
    if (query.title && !includes(`${job.title} ${job.description}`, query.title)) return false;
    if (query.location && !includes(`${job.location} ${job.workMode}`, query.location)) return false;
    if (query.workMode && query.workMode !== "any" && job.workMode !== query.workMode) return false;
    if (minYears && job.minYears < minYears) return false;
    if (words.some((word) => !includes(`${job.title} ${job.description} ${job.company}`, word))) return false;
    return true;
  });
}
