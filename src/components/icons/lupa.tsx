import type { LucideProps } from "lucide-react";

export const LupaIcon = (props: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 200 200"
    fill="none"
    {...props}
  >
    <title>Lupa</title>
    <circle
      cx="80"
      cy="80"
      r="55"
      fill="none"
      stroke="currentColor"
      strokeWidth="16"
    />
    <circle
      cx="120"
      cy="120"
      r="55"
      fill="none"
      stroke="currentColor"
      strokeWidth="16"
      className="opacity-80"
    />
  </svg>
);
