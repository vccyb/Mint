#!/bin/bash

# Agent 模式功能验证脚本
# 由于 browser-harness 未安装，此脚本提供手动测试指南和 API 测试

set -e

BASE_URL="http://localhost:3000"
TIMESTAMP=$(date +%s)
TEMP_DIR="/tmp/agent-verify-$TIMESTAMP"
mkdir -p "$TEMP_DIR"

echo "====================================="
echo "Agent 模式功能验证"
echo "时间: $(date)"
echo "临时目录: $TEMP_DIR"
echo "====================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_api() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"

    echo -n "测试 $name ... "
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
        -H "Content-Type: application/json" \
        ${data:+-d "$data"} \
        "$BASE_URL$endpoint" 2>&1)

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✅ 通过 ($http_code)${NC}"
        echo "  响应: $body" | head -c 200
        echo ""
        return 0
    else
        echo -e "${RED}❌ 失败 ($http_code)${NC}"
        echo "  响应: $body"
        return 1
    fi
}

# 1. 基础访问测试
echo "====================================="
echo "1. 基础访问测试"
echo "====================================="

echo -n "检查服务器是否运行 ... "
if curl -s -f "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 通过${NC}"
else
    echo -e "${RED}❌ 失败${NC}"
    echo "错误: 服务器未运行或无法访问"
    exit 1
fi

echo ""
echo "请在浏览器中完成以下手动测试步骤:"
echo ""

# 2. 创建工程测试
echo "====================================="
echo "2. 创建工程测试"
echo "====================================="
echo "手动步骤:"
echo "  1. 访问 $BASE_URL"
echo "  2. 点击 '新建工程' 按钮"
echo "  3. 输入工程名称: test-project-$TIMESTAMP"
echo "  4. (可选) 选择文件夹"
echo "  5. 点击 '创建'"
echo "  6. 截图保存到: $TEMP_DIR/02-create-project.png"
echo ""
echo -e "${YELLOW}⚠️  按任意键继续...${NC}"
read -n 1 -s

# 3. API 测试
echo ""
echo "====================================="
echo "3. API 端点测试"
echo "====================================="

# 测试获取工程列表
echo "测试获取工程列表..."
test_api "获取工程列表" "GET" "/api/projects" ""

# 测试获取会话列表
echo ""
echo "测试获取会话列表..."
test_api "获取会话列表" "GET" "/api/threads" ""

# 4. 文件 API 测试
echo ""
echo "====================================="
echo "4. 文件 API 测试"
echo "====================================="
echo "注意: 文件 API 需要 projectId，请先创建工程"
echo ""
echo "手动步骤:"
echo "  1. 创建一个工程"
echo "  2. 获取工程 ID (从开发者工具 Network 标签)"
echo "  3. 测试文件 API:"
echo "     curl '$BASE_URL/api/files?projectId=PROJECT_ID'"
echo ""

# 5. 代码分析
echo "====================================="
echo "5. 代码审查结果"
echo "====================================="

echo "检查 Agent API 实现..."
if [ -f "/Users/chenyubo/Project/harness-project/packages/mint/src/app/api/agent/route.ts" ]; then
    echo -e "${GREEN}✅ Agent API 文件存在${NC}"

    # 检查是否使用了 process.execPath
    if grep -q "process.execPath" "/Users/chenyubo/Project/harness-project/packages/mint/src/app/api/agent/route.ts"; then
        echo -e "${GREEN}✅ 使用 process.execPath (推荐)${NC}"
    else
        echo -e "${YELLOW}⚠️  未使用 process.execPath，可能导致 'spawn node ENOENT' 错误${NC}"
    fi
else
    echo -e "${RED}❌ Agent API 文件不存在${NC}"
fi

echo ""
echo "检查文件 API 实现..."
if [ -f "/Users/chenyubo/Project/harness-project/packages/mint/src/app/api/files/route.ts" ]; then
    echo -e "${GREEN}✅ 文件 API 文件存在${NC}"

    # 检查错误处理
    if grep -q "try {" "/Users/chenyubo/Project/harness-project/packages/mint/src/app/api/files/route.ts"; then
        echo -e "${GREEN}✅ 包含错误处理${NC}"
    fi
