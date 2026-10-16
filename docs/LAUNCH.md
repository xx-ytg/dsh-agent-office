# Launch kit

Proposed repository name: `dsh-agent-office`

Repository description:

> A living pixel office for DeepSeek Harness. Watch real agents think, use tools, and wait for you.

Topics: `dsh-plugin`, `deepseek-harness`, `ai-agents`, `pixel-art`, `agent-observability`.

## English post

I built a tiny pixel office for DeepSeek Harness.

Your agents move between desks, the tool lab, the approval corner, and the lounge — driven by actual session events. Click a coworker to inspect their activity.

No extra API key. No runtime dependencies. English + Chinese. Local only.

The GIF below is a labeled demo; live mode listens to your actual Harness sessions.

Source + install: https://github.com/xx-ytg/dsh-agent-office

Attach `docs/demo.gif`. The repository link is ready to share.

## 中文发布文案

给 DeepSeek Harness 做了一个像素办公室。

Agent 思考时坐工位，调用工具时去实验台，需要你审批时到等候区，回合完成后去沙发休息。点击小人可以查看真实活动。

无需额外 API Key，无运行时依赖，中英文可切换，仅本机运行。

动图是明确标注的演示模式；接入 Harness 后，状态由真实会话事件驱动。

源码和安装说明：https://github.com/xx-ytg/dsh-agent-office

## Before publishing

1. Run one real model-backed task in the supported Harness version and confirm the office sees its events. This remains the main uncompleted integration check.
2. Add the real repository URL to `package.json` and this post. Check that the proposed npm name is available if publishing to npm.
3. Keep the demo label on simulated material. Record a real task for a second clip when available.
4. Upload the source to your account, then add the topics above and use the English README as the landing page.
5. Share a short clip showing three transitions: tool use → approval needed → completion. Link directly to the repository and invite compatibility reports.

Social posts and npm publication are not included in the repository upload.

