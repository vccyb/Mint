export const sourceMarkdown = `
- Mint
  自托管 AI Chat 与自主编程代理
  @image mint-assets/architecture.svg
    - 核心定位
      一个工具覆盖对话与编码
      @image mint-assets/dual-mode.svg
        - Chat 模式
          流式对话支持多模态
          - 图片与 PDF 附件
            原生多模态内容块
          - Extended Thinking
            展示模型推理过程
          - 多轮上下文
            会话历史自动管理
        - Agent 模式
          自主读写文件与执行命令
          - 文件系统访问
            读写搜索全能力
          - Bash 命令执行
            安全审批后运行
          - 子代理并行
            复杂任务分解并行处理
    - Agent Teams
      五个专业子代理并行协作
      @image mint-assets/agent-teams.svg
        - code-reviewer
          代码审查与安全检查
        - explorer
          代码库探索与架构分析
        - researcher
          技术调研与文档查询
        - implementer
          代码编写与修改
        - test-engineer
          测试编写与执行
    - 权限与安全
      三级权限控制工具调用
      @image mint-assets/permission-flow.svg
        - bypass 模式
          所有工具自动通过
        - default 模式
          只读自动通过写入需审批
        - plan 模式
          先生成计划审核后再执行
        - 实时审批
          SSE 推送请求用户确认
    - 功能模块
      完整的开发辅助工具链
        - 文件面板
          项目文件树浏览与预览
          - 可调整面板
            拖拽分割聊天与文件视图
          - 变更追踪
            Git 风格显示修改文件
        - Rich Input
          TipTap 富文本编辑器
          - @文件引用
            注入文件内容到 Prompt
          - /技能引用
            快速加载 Skill
          - #MCP 引用
            引用外部工具
        - Skills 系统
          可扩展的技能注入机制
          - 内置技能
            头脑风暴、计划编写等
          - 用户技能
            自定义 YAML 前置模板
        - MCP 集成
          配置外部工具服务器
    - 技术栈
      Next.js 15 + React 19 + TypeScript
      @image mint-assets/tech-stack.svg
        - 框架与 UI
          Next.js 15 App Router + Tailwind CSS 4
        - Agent SDK
          Claude Agent SDK + AgentOrchestrator
        - 存储
          文件 JSONL 会话 + JSON 配置
        - 部署
          本地 CLI 启动或静态部署
    - 设计理念
      本地优先的 AI 编程助手
        - 自托管
          数据全部存储在本地
        - 即开即用
          在项目目录启动即刻使用
        - 渐进权限
          从全自动到逐步审批
        - 可扩展
          Skills + MCP 双扩展机制
`;