else
    echo -e "${RED}❌ 文件 API 文件不存在${NC}"
fi

# 6. 配置检查
echo ""
echo "====================================="
echo "6. 配置检查"
echo "====================================="

echo "检查环境变量..."
if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo -e "${GREEN}✅ ANTHROPIC_API_KEY 已设置${NC}"
else
    echo -e "${YELLOW}⚠️  ANTHROPIC_API_KEY 未设置 (Agent 功能可能无法工作)${NC}"
fi

if [ -n "$MINT_CWD" ]; then
    echo -e "${GREEN}✅ MINT_CWD 已设置: $MINT_CWD${NC}"
else
    echo -e "${YELLOW}⚠️  MINT_CWD 未设置${NC}"
fi

# 7. 问题汇总
echo ""
echo "====================================="
echo "7. 潜在问题汇总"
echo "====================================="

echo "根据代码审查，发现以下潜在问题:"
echo ""
echo "🔴 高优先级:"
echo "  - Agent 进程启动可能失败 (spawn node ENOENT)"
echo "    位置: /api/agent"
echo "    建议: 使用 process.execPath 而不是 'node'"
echo ""
echo "🟡 中优先级:"
echo "  - 文件面板可能返回 500 错误"
echo "    位置: /api/files"
echo "    建议: 检查 projectId 验证和错误处理"
echo ""
echo "  - 会话标题可能不会自动更新"
echo "    位置: 前端会话列表"
echo "    建议: 确保 SSE 事件包含标题更新"
echo ""

# 8. 手动测试清单
echo "====================================="
echo "8. 手动测试清单"
echo "====================================="
echo "请完成以下手动测试并记录结果:"
echo ""
cat << 'EOF'
基础访问
☐ 打开 http://localhost:3000
☐ 截图保存到 /tmp/agent-verify-01-homepage.png
☐ 确认页面加载正常，无 Console 错误

创建工程
☐ 点击"新建工程"按钮
☐ 填写工程名称
☐ 提交创建
☐ 截图保存到 /tmp/agent-verify-02-create-project.png
☐ 确认工程创建成功并在侧边栏显示

创建会话
☐ 在新建的工程下点击"新对话"按钮
☐ 截图保存到 /tmp/agent-verify-03-new-session.png
☐ 确认进入对话界面

Agent 对话
☐ 在输入框中输入测试消息 "1+1=?"
☐ 截图保存到 /tmp/agent-verify-04-input.png
☐ 发送消息
☐ 观察响应是否正常
☐ 等待响应完成
☐ 截图保存到 /tmp/agent-verify-05-response.png
☐ 检查 Console 是否有错误

会话标题更新
☐ 发送第一条消息后，立即观察侧边栏
☐ 截图保存到 /tmp/agent-verify-06-title-update.png
☐ 确认会话标题是否自动更新

文件面板
☐ 点击右侧文件面板
☐ 观察是否显示工程文件树
☐ 截图保存到 /tmp/agent-verify-07-file-panel.png
☐ 检查是否有 500 错误
☐ 尝试展开/折叠文件夹

会话删除
☐ 找到一个测试会话
☐ 点击删除按钮
☐ 截图保存到 /tmp/agent-verify-08-delete-confirm.png
☐ 测试取消和确认操作

Chat 模式对比
☐ 切换到 Chat 模式
☐ 对比输入框宽度
☐ 截图保存到 /tmp/agent-verify-09-chat-mode.png
☐ 测试对话功能
EOF

echo ""
echo "====================================="
echo "验证完成"
echo "====================================="
echo ""
echo "所有截图应保存在: $TEMP_DIR"
echo "请将测试结果和截图更新到验证报告中"
echo ""
echo "报告位置: /Users/chenyubo/Project/harness-project/docs/agent-mode-verification-report.md"
