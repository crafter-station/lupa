const words = [
  "javascript",
  "typescript",
  "react",
  "nextjs",
  "database",
  "api",
  "server",
  "frontend",
  "backend",
  "fullstack",
  "performance",
  "optimization",
  "cache",
  "docker",
  "kubernetes",
  "microservices",
  "authentication",
  "authorization",
  "testing",
  "deployment",
  "monitoring",
  "logging",
  "analytics",
  "metrics",
  "security",
  "encryption",
  "validation",
  "migration",
  "integration",
  "ai",
  "machine learning",
  "data science",
  "cloud computing",
  "serverless",
  "graphql",
  "rest api",
  "websocket",
  "real-time",
  "streaming",
  "batch",
  "queue",
  "worker",
  "cron",
  "scheduler",
  "notification",
  "email",
  "sms",
  "how to optimize database queries",
  "best practices for react hooks",
  "understanding async await",
  "what is kubernetes",
  "deploy nextjs app",
  "typescript generics tutorial",
  "api rate limiting strategies",
  "server side rendering vs client side",
  "how to scale microservices",
  "debugging node.js applications",
  "git workflow best practices",
  "tailwind css responsive design",
  "authentication with jwt tokens",
  "postgresql indexing strategies",
  "redis caching patterns",
];

function getRandomQuery(): string {
  return words[Math.floor(Math.random() * words.length)];
}

async function makeRequest(query: string): Promise<void> {
  const url = `https://dev.lupa.build/api/search?projectId=CR1g03Sf3D&deploymentId=HWpgHPqSOC&query=${encodeURIComponent(query)}`;

  const start = performance.now();
  try {
    const response = await fetch(url);
    const duration = performance.now() - start;
    console.log(`[${duration.toFixed(2)}ms] ${response.status} - "${query}"`);
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[${duration.toFixed(2)}ms] ERROR - "${query}"`, error);
  }
}

async function runLoadTest(numRequests = 100, concurrency = 10): Promise<void> {
  console.log(
    `Starting load test: ${numRequests} requests, ${concurrency} concurrent`,
  );

  const requests: Promise<void>[] = [];

  for (let i = 0; i < numRequests; i++) {
    const query = getRandomQuery();
    requests.push(makeRequest(query));

    if (requests.length >= concurrency) {
      await Promise.all(requests.splice(0, concurrency));
    }
  }

  if (requests.length > 0) {
    await Promise.all(requests);
  }

  console.log("Load test complete");
}

runLoadTest();
