---
description: Create GitHub issue following templates
agent: plan
---

Create a GitHub issue for Lupa following our templates.

Templates: @.github/ISSUE_TEMPLATE/webapp_issue.yml @.github/ISSUE_TEMPLATE/api_issue.yml @.github/ISSUE_TEMPLATE/doc_issue.yml @.github/ISSUE_TEMPLATE/general_issue.yml

The user will call this command with their issue description as an argument (e.g., "/create-issue I found it necessary to have read-only API keys").

Based on the user's description:
1. Determine which template fits best (webapp, api, doc, or general)
2. Extract as much information as possible from their description
3. Only ask for additional required fields that cannot be inferred
4. Generate the complete issue ready to copy/paste to GitHub

Format the output as:
```
Title: [Generated title]
Labels: [Comma-separated labels]

---

[Complete issue body in GitHub markdown format with all fields filled]
```

Be concise - if you can infer the information, don't ask. The goal is to make issue creation as fast as possible.

User input: $ARGUMENTS
