// src/data/certificates.js
// TODO: Replace image paths with actual uploaded certificate files

export const techCertificates = [
  {
    title: "Java Foundations",
    domain: "Java",
    issuer: "Oracle",
    year: "2024",
    level: "Foundation",
    image: "/certificates/tech/tech_java_foundations.jpg"
  },
  {
    title: "Java SE Advanced",
    domain: "Java",
    issuer: "Oracle",
    year: "2024",
    level: "Advanced",
    image: "/certificates/tech/tech_java_se_advanced.jpg"
  },
  {
    title: "Spring Boot REST API",
    domain: "Spring Boot",
    issuer: "Udemy",
    year: "2024",
    level: "Intermediate",
    image: "/certificates/tech/tech_springboot_restapi.jpg"
  },
  {
    title: "Data Structures & Algorithms",
    domain: "DSA",
    issuer: "Self-paced",
    year: "2024",
    level: "Intermediate",
    image: "/certificates/tech/tech_dsa_certification.jpg"
  },
  {
    title: "AWS Cloud Practitioner",
    domain: "AWS",
    issuer: "AWS",
    year: "2024",
    level: "Foundation",
    image: "/certificates/tech/tech_aws_cloud_practitioner.jpg"
  },
  {
    title: "AI Fundamentals",
    domain: "AI/ML",
    issuer: "Coursera",
    year: "2024",
    level: "Foundation",
    image: "/certificates/tech/tech_ai_fundamentals.jpg"
  },
  {
    title: "MERN Full Stack Development",
    domain: "Web",
    issuer: "IIT Delhi",
    year: "2024",
    level: "Advanced",
    image: "/certificates/tech/tech_mern_iitdelhi.jpg"
  },
  {
    title: "Software Engineering Simulation",
    domain: "Web",
    issuer: "J.P. Morgan",
    year: "2024",
    level: "Professional",
    image: "/certificates/tech/tech_jpmorgan_swe_sim.jpg"
  }
];

export const sportsCertificates = [
  // Basketball
  {
    title: "UP State Basketball Championship",
    category: "Basketball",
    level: "State",
    event: "State Championship",
    year: "2022",
    image: "/certificates/basketball/sports_2022_up_state_basketball.jpg"
  },
  {
    title: "CISCE Zonal Championship",
    category: "Basketball",
    level: "Zonal",
    event: "CISCE Circuit",
    year: "2022",
    image: "/certificates/basketball/sports_2022_cisce_zonal.jpg"
  },
  {
    title: "CISCE Regional Championship",
    category: "Basketball",
    level: "Regional",
    event: "CISCE Circuit",
    year: "2023",
    image: "/certificates/basketball/sports_2023_cisce_regional.jpg"
  },
  {
    title: "AAVEG Basketball Tournament Winner",
    category: "Basketball",
    level: "Winner",
    event: "Inter-College",
    year: "2025",
    image: "/certificates/basketball/sports_2025_aaveg_winner.jpg"
  },

  // Athletics
  {
    title: "Kanpur Half Marathon",
    category: "Athletics",
    level: "5th Place",
    event: "City Marathon",
    year: "2022",
    image: "/certificates/athletics/athletics_2022_marathon.jpg"
  },
  {
    title: "Kanpur Half Marathon",
    category: "Athletics",
    level: "3rd Place",
    event: "City Marathon",
    year: "2023",
    image: "/certificates/athletics/athletics_2023_marathon.jpg"
  },

  // Writing
  {
    title: "Creative Writing Competition",
    category: "Writing",
    level: "3rd Place",
    event: "Inter-School",
    year: "2019",
    image: "/certificates/writing/writing_2019_creative_writing.jpg"
  },
  {
    title: "Literary Competition",
    category: "Writing",
    level: "Participant",
    event: "Regional Level",
    year: "2022",
    image: "/certificates/writing/writing_2022_literary.jpg"
  },

  // Leadership
  {
    title: "House Captain",
    category: "Leadership",
    level: "Captain",
    event: "School Leadership",
    year: "2022",
    image: "/certificates/leadership/leadership_house_captain.jpg"
  },
  {
    title: "School Captain",
    category: "Leadership",
    level: "Captain",
    event: "School Leadership",
    year: "2023",
    image: "/certificates/leadership/leadership_school_captain.jpg"
  }
];

// Helper to filter sports by category
export const getSportsByCategory = (category) => {
  if (category === "All") return sportsCertificates;
  return sportsCertificates.filter(c => c.category === category);
};

// Helper to filter tech by domain
export const getTechByDomain = (domain) => {
  if (domain === "All") return techCertificates;
  return techCertificates.filter(c => c.domain === domain);
};

// All unique tech domains for filter pills
export const techDomains = [
  "All", "Java", "Spring Boot", "DSA", "AWS", "AI/ML", "Web"
];

// All unique sports categories for filter pills
export const sportsCategories = [
  "All", "Basketball", "Athletics", "Writing", "Leadership"
];