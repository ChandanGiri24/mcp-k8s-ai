import fetch from "node-fetch";
import readline from "readline";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const handledDeployments = new Set();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
async function rollbackDeployment(deploymentName) {
  const res = await fetch("http://localhost:3000/tools/rollback-deployment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ deploymentName })
  });

  const data = await res.json();

 
  console.log("🔄 Rollback response:", data);

  console.log(
    `🔄 ${data.message || data.error || JSON.stringify(data)}`
  );
}
async function handlePrompt(userPrompt) {
  try {
    const decisionRes = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        prompt: `
You are a helpful AI assistant for DevOps and Kubernetes.

Rules:

1. Greetings:
- If user says hi/hello/hey → respond naturally (no command)

2. Commands:

Pods:
get-pods

Restart:
restart-pod:<pod-name>

Apply:
apply-manifest:<file-name>.yaml

Examples:
apply service → apply-manifest:service.yaml
apply deployment → apply-manifest:deployment.yaml
apply user service → apply-manifest:user-service.yaml

3. Strict Output:
- Only return ONE line
- No JSON
- No explanation

User: ${userPrompt}
Answer:
`,
        stream: false,
        options: { temperature: 0 }
      })
    });

    const decisionData = await decisionRes.json();

    let decision = (decisionData.response || "")
      .trim()
      .split("\n")
      .pop()
      .trim()
      .toLowerCase();

    console.log("🔍 RAW AI:", decisionData.response);

    // -----------------------------
    // FALLBACK (keep your logic)
    // -----------------------------
    const input = userPrompt.toLowerCase();

    if (input.includes("pod") && !input.includes("restart")) {
      decision = "get-pods";
    }

    if (input.includes("restart")) {
      const match = input.match(/pod\s+([a-z0-9-]+)/i);
      if (match) {
        decision = `restart-pod:${match[1]}`;
      }
    }

    if (input.includes("apply") || input.includes("deploy") || input.includes("create")) {
      if (input.includes("service")) {
        decision = "apply-manifest:service.yaml";
      } else if (input.includes("deployment")) {
        decision = "apply-manifest:deployment.yaml";
      } else if (input.includes("ingress")) {
        decision = "apply-manifest:ingress.yaml";
      }
    }

    console.log("✅ Final Decision:", decision);

    // -----------------------------
    // TOOL: GET PODS
    // -----------------------------
    if (decision === "get-pods") {
      const res = await fetch("http://localhost:3000/tools/get-pods", {
        method: "POST"
      });

      const data = await res.json();
      const pods = data.result || data;

      return `✅ Pods:\n${pods.join("\n")}`;
    }

    // -----------------------------
    // TOOL: APPLY MANIFEST 
    // -----------------------------
    if (decision.startsWith("apply-manifest:")) {
   
      const fileName = decision.split(":")[1];

      // ✅ Resolve to ../k8s/
      const filePath = path.join(__dirname, "../k8s", fileName);

      console.log("📂 Using file:", filePath);

      const res = await fetch("http://localhost:3000/tools/apply-manifest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ filePath })
      });

      const data = await res.json();
      return `🚀 ${data.message || JSON.stringify(data)}`;
    }

    // -----------------------------
    // TOOL: RESTART POD
    // -----------------------------
    if (decision.startsWith("restart-pod:")) {
      const podName = decision.split(":")[1];

      const res = await fetch("http://localhost:3000/tools/restart-pod", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ podName })
      });

      const data = await res.json();

      return `🔄 ${data.message || JSON.stringify(data)}`;
    }

    return `❓ Unknown command: ${decision}`;

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    return "Error occurred";
  }
}

// Chat loop
function startChat() {
  rl.question("\nYou: ", async (input) => {
    const response = await handlePrompt(input);
    console.log("AI:", response);
    startChat();
  });
}

async function autoHealLoop() {
  setInterval(async () => {
    try {
      const res = await fetch("http://localhost:3000/tools/get-unhealthy-pods", {
        method: "POST"
      });

      const data = await res.json();

      if (data.result.length > 0) {
        console.log("⚠️ Issues detected:", data.result);

        for (const item of data.result) {

       
          if (item.deployment && !handledDeployments.has(item.deployment)) {

            handledDeployments.add(item.deployment);

            await rollbackDeployment(item.deployment);

     
            setTimeout(() => {
              handledDeployments.delete(item.deployment);
            }, 30000);
          }
        }

      } else {
        console.log("✅ Cluster healthy");
      }

    } catch (err) {
      console.error("Auto-heal error:", err.message);
    }
  }, 10000);
}

startChat();
autoHealLoop();