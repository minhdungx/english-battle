import { defineRailway, project, service } from "railway/iac";

// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "bufobiaaa";

export default defineRailway(() => {
  const bufobiaaa = service("bufobiaaa", {
    build: "npm --workspace=@bufobia/shared run build && npm --workspace=@bufobia/server run build",
    start: "npm --workspace=@bufobia/server run start",
    healthcheck: "/health",
    healthcheckTimeout: 100,
  });
  return project("english-battle-socket", {
    resources: [bufobiaaa],
  });
});
