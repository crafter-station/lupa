import { useQueryState } from "nuqs";

export const useDeploymentId = () => useQueryState("deployment_id");
