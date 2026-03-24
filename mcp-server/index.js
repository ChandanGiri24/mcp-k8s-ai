import express from "express";
import * as k8s from "@kubernetes/client-node";
import fs from "fs";
import yaml from "js-yaml";
import { exec } from "child_process";

const app = express();
app.use(express.json());

// -----------------------------
// Basic MCP Tools
// -----------------------------

// Tool: hello
app.post("/tools/hello", (req, res) => {
  res.json({ result: "Hello from MCP 🚀" });
});

app.post("/tools/rollback-deployment", async (req, res) => {
  try {
    const { deploymentName } = req.body;

    exec(
      `kubectl rollout undo deployment ${deploymentName}`,
      (err, stdout, stderr) => {
        if (err) {
          return res.status(500).json({ error: stderr });
        }

        res.json({
          message: `Rolled back deployment: ${deploymentName}`
        });
      }
    );

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Tool: time
app.post("/tools/time", (req, res) => {
  res.json({ result: new Date().toISOString() });
});

// -----------------------------
// Kubernetes: Get Pods
// -----------------------------

app.post("/tools/get-pods", async (req, res) => {
  try {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

    const response = await k8sApi.listNamespacedPod({
      namespace: "default"
    });

    const podNames = response.items.map(
      (pod) => pod.metadata.name
    );

    res.json({
      tool: "get-pods",
      namespace: "default",
      result: podNames
    });

  } catch (error) {
    console.error("K8s Error:", error);
    res.status(500).json({ error: error.message });
  }
});


// -----------------------------
// GET UNHEALTHY PODS 
// -----------------------------
app.post("/tools/get-unhealthy-pods", async (req, res) => {
  try {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    const api = kc.makeApiClient(k8s.CoreV1Api);

    const response = await api.listNamespacedPod({
      namespace: "default"
    });

    const unhealthy = response.items.filter(pod => {
      const containers = pod.status.containerStatuses || [];

      return containers.some(c => {
        const reason = c.state?.waiting?.reason;

        return (
          reason === "ImagePullBackOff" ||
          reason === "ErrImagePull" ||
          c.restartCount > 2 ||
          pod.status.phase !== "Running"
        );
      });
    });


    const result = unhealthy.map(p => {
      const owner = p.metadata.ownerReferences?.[0];

      let deploymentName = owner?.name;

      if (deploymentName && deploymentName.includes("-")) {
        deploymentName = deploymentName.split("-").slice(0, -1).join("-");
      }

      return {
        pod: p.metadata.name,
        deployment: deploymentName
      };
    });

    res.json({ result });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// -----------------------------
// Kubernetes: Restart Pod
// -----------------------------

app.post("/tools/restart-pod", async (req, res) => {
  try {
    const { podName } = req.body;

    if (!podName) {
      return res.status(400).json({
        error: "podName is required"
      });
    }

    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    const appsv1Api = kc.makeApiClient(k8s.AppsV1Api);

    await k8sApi.deleteNamespacedPod({
      name: podName,
      namespace: "default"
    });

    res.json({
      tool: "restart-pod",
      message: `Pod ${podName} deleted successfully. Kubernetes will recreate it.`
    });

  } catch (error) {
    console.error("Restart Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// -----------------------------
// Create Service
// -----------------------------

app.post("/tools/apply-manifest", async (req, res) => {
  try {
    const { filePath } = req.body;

    const kc = new k8s.KubeConfig();
    kc.loadFromDefault();

    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    const appsv1Api = kc.makeApiClient(k8s.AppsV1Api);

    const file = fs.readFileSync(filePath, "utf8");
    const manifest = yaml.load(file);

    // Example: create service
    if (manifest.kind === "Service") {
      await k8sApi.createNamespacedService({
        namespace: "default",
        body: manifest
      });
    }

    if (manifest.kind === "Deployment") {
      await appsv1Api.createNamespacedDeployment({
        namespace: "default",
        body: manifest
      });
    }

res.json({
  message: `Applied manifest: ${manifest.kind}`
});

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Health Check
// -----------------------------

app.get("/", (req, res) => {
  res.send("MCP Server running");
});

// -----------------------------
// Start Server
// -----------------------------

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
