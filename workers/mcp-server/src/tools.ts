export interface McpTool {
  name: string;
  description: string;
  annotations: {
    title: string;
    readOnlyHint: boolean;
    destructiveHint: boolean;
    idempotentHint: boolean;
  };
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
  orchestratorRoute: string;
}

export const MCP_TOOLS: McpTool[] = [
  {
    name: "deep_research",
    description:
      "Comprehensive research combining web search, Wikipedia, and academic papers. Use for in-depth topic research, background research, or when multiple source types are needed.",
    annotations: {
      title: "Deep Research",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The research topic or question",
        },
      },
      required: ["query"],
    },
    orchestratorRoute: "/research",
  },
  {
    name: "competitor_analysis",
    description:
      "Competitive intelligence from web search, news, and Hacker News community. Use to analyze a company, product, or technology's competitive position and community sentiment.",
    annotations: {
      title: "Competitor Analysis",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Company, product, or technology to analyze",
        },
      },
      required: ["query"],
    },
    orchestratorRoute: "/competitor",
  },
  {
    name: "marketing_brief",
    description:
      "Content marketing brief with trending themes, SEO keywords, and audience pain points. Use to plan content strategy for a topic or product.",
    annotations: {
      title: "Marketing Brief",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Topic or product to build the marketing brief for",
        },
      },
      required: ["query"],
    },
    orchestratorRoute: "/marketing",
  },
  {
    name: "plugin_ecosystem_analysis",
    description:
      "API and plugin ecosystem analysis showing existing integrations, patterns, and gaps. Use to understand what tools/APIs exist in a technology space.",
    annotations: {
      title: "Plugin Ecosystem Analysis",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Technology or capability to analyze for existing plugins/APIs",
        },
      },
      required: ["query"],
    },
    orchestratorRoute: "/plugins",
  },
  {
    name: "academic_research",
    description:
      "Deep academic literature review across Semantic Scholar, arXiv, and PubMed. Use for scientific research, medical topics, or finding peer-reviewed evidence.",
    annotations: {
      title: "Academic Research",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Research topic or question to search academic databases",
        },
      },
      required: ["query"],
    },
    orchestratorRoute: "/academic",
  },
  {
    name: "news_brief",
    description:
      "Multi-source news intelligence briefing from mainstream news, Hacker News, and web search. Use to get a current, synthesized overview of news on any topic.",
    annotations: {
      title: "News Brief",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Topic to get a news briefing for",
        },
      },
      required: ["query"],
    },
    orchestratorRoute: "/news-brief",
  },
  {
    name: "market_scan",
    description:
      "Financial and market overview including analysis, key metrics, and exchange rate context. Use for market research, financial overviews, or economic analysis.",
    annotations: {
      title: "Market Scan",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Market, industry, or financial topic to scan",
        },
        currency: {
          type: "string",
          description: "Base currency for exchange rate context (default: USD)",
        },
      },
      required: ["query"],
    },
    orchestratorRoute: "/market-scan",
  },
  {
    name: "location_brief",
    description:
      "Geographic intelligence with geocoding, current weather, country data, and Wikipedia context. Use to get a complete picture of a location.",
    annotations: {
      title: "Location Brief",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Location to research (city, region, country, or address)",
        },
      },
      required: ["query"],
    },
    orchestratorRoute: "/location-brief",
  },
  {
    name: "health_research",
    description:
      "Biomedical research summary from PubMed, academic papers, and Wikipedia with clinical evidence assessment. Includes disclaimer that this is not medical advice.",
    annotations: {
      title: "Health Research",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Health topic, condition, treatment, or medical question to research",
        },
      },
      required: ["query"],
    },
    orchestratorRoute: "/health-research",
  },
  {
    name: "tech_scout",
    description:
      "Technology evaluation covering GitHub ecosystem, Hacker News adoption signals, web research, and academic papers. Use to assess a technology's maturity, community, and alternatives.",
    annotations: {
      title: "Tech Scout",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Technology, framework, or tool to evaluate",
        },
      },
      required: ["query"],
    },
    orchestratorRoute: "/tech-scout",
  },
  {
    name: "fact_check",
    description:
      "Multi-source fact verification using web search, Wikipedia, academic sources, and dictionary. Returns verdict (Supported/Partially Supported/Unsupported/Unverifiable) with evidence and confidence level.",
    annotations: {
      title: "Fact Check",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Claim or statement to fact-check",
        },
      },
      required: ["query"],
    },
    orchestratorRoute: "/fact-check",
  },
  {
    name: "content_brief",
    description:
      "Content creation brief with research, outline, key data points, and SEO suggestions. Use to plan a blog post, article, or other content piece.",
    annotations: {
      title: "Content Brief",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Topic for the content piece" },
        format: {
          type: "string",
          description:
            "Content format: 'blog post', 'article', 'newsletter', etc. (default: blog post)",
        },
      },
      required: ["query"],
    },
    orchestratorRoute: "/content-brief",
  },
  {
    name: "meeting_prep",
    description:
      "Pre-meeting intelligence brief with attendee background and talking points from web research. Use before a meeting to prepare informed talking points.",
    annotations: {
      title: "Meeting Prep",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
    inputSchema: {
      type: "object",
      properties: {
        attendee_name: {
          type: "string",
          description: "Full name of the meeting attendee",
        },
        attendee_company: {
          type: "string",
          description: "Company of the meeting attendee",
        },
        meeting_title: {
          type: "string",
          description: "Title or subject of the meeting",
        },
        meeting_time: {
          type: "string",
          description: "Date and time of the meeting",
        },
        meeting_duration_minutes: {
          type: "number",
          description: "Duration of the meeting in minutes",
        },
        meeting_location: {
          type: "string",
          description: "Location or video link for the meeting",
        },
      },
      required: ["attendee_name", "attendee_company"],
    },
    orchestratorRoute: "/meeting-prep",
  },
];

export function toolByName(name: string): McpTool | undefined {
  return MCP_TOOLS.find((t) => t.name === name);
}
