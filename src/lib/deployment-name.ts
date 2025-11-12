export function generateDeploymentName(): string {
  const adjectives = [
    "Swift",
    "Bright",
    "Noble",
    "Calm",
    "Bold",
    "Clear",
    "Wise",
    "Prime",
    "Vast",
    "Pure",
    "Quick",
    "Grand",
  ];
  const nouns = [
    "Falcon",
    "Phoenix",
    "Tiger",
    "Dragon",
    "Eagle",
    "Wolf",
    "Bear",
    "Lion",
    "Hawk",
    "Panther",
    "Raven",
    "Cobra",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj} ${noun} ${num}`;
}
