import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DeploymentSelect } from "@/db/schema";

export function DeploymentSelectorContent({
  deployments,
}: {
  deployments: DeploymentSelect[];
}) {
  return (
    <Select>
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Select deployment" />
      </SelectTrigger>
      <SelectContent>
        {deployments.map((deployment) => (
          <SelectItem key={deployment.id} value={deployment.id}>
            {deployment.name || deployment.id}{" "}
            {deployment.environment && `(${deployment.environment})`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
