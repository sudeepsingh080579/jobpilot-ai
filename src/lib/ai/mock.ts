import type { AiTask } from "@/lib/ai/types";

function bag(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" ? (input as Record<string, unknown>) : {};
}

function str(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export function mockAi(task: AiTask, input: unknown): unknown {
  const data = bag(input);
  const name = str(data.name, "there");
  const title = str(data.title, "Director, Cloud Platform & DevOps");
  const company = str(data.company, "the company");
  const niche = str(data.niche, "cloud platform leadership");
  const variant = Number(data.variant ?? 0);

  switch (task) {
    case "chat":
      return {
        message: `${name}, I read this as a ${niche} search. ${str(data.message, "Tell me which role is in front of you.")} The useful next move is ${str(data.nextLabel, "the weekly plan")}, not a wider spray of applications.${variant ? " I took another pass and would still start there." : ""}`,
        suggestion: str(data.nextLabel, "Open the weekly plan"),
      };
    case "niche_suggest":
      return {
        niches: [
          {
            name: "Platform leadership, product companies",
            title: "Director of Platform Engineering",
            aliases: ["Head of Developer Experience", "Director, Cloud Platform"],
            industries: ["B2B SaaS", "Fintech", "Developer tools"],
            seniority: "Director",
            companyTypes: ["Series C to public product companies"],
            locations: ["Bengaluru", "Remote India", "US remote"],
            includeKeywords: ["platform", "kubernetes", "developer experience", "reliability"],
            excludeKeywords: ["helpdesk", "pure sales engineering"],
            why: "Your scope already sounds like a platform org: golden paths, cost, and incident leadership. Product companies pay for that as a director seat, not as a tools team.",
            payBenchmark: "India ₹80L–₹1.4Cr, or US remote $220k–$300k total, for director-level platform roles.",
          },
          {
            name: "Reliability and cloud operations",
            title: "Head of SRE",
            aliases: ["Director of Reliability", "VP Infrastructure"],
            industries: ["Payments", "Marketplaces", "SaaS"],
            seniority: "Head",
            companyTypes: ["High-traffic consumer or fintech"],
            locations: ["Hyderabad", "Bengaluru", "Remote"],
            includeKeywords: ["sre", "error budget", "on-call", "multi-region"],
            excludeKeywords: ["noc analyst", "rotating shift lead"],
            why: "If the story you want to tell is incident command and error budgets, a reliability title outperforms a generic DevOps manager title.",
            payBenchmark: "Head of SRE in India often lands ₹70L–₹1.2Cr. US remote director bands sit higher.",
          },
          {
            name: "FinOps-minded cloud director",
            title: "Director, Cloud Infrastructure",
            aliases: ["Head of Cloud", "Director of Infrastructure"],
            industries: ["Enterprise SaaS", "Banking technology"],
            seniority: "Director",
            companyTypes: ["Companies with a visible cloud bill"],
            locations: ["Mumbai", "Bengaluru", "US East remote"],
            includeKeywords: ["finops", "aws", "migration", "unit cost"],
            excludeKeywords: ["data entry", "it support"],
            why: "A cost-and-migration narrative is concrete in both Indian product firms and US remote roles.",
            payBenchmark: "Director cloud seats cluster around ₹90L+ in India and $230k+ in the US when the bill is large.",
          },
        ],
      };
    case "fit_narrative":
      return {
        narrative: `${str(data.band, "Partial")} fit for ${str(data.jobTitle, title)} at ${company}. The overlap is strongest where the description mentions ${list(data.skills).slice(0, 3).join(", ") || "platform and reliability"}. Treat gaps as interview stories, not as a reason to rewrite your whole career.`,
      };
    case "skill_map":
      return {
        skills: [
          { name: "Kubernetes", category: "technical", level: 5, variants: ["EKS", "GKE", "AKS"] },
          { name: "Terraform", category: "tool", level: 5, variants: ["Pulumi", "CloudFormation"] },
          { name: "AWS", category: "technical", level: 5, variants: ["GCP", "Azure"] },
          { name: "Observability", category: "technical", level: 4, variants: ["Prometheus", "Grafana", "OpenTelemetry"] },
          { name: "FinOps", category: "technical", level: 4, variants: ["unit cost", "commitment planning"] },
          { name: "CI/CD", category: "tool", level: 4, variants: ["GitHub Actions", "GitOps"] },
          { name: "Incident command", category: "soft", level: 5, variants: ["error budgets", "postmortems"] },
          { name: "Executive communication", category: "soft", level: 4, variants: ["board updates", "vendor negotiation"] },
          { name: "Org design", category: "soft", level: 4, variants: ["platform teams", "embedded SRE"] },
          { name: "Security baseline", category: "technical", level: 3, variants: ["IAM", "SOC2"] },
        ],
      };
    case "swot":
      return {
        strengths: ["You can tie platform work to cost, reliability, and delivery speed.", "Director-level scope is already in the story.", "India and US remote both fit the niche."],
        weaknesses: ["The resume may under-explain org leadership versus hands-on design.", "Security and data platform depth should be explicit if a role asks for them."],
        opportunities: ["Product companies are hiring platform directors to replace ticket-driven DevOps.", "A short pitch on cloud unit cost opens doors that a generic application will not."],
        threats: ["Roles titled DevOps Manager will down-level you.", "A wide niche makes every description look like a maybe."],
        actions: ["Keep one primary niche and three title aliases.", "Turn the two biggest programs into Challenge-Action-Result lines.", "Score every saved job before you tailor."],
      };
    case "car_scenarios":
      return {
        scenarios: [
          {
            challenge: `The platform team at ${str(data.company, "the last company")} was measured on tickets closed, while product teams were waiting weeks for environments.`,
            action: "You reset the team around a golden path, self-service environments, and an error budget the product directors could see.",
            result: "Lead time for a new service dropped from weeks to days, and the on-call load became predictable.",
            bullet: "Rebuilt platform delivery around a golden path, cutting new-service lead time from three weeks to two days for 40 squads.",
          },
          {
            challenge: "The cloud bill was growing faster than revenue and nobody owned unit cost.",
            action: "You installed a FinOps cadence with engineering owners, rightsizing, and commitment coverage.",
            result: "Run-rate dropped without a feature freeze.",
            bullet: "Cut cloud run-rate 28% in two quarters by tying unit cost to service owners and a monthly FinOps review.",
          },
        ],
      };
    case "resume_from_car":
      return {
        summary: `${name} is a ${title.toLowerCase()} who builds the platform, reliability, and cost system a product company needs once it is past a single cluster. The work shows up as shorter lead time, calmer incidents, and a cloud bill that leadership can explain.`,
      };
    case "resume_tailor":
      return {
        summary: `${title} focused on the outcomes in this description: reliable delivery, a platform other teams can use without a ticket, and a cloud bill tied to product cost. Recent scope includes multi-team leadership across India and US hours.`,
        skillsToAdd: list(data.missed).slice(0, 6),
        notes: `Wove missing keywords into the summary and the most recent role. Left older roles alone so the resume still sounds like one person. ${variant ? "Second pass tightened the first bullet." : ""}`,
        bulletPrefix: "For this role: ",
      };
    case "cover_letter":
      return {
        content: `Dear hiring manager,\n\nI am writing for the ${title} role at ${company}. I have spent the last several years building the unglamorous parts of a product company: the path a team uses to ship, the on-call system that does not depend on heroics, and a cloud bill that has an owner.\n\nWhat I would want to understand in the first conversation is where delivery is slow, where incidents still surprise you, and whether the platform is a product or a ticket queue. The roles I have held recently were judged on those three things, not on tools adopted.\n\nI am based in India and work US hours when the team needs it. I would like to talk about the first 90 days, not a tool list.\n\nSincerely,\n${name}`,
      };
    case "stage_draft": {
      const kind = str(data.kind, "follow_up");
      const lines: Record<string, string> = {
        referral: `Hi {{firstName}} — I am exploring a ${title} conversation at ${company}. We have not worked together, so I will keep this short. If you are comfortable, would you point me to the person who owns platform or reliability hiring? I can send a five-line brief. If not, no need to reply.`,
        follow_up: `Hello — I applied for ${title} at ${company} and wanted to leave one concrete note rather than a bump. The part of the brief I would want to pressure-test is how platform work is funded versus ticket work. Happy to share a one-page view if useful.`,
        thank_you: `Thank you for the time today on ${title}. The point I am still thinking about is the tension between reliability work and feature pressure. I will send the one-page 90-day outline we discussed.`,
        questions: `1. Where does the platform team still take tickets that a product team should self-serve?\n2. What does a bad quarter look like for this role — cost, incidents, or delivery?\n3. Who disagrees with the platform strategy today, and why?\n4. How is the cloud bill reviewed with finance?\n5. What would you want true in 90 days that is not true now?`,
        reschedule: `I need to move our ${title} conversation. I can do the same time tomorrow, or the following morning India time / evening US Eastern. Sorry for the shuffle.`,
        accept: `I am glad to accept the ${title} offer at ${company} on the terms we closed: base, sign-on, and the review timing we wrote down. I will return the signed letter today.`,
        decline: `Thank you for the offer for ${title}. I am going to decline. The scope is interesting, and the level and compensation did not land where I need them to. I hope we can stay in touch.`,
      };
      return { content: lines[kind] ?? lines.follow_up };
    }
    case "company_problems":
      return {
        problems: [
          { title: "Platform is still a ticket queue", detail: `${company} likely has product teams waiting on a central DevOps group for environments, access, and pipelines.` },
          { title: "Cloud cost has no product owner", detail: "The bill is visible to finance and vague to engineering. Unit cost is not in the operating review." },
          { title: "Incidents depend on a few people", detail: "On-call is heroics. Error budgets are not something a director can show a CEO." },
          { title: "India and US hours are two teams", detail: "Handoffs drop context. A leader who has run both clocks is the actual job, even if the posting does not say so." },
        ],
      };
    case "pitch_deck":
      return {
        slides: [
          { kicker: "For the hiring manager", title: `${company}: a platform that product teams can use`, body: "A short brief, not a tool tour.", bullets: [str(data.problem, "The central team is still the bottleneck.")] },
          { kicker: "The problem", title: str(data.problem, "Delivery waits on a central queue"), body: "If every new service needs a person in the platform team, the team becomes the constraint you hired it to remove.", bullets: ["Lead time is measured in meetings", "Access and environments are tickets", "Nobody can say what a service costs"] },
          { kicker: "What it costs", title: "The quiet tax", body: "Slow lead time shows up as missed quarters. Unowned cost shows up as a surprise in the board pack.", bullets: ["Engineering time spent waiting", "A bill that grows faster than usage", "Incidents that page the same three people"] },
          { kicker: "The read", title: "This is an operating problem", body: "Tools will not fix a queue. The fix is a paved path, owners for cost, and an error budget a product director will respect.", bullets: ["Golden path over bespoke pipelines", "Unit cost in the service review", "On-call that a new hire can join"] },
          { kicker: "90 days", title: "What I would do first", body: "I would not start with a migration.", bullets: ["Week 1–3: map the tickets that should not exist", "Week 4–8: ship one self-serve path for the common service", "Week 9–12: put cost and error budget in the staff review"] },
          { kicker: "Proof", title: "I have done the unglamorous version", body: str(data.proof, "Recent work cut lead time and cloud run-rate without a feature freeze."), bullets: ["Lead time down from weeks to days", "Run-rate down with owners, not a freeze", "On-call load that survived a holiday"] },
          { kicker: "The ask", title: "A working session, not a pitch", body: "Forty minutes on the current ticket themes and the cloud bill. I will come with questions, not a slide of logos.", bullets: ["Bring the last two incident reviews", "Bring the top five ticket types", "I will send a one-page note after"] },
        ],
      };
    case "pitch_revise":
      return {
        title: str(data.instruction, "A tighter version of this slide"),
        body: `Revised: ${str(data.body, "")} ${str(data.instruction, "Make it shorter.")}`.slice(0, 500),
        bullets: list(data.bullets).slice(0, 4).map((bullet) => bullet.replace(/\.$/, "")),
      };
    case "linkedin_posts":
      return {
        posts: [
          { theme: "Achievement", content: `We stopped measuring the platform team on tickets closed.\n\nThe number that mattered was how long a product squad waited for a new service. It was three weeks. Most of that wait was access, a pipeline, and an environment somebody had to build by hand.\n\nWe paved one path. Lead time went to two days. The ticket queue got quieter, which is the point.\n\nIf your platform team is proud of how many requests it clears, ask what the squads are waiting on.` },
          { theme: "Industry note", content: `A lot of "DevOps transformation" postings are actually a reliability and cost problem with a tool list stapled on.\n\nThe director job, when it is real, is to make delivery, incidents, and unit cost visible to people who do not live in the cluster.\n\nIf the interview never mentions the bill or the on-call, you are interviewing for a different job than the one in the title.` },
          { theme: "Personal observation", content: `Working India hours with a US team taught me to write the decision down before the other timezone wakes up.\n\nThe handoff is the product. A Slack thread is not a system of record. The teams that felt calm had a short written review: what changed, what broke, what we are not doing.\n\nIt is less glamorous than a new platform. It is why the new platform survives contact with a second office.` },
        ],
      };
    case "linkedin_profile":
      return {
        headline: `${title} | Platform, reliability, and cloud cost for product companies`,
        about: `${name === "there" ? "I" : name} lead platform and DevOps organizations through the phase where tickets, incidents, and the cloud bill all become leadership problems.\n\nThe work I want is specific: a paved path product teams can use, an on-call rotation a new hire can join, and a cost number a CFO can follow. I have done that across India and with US teams.\n\nI am not looking for a tool-admin seat. If you are hiring a director who can sit with engineering and with finance, I would like to talk.`,
      };
    case "interview_questions":
      return {
        questions: [
          { prompt: "Tell me about a platform change that removed a queue rather than adding a tool.", lookFor: ["lead time", "self-serve", "ticket"] },
          { prompt: "How have you put a cloud bill in front of people who do not read the console?", lookFor: ["unit cost", "owner", "finance"] },
          { prompt: "Describe an incident where the first story was wrong. What did you change after?", lookFor: ["postmortem", "on-call", "detection"] },
          { prompt: "How do you decide what the platform team will not do this quarter?", lookFor: ["tradeoff", "product", "roadmap"] },
          { prompt: "A staff engineer and a product director disagree on a migration. How do you run that conversation?", lookFor: ["stakeholder", "risk", "decision"] },
        ],
      };
    case "interview_feedback":
      return {
        alternate: `I would open with the result, then the constraint. For example: "Lead time was three weeks because every service needed a person. We paved one path and it dropped to two days. The hard part was getting product directors to stop asking for exceptions." Then name the number you already used: ${str(data.excerpt, "the metric in your answer")}.`,
        coaching: fillerNote(str(data.answer, "")),
      };
    case "negotiation_script":
      return {
        script: `Open: "I am excited about ${title} at ${company}. I want to close this, and the package needs to move."\n\nAnchor: "For this scope I am targeting ${str(data.target, "the top of the band")}. My floor for a yes is ${str(data.floor, "the number you will not cross")}. The current offer is ${str(data.offer, "below that")}."\n\nTrade, in this order:\n1. Base, because it compounds.\n2. Sign-on to bridge a gap you will not discount forever.\n3. A written six-month compensation review if they cannot reach the base now.\n4. Title and scope only if they match the work, not as a consolation.\n5. Start date and remote pattern as sweeteners, not as a substitute for base.\n\nIf they hold: "I do not want to decline over a small gap. If base cannot move, I need the sign-on and the review date in the letter."\n\nWalk away: "I like the problem. I cannot take the seat below ${str(data.floor, "my floor")}."\n\nDo not say yes on the call. "I will read the revised letter and reply tomorrow."`,
      };
    case "negotiation_turn": {
      const difficulty = str(data.difficulty, "medium");
      const firm = difficulty === "hard" ? "I have to be direct. That number is outside the band we took to finance." : difficulty === "easy" ? "We can probably get closer. Help me understand the gap." : "We have a little room, not the whole gap.";
      return {
        reply: `${firm} If I take ${str(data.target, "your number")} back, I need to know which piece is base and which piece can be sign-on. What would you accept if the base only moves part of the way?`,
      };
    }
    case "negotiation_report":
      return {
        summary: "You kept the conversation on numbers and trade-offs. Next time, restate the floor in the final turn so the letter cannot drift.",
      };
    case "weekly_narrative":
      return {
        narrative: `${name}, this week is about ${list(data.focus).slice(0, 2).join(" and ") || "a short list"}. Do those before you open another job board.`,
      };
    case "outreach_draft":
      return {
        body: str(data.filled, `Hi — I am ${name}, looking at ${title} conversations around ${company}. If you are the right person I will send a five-line brief. If not, a pointer is plenty.`),
      };
    default:
      return { message: "I can help with the next step on the desk." };
  }
}

function fillerNote(answer: string) {
  const fillers = (answer.match(/\b(um|uh|like|actually|basically)\b/gi) ?? []).length;
  if (!answer.trim()) return "The answer was empty. Give it one result, one constraint, and one number.";
  if (fillers > 2) return "The filler words are doing the work of a pause. Cut them and keep the number.";
  return "The content is usable. Put the result in the first sentence next time.";
}
