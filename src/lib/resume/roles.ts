/**
 * Role families: the target roles a job seeker can pick, the titles used to search
 * with, and the keyword vocabulary an ATS typically filters on. A keyword counts as
 * "present" only when it literally appears in the resume (aliases included).
 */
export type RoleFamily = {
  id: string;
  label: string;
  /** Titles used for job search and title matching. */
  titles: string[];
  /** Words that, when present in a job title, indicate this family. */
  titleWords: string[];
  /** keyword -> accepted spellings (all lower case). */
  keywords: Record<string, string[]>;
};

const k = (...names: string[]) => Object.fromEntries(names.map((n) => [n.split("|")[0], n.split("|")]));

export const ROLE_FAMILIES: RoleFamily[] = [
  {
    id: "devops-sre", label: "DevOps / SRE / Platform Engineer",
    titles: ["DevOps Engineer", "Site Reliability Engineer", "Platform Engineer", "Cloud Engineer", "Infrastructure Engineer"],
    titleWords: ["devops", "sre", "reliability", "platform", "infrastructure", "cloud engineer", "systems engineer", "production engineer"],
    keywords: k("kubernetes|k8s", "docker", "terraform", "aws|amazon web services", "azure", "gcp|google cloud", "ci/cd|cicd|ci cd", "jenkins", "github actions", "gitlab ci|gitlab", "ansible", "helm", "prometheus", "grafana", "linux", "python", "bash|shell scripting", "monitoring", "observability", "incident", "on-call|on call", "slo|sla", "infrastructure as code|iac", "argocd|gitops", "datadog", "cloudformation", "networking", "security"),
  },
  {
    id: "backend", label: "Backend / Software Engineer",
    titles: ["Backend Engineer", "Software Engineer", "Software Developer", "Java Developer", "Python Developer"],
    titleWords: ["backend", "back end", "software engineer", "software developer", "java developer", "python developer", "sde", "api engineer", "golang", "node"],
    keywords: k("java", "python", "go|golang", "node.js|nodejs|node", "spring boot|spring", "microservices", "rest|restful", "api|apis", "sql", "postgresql|postgres", "mysql", "mongodb", "redis", "kafka", "docker", "kubernetes|k8s", "aws", "git", "ci/cd|cicd", "unit testing|junit|pytest", "design patterns", "system design", "agile", "typescript", "graphql", "rabbitmq"),
  },
  {
    id: "frontend", label: "Frontend / Full-stack Engineer",
    titles: ["Frontend Engineer", "Full Stack Engineer", "React Developer", "UI Engineer", "Web Developer"],
    titleWords: ["frontend", "front end", "front-end", "full stack", "fullstack", "full-stack", "react", "angular", "ui engineer", "web developer"],
    keywords: k("react|reactjs|react.js", "typescript", "javascript|js", "html", "css", "next.js|nextjs", "redux", "angular", "vue|vue.js", "node.js|nodejs", "rest|restful", "graphql", "webpack|vite", "jest|testing library", "responsive", "accessibility|a11y", "tailwind", "sass|scss", "git", "ci/cd", "performance", "figma"),
  },
  {
    id: "data-eng", label: "Data Engineer",
    titles: ["Data Engineer", "Analytics Engineer", "Big Data Engineer", "ETL Developer"],
    titleWords: ["data engineer", "analytics engineer", "etl", "big data", "data platform", "data architect"],
    keywords: k("sql", "python", "spark|pyspark", "airflow", "kafka", "dbt", "snowflake", "databricks", "redshift", "bigquery", "hadoop", "hive", "etl|elt", "data pipeline|data pipelines", "data warehouse|data warehousing", "aws", "azure", "gcp", "scala", "delta lake", "data modeling|data modelling", "terraform", "docker"),
  },
  {
    id: "data-ml", label: "Data Scientist / ML Engineer",
    titles: ["Data Scientist", "Machine Learning Engineer", "ML Engineer", "AI Engineer", "Applied Scientist"],
    titleWords: ["data scientist", "machine learning", "ml engineer", "ai engineer", "applied scientist", "nlp", "deep learning", "research scientist"],
    keywords: k("python", "machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn|sklearn", "pandas", "numpy", "sql", "nlp|natural language processing", "llm|large language model|llms", "computer vision", "statistics|statistical", "mlops", "feature engineering", "a/b testing|ab testing", "spark", "aws", "docker", "model deployment", "xgboost", "transformers"),
  },
  {
    id: "data-analyst", label: "Data / Business Analyst",
    titles: ["Data Analyst", "Business Analyst", "BI Analyst", "Business Intelligence Analyst"],
    titleWords: ["analyst", "business intelligence", "bi developer", "reporting"],
    keywords: k("sql", "excel|microsoft excel", "power bi|powerbi", "tableau", "python", "data analysis", "dashboards|dashboard", "reporting", "stakeholder|stakeholders", "requirements gathering|requirements", "kpi|kpis", "etl", "data visualization|data visualisation", "jira", "agile", "process improvement", "looker"),
  },
  {
    id: "qa", label: "QA / Test Automation Engineer",
    titles: ["QA Engineer", "SDET", "Test Automation Engineer", "Quality Engineer"],
    titleWords: ["qa", "sdet", "quality", "test automation", "tester", "quality assurance"],
    keywords: k("selenium", "test automation|automation testing", "cypress", "playwright", "java", "python", "api testing", "postman", "rest assured|restassured", "jira", "testng|junit", "cucumber|bdd", "ci/cd", "jenkins", "performance testing|jmeter", "regression testing|regression", "test cases|test plans|test plan", "agile", "sql", "appium", "git"),
  },
  {
    id: "security", label: "Security Engineer",
    titles: ["Security Engineer", "Cloud Security Engineer", "Application Security Engineer", "Information Security Analyst"],
    titleWords: ["security", "infosec", "appsec", "soc analyst", "cyber"],
    keywords: k("security", "siem", "iam", "vulnerability management|vulnerability", "penetration testing|pentest", "owasp", "encryption", "compliance", "soc 2|soc2", "iso 27001", "incident response", "threat modeling|threat modelling", "aws", "azure", "zero trust", "splunk", "firewall", "devsecops", "python", "kubernetes"),
  },
  {
    id: "cloud-architect", label: "Cloud / Solutions Architect",
    titles: ["Cloud Architect", "Solutions Architect", "Technical Architect", "Enterprise Architect"],
    titleWords: ["architect", "solutions engineer", "pre-sales", "presales"],
    keywords: k("aws", "azure", "gcp|google cloud", "architecture|architect", "microservices", "terraform", "kubernetes|k8s", "migration|cloud migration", "cost optimization|cost optimisation|finops", "security", "networking", "high availability", "disaster recovery", "serverless|lambda", "api", "stakeholder|stakeholders", "well-architected", "iac|infrastructure as code", "hybrid cloud", "multi-cloud"),
  },
  {
    id: "mobile", label: "Mobile Engineer (Android / iOS)",
    titles: ["Android Developer", "iOS Developer", "Mobile Engineer", "React Native Developer"],
    titleWords: ["android", "ios", "mobile", "react native", "flutter", "swift", "kotlin"],
    keywords: k("android", "ios", "kotlin", "swift", "java", "react native", "flutter", "rest|restful", "mvvm", "jetpack compose|swiftui", "firebase", "ci/cd", "unit testing", "git", "play store|app store", "xcode", "android studio", "dart"),
  },
  {
    id: "product", label: "Product Manager",
    titles: ["Product Manager", "Senior Product Manager", "Technical Product Manager", "Associate Product Manager"],
    titleWords: ["product manager", "product owner", "product lead", "product management", "head of product"],
    keywords: k("roadmap|product roadmap", "stakeholder|stakeholders", "user research", "a/b testing|ab testing|experimentation", "kpi|kpis|metrics", "prd|product requirements", "agile|scrum", "jira", "sql", "go-to-market|gtm", "prioritization|prioritisation", "user stories", "analytics", "customer discovery|customer interviews", "cross-functional", "launch", "saas", "b2b"),
  },
  {
    id: "eng-manager", label: "Engineering Manager / Leader",
    titles: ["Engineering Manager", "Technical Lead", "Director of Engineering", "Head of Engineering"],
    titleWords: ["engineering manager", "tech lead", "technical lead", "director of engineering", "head of engineering", "vp engineering", "team lead"],
    keywords: k("team leadership|led a team|managed a team|leadership", "hiring|recruiting", "mentoring|mentorship|mentored", "roadmap", "stakeholder|stakeholders", "agile|scrum", "architecture", "delivery", "budget", "performance reviews|performance management", "cross-functional", "okrs|okr", "strategy", "incident", "on-call"),
  },
  {
    id: "project", label: "Project / Program Manager",
    titles: ["Project Manager", "Program Manager", "Technical Program Manager", "Delivery Manager", "Scrum Master"],
    titleWords: ["project manager", "program manager", "delivery manager", "scrum master", "pmo", "technical program"],
    keywords: k("project management", "stakeholder|stakeholders", "agile|scrum", "risk management|risk", "budget", "jira", "pmp", "timeline|schedule", "resource planning|resource management", "waterfall", "status reporting|status reports", "vendor management|vendor", "delivery", "ms project|microsoft project", "kanban", "change management", "sla", "cross-functional"),
  },
  {
    id: "design", label: "UI/UX / Product Designer",
    titles: ["Product Designer", "UX Designer", "UI Designer", "UX Researcher"],
    titleWords: ["designer", "ux", "ui/ux", "user experience", "ux researcher"],
    keywords: k("figma", "user research", "wireframes|wireframing", "prototyping|prototypes|prototype", "design system|design systems", "usability testing|usability", "accessibility", "sketch", "adobe xd", "user flows", "interaction design", "information architecture", "visual design", "personas", "a/b testing", "html", "css"),
  },
  {
    id: "sales-marketing", label: "Sales / Marketing / Customer Success",
    titles: ["Sales Executive", "Account Executive", "Digital Marketing Manager", "Customer Success Manager"],
    titleWords: ["sales", "marketing", "account executive", "customer success", "business development", "growth"],
    keywords: k("crm", "salesforce", "hubspot", "lead generation", "pipeline", "b2b", "saas", "quota|targets", "negotiation", "seo", "sem|google ads", "campaigns|campaign", "analytics", "content marketing", "account management", "customer retention|churn", "revenue", "cold calling|outreach"),
  },
];

