// Static topic list, grouped by competency category.
// Categories mirror README.md §4 / PRD.md §5.3.

const topics = [
  // 1. Behavioural & Managerial Skills
  { id: "leadership", category: "Behavioural & Managerial Skills", name: "Leadership" },
  { id: "communication", category: "Behavioural & Managerial Skills", name: "Communication" },
  { id: "decision-making", category: "Behavioural & Managerial Skills", name: "Decision-making" },
  { id: "ethics", category: "Behavioural & Managerial Skills", name: "Ethics" },
  { id: "project-management", category: "Behavioural & Managerial Skills", name: "Project Management" },
  { id: "change-management", category: "Behavioural & Managerial Skills", name: "Change Management" },
  { id: "citizen-centricity", category: "Behavioural & Managerial Skills", name: "Citizen-centricity & Service Delivery" },

  // 2. Domain/Functional Knowledge
  { id: "survey-design", category: "Domain/Functional Knowledge", name: "Survey Design" },
  { id: "sampling", category: "Domain/Functional Knowledge", name: "Sampling" },
  { id: "national-accounts", category: "Domain/Functional Knowledge", name: "National Accounts" },
  { id: "price-statistics", category: "Domain/Functional Knowledge", name: "Price Statistics" },
  { id: "labour-statistics", category: "Domain/Functional Knowledge", name: "Labour Statistics" },
  { id: "sdg-indicators", category: "Domain/Functional Knowledge", name: "SDG Indicators" },
  { id: "evidence-in-public-policy", category: "Domain/Functional Knowledge", name: "Evidence in Public Policy" },
  { id: "insights-from-data-for-policy", category: "Domain/Functional Knowledge", name: "Insights from Data for Policy" },

  // 3. Technology & Emerging Tech
  { id: "artificial-intelligence", category: "Technology & Emerging Tech", name: "Artificial Intelligence" },
  { id: "digital-public-infrastructure", category: "Technology & Emerging Tech", name: "Digital Tools & Digital Public Infrastructure" },
  { id: "data-analysis", category: "Technology & Emerging Tech", name: "Data Analysis & Data-driven Decision-making" },
  { id: "cybersecurity-cloud-governance", category: "Technology & Emerging Tech", name: "Cybersecurity, Cloud & Digital Governance" },

  // 4. Wellness & Personal Effectiveness
  { id: "y-break-wellness", category: "Wellness & Personal Effectiveness", name: "Y-Break (Workplace Yoga/Wellness)" },

  // 5. Indigenous Knowledge Systems
  { id: "indigenous-knowledge-systems", category: "Indigenous Knowledge Systems", name: "Indigenous Knowledge Systems" },
];

module.exports = { topics };
