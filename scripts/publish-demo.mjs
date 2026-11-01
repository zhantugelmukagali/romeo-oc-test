import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function git(args, input) {
  const result = spawnSync("git", args, {
    input,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      result.stderr || result.error?.message || "Git command failed",
    );
  }
  return result.stdout.trim();
}

try {
  if (git(["status", "--porcelain"])) {
    throw new Error(
      "Commit or preserve your working changes before publishing.",
    );
  }

  const source = git(["rev-parse", "HEAD"]);
  const html = readFileSync(
    new URL("../demo-dist/index.html", import.meta.url),
  );
  const branch = "refs/heads/gh-pages";
  let parent;

  if (git(["ls-remote", "--heads", "origin", branch])) {
    git(["fetch", "--no-tags", "origin", branch]);
    parent = git(["rev-parse", "FETCH_HEAD"]);
    const marker = JSON.parse(git(["show", `${parent}:.romeo-demo.json`]));
    if (marker.application !== "romeo-os-demo") {
      throw new Error(
        "The existing gh-pages branch is not managed by this script.",
      );
    }
    const files = git(["ls-tree", "-r", "--name-only", parent]).split("\n");
    const unknown = files.filter(
      (name) => !["index.html", ".nojekyll", ".romeo-demo.json"].includes(name),
    );
    if (unknown.length) {
      throw new Error(
        `Preserve custom Pages files before publishing: ${unknown.join(", ")}`,
      );
    }
  }

  const files = [
    ["index.html", html],
    [".nojekyll", ""],
    [
      ".romeo-demo.json",
      JSON.stringify({ application: "romeo-os-demo", source_commit: source }) +
        "\n",
    ],
  ];
  const entries = files.map(([name, data]) => {
    const hash = git(["hash-object", "-w", "--stdin"], data);
    return `100644 blob ${hash}\t${name}\n`;
  });
  const tree = git(["mktree"], entries.join(""));
  const commit = git([
    "commit-tree",
    tree,
    ...(parent ? ["-p", parent] : []),
    "-m",
    `Publish ROMEO OS demo from ${source.slice(0, 7)}`,
  ]);

  // A regular fast-forward push protects concurrent remote changes.
  git(["push", "origin", `${commit}:${branch}`]);
  console.log(`Published static files to gh-pages: ${commit}`);
  console.log(
    "If Pages is not enabled, select gh-pages / (root) in Settings → Pages.",
  );
  console.log(
    "Expected site URL: https://zhantugelmukagali.github.io/romeo-oc-test/",
  );
  console.log("The push alone does not confirm that the website is live.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
