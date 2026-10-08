export const SKILL_DICTIONARY = [
  "aws", "azure", "gcp", "google cloud", "kubernetes", "k8s", "terraform", "helm", "docker",
  "eks", "gke", "aks", "ecs", "lambda", "cloudformation", "pulumi", "ansible", "linux",
  "python", "go", "golang", "typescript", "javascript", "bash", "ci/cd", "github actions",
  "jenkins", "gitlab", "argocd", "flux", "prometheus", "grafana", "datadog", "opentelemetry",
  "sre", "devops", "platform engineering", "finops", "reliability", "incident", "on-call",
  "sla", "slo", "error budget", "iam", "security", "zero trust", "soc2", "iso 27001",
  "networking", "vpc", "service mesh", "istio", "kafka", "postgres", "redis", "observability",
  "cost optimization", "multi-cloud", "hybrid cloud", "infrastructure as code", "gitops",
  "leadership", "stakeholder", "budget", "vendor", "migration", "microservices", "monolith",
  "toil", "developer experience", "golden path", "backstage", "pagerduty", "jira",
  "director", "head of", "vp", "staff", "principal", "manager",
];

export function extractKeywords(jd: string) {
  const lower = jd.toLowerCase();
  const found = SKILL_DICTIONARY.filter((term) => lower.includes(term));
  return [...new Set(found)];
}

export function matchKeywords(resumeText: string, jd: string) {
  const keywords = extractKeywords(jd);
  const resume = resumeText.toLowerCase();
  const matched = keywords.filter((term) => resume.includes(term));
  const missed = keywords.filter((term) => !resume.includes(term));
  const score = keywords.length ? Math.round((matched.length / keywords.length) * 100) : 0;
  return { keywords, matched, missed, score };
}