export const FALLBACK_FAMILY: RoleFamily = { id: "general", label: "General", titles: [], titleWords: [], keywords: {} };

export function familyById(id: string) {
  return ROLE_FAMILIES.find((f) => f.id === id);
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function hasWord(text: string, term: string) {
  const t = term.toLowerCase();
  if (t === "go") return /(?<![A-Za-z0-9-])Go(?![A-Za-z0-9-]| to\b)/.test(text);
  const pre = /^[a-z0-9]/.test(t) ? "(?<![a-z0-9])" : "";
  const post = /[a-z0-9]$/.test(t) ? "(?![a-z0-9])" : "";
  return new RegExp(`${pre}${esc(t)}${post}`, "i").test(text);
}

export function keywordHits(family: RoleFamily, text: string) {
  const present: string[] = [];
  const absent: string[] = [];
  for (const [kw, aliases] of Object.entries(family.keywords)) {
    (aliases.some((a) => hasWord(text, a)) ? present : absent).push(kw);
  }
  return { present, absent, total: present.length + absent.length };
}

/** Rank role families for a resume by title evidence (strong) and keyword coverage. */
export function suggestFamilies(input: { titles: string[]; headline: string; text: string }) {
  const titleText = [...input.titles, input.headline].join(" | ").toLowerCase();
  return ROLE_FAMILIES.map((f) => {
    const titleHit = f.titleWords.filter((w) => hasWord(titleText, w)).length;
    const { present, total } = keywordHits(f, input.text);
    const cov = total ? present.length / total : 0;
    const score = Math.min(1, titleHit ? 0.5 + 0.15 * Math.min(titleHit, 2) : 0) * 0.6 + cov * 0.4;
    return { family: f, score: Math.round(score * 100), titleHit, present: present.length, total };
  })
    .filter((r) => r.score >= 15)
    .sort((a, b) => b.score - a.score);
}
