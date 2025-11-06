import { Manifest } from "deno-slack-sdk/mod.ts";
import { ExampleFunctionDefinition } from "./functions/example_function/mod.ts";
import ExampleWorkflow from "./workflows/example_workflow.ts";

// Load from environment variables with fallback defaults
const APP_NAME = Deno.env.get("SLACK_APP_NAME") || "Slack Utils Template";
const APP_DESCRIPTION = Deno.env.get("SLACK_APP_DESCRIPTION") ||
  "A template for Slack workflow development";

export default Manifest({
  name: APP_NAME,
  description: APP_DESCRIPTION,
  icon: "assets/icon.png",
  workflows: [ExampleWorkflow],
  functions: [ExampleFunctionDefinition],
  outgoingDomains: [],
  botScopes: [
    "commands",
    "chat:write",
    "channels:read",
    "groups:read",
    "users:read",
  ],
});
