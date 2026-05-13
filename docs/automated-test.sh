#!/bin/bash

# Agent 模式功能验证 - 自动化 API 测试
set -e

BASE_URL="http://localhost:3000"
TIMESTAMP=$(date +%s)
TEMP_DIR="/tmp/agent-verify-$TIMESTAMP"
mkdir -p "$TEMP_DIR"

echo "====================================="
echo "Agent 模式功能验证 - API 测试"
echo "时间: $(date)"
echo "====================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试结果存储
declare -a PASSED_TESTS
declare -a FAILED_TESTS

# 测试函数
test_api() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_code="${5:-200}"

    echo -n "测试 $name ... "

    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint" 2>&1)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            "$BASE_URL$endpoint" 2>&1)
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -eq "$expected_code" ]; then
        echo -e "${GREEN}✅ 通过 ($http_code)${NC}"
        PASSED_TESTS+=("$name")
        # 保存响应到文件
        echo "$body" > "$TEMP_DIR/${name// /_}_response.json"
        return 0
    else
        echo -e "${RED}❌ 失败 ($http_code, 期望 $expected_code)${NC}"
        FAILED_TESTS+=("$name")
        echo "  响应: $body" | head -c 500
        echo ""
        # 保存错误响应
        echo "$body" > "$TEMP_DIR/${name// /_}_error.json"
        return 1
    fi
}

# 1. 基础访问测试
echo -e "${BLUE}1. 基础访问测试${NC}"
echo "-----------------------------------"
echo -n "检查服务器是否运行 ... "
if curl -s -f "$BASE_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 通过${NC}"
    PASSED_TESTS+=("服务器运行")
else
    echo -e "${RED}❌ 失败${NC}"
    echo "错误: 服务器未运行或无法访问"
    exit 1
fi
echo ""

# 2. API 端点测试
echo -e "${BLUE}2. API 端点测试${NC}"
echo "-----------------------------------"

# 测试获取工程列表
test_api "获取工程列表" "GET" "/api/projects" "" "200"

# 测试获取会话列表
test_api "获取会话列表" "GET" "/api/threads" "" "200"

# 测试 Agent API（不发送实际请求，只测试端点存在）
echo -n "测试 Agent API 端点存在性 ... "
agent_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"message":"test"}' \
    "$BASE_URL/api/agent" 2>&1)

if [ "$agent_status" != "404" ] && [ "$agent_status" != "405" ]; then
    echo -e "${GREEN}✅ 端点存在 ($agent_status)${NC}"
    PASSED_TESTS+=("Agent API 端点")
else
    echo -e "${RED}❌ 端点不存在 ($agent_status)${NC}"
    FAILED_TESTS+=("Agent API 端点")
fi
echo ""

# 3. 文件 API 测试
echo -e "${BLUE}3. 文件 API 测试${NC}"
echo "-----------------------------------"
echo "注意: 文件 API 需要 projectId"
echo ""

# 测试不带 projectId 的文件 API
echo -n "测试文件 API (无 projectId) ... "
files_status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/files")
if [ "$files_status" = "200" ]; then
    echo -e "${GREEN}✅ 通过 ($files_status)${NC}"
    PASSED_TESTS+=("文件 API (默认路径)")
elif [ "$files_status" = "500" ]; then
    echo -e "${YELLOW}⚠️  服务器错误 ($files_status) - 可能是路径问题${NC}"
    FAILED_TESTS+=("文件 API (默认路径)")
else
    echo -e "${RED}❌ 失败 ($files_status)${NC}"
    FAILED_TESTS+=("文件 API (默认路径)")
fi
echo ""

# 4. 配置和代码检查
echo -e "${BLUE}4. 代码审查${NC}"
echo "-----------------------------------"

# 检查 Agent API
echo -n "检查 Agent API 实现 ... "
if [ -f "/Users/chenyubo/Project/harness-project/packages/mint/src/app/api/agent/route.ts" ]; then
    echo -e "${GREEN}✅ 文件存在${NC}"

    # 检查关键代码模式
    if grep -q "process.execPath" "/Users/chenyubo/Project/harness-project/packages/mint/src/app/api/agent/route.ts" 2>/dev/null; then
        echo -e "  ${GREEN}✅ 使用 process.execPath (推荐)${NC}"
    else
        echo -e "  ${YELLOW}⚠️  未使用 process.execPath${NC}"
        echo "     这可能导致 'spawn node ENOENT' 错误"
        FAILED_TESTS+=("Agent API - process.execPath 检查")
    fi

    if grep -q "new AgentOrchestrator" "/Users/chenyubo/Project/harness-project/packages/mint/src/app/api/agent/route.ts" 2>/dev/null; then
        echo -e "  ${GREEN}✅ 使用 AgentOrchestrator${NC}"
    else
        echo -e "  ${YELLOW}⚠️  未使用 AgentOrchestrator${NC}"
    fi
else
    echo -e "${RED}❌ 文件不存在${NC}"
    FAILED_TESTS+=("Agent API 文件")
fi
echo ""

# 检查文件 API
echo -n "检查文件 API 实现 ... "
if [ -f "/Users/chenyubo/Project/harness-project/packages/mint/src/app/api/files/route.ts" ]; then
    echo -e "${GREEN}✅ 文件存在${NC}"

    if grep -q "try {" "/Users/chenyubo/Project/harness-project/packages/mint/src/app/api/files/route.ts" 2>/dev/null; then
        echo -e "  ${GREEN}✅ 包含错误处理${NC}"
    else
        echo -e "  ${YELLOW}⚠️  缺少错误处理${NC}"
        FAILED_TESTS+=("文件 API - 错误处理")
    fi

    if grep -q "projectId" "/Users/chenyubo/Project/harness-project/packages/mint/src/app/api/files/route.ts" 2>/dev/null; then
        echo -e "  ${GREEN}✅ 支持 projectId${NC}"
    fi
else
    echo -e "${RED}❌ 文件不存在${NC}"
    FAILED_TESTS+=("文件 API 文件")
fi
echo ""

# 检查文件面板组件
echo -n "检查文件面板组件 ... "
if [ -f "/Users/chenyubo/Project/harness-project/packages/mint/src/components/file-panel.tsx" ]; then
    echo -e "${GREEN}✅ 文件存在${NC}"

    if grep -q "fetchFiles" "/Users/chenyubo/Project/harness-project/packages/mint/src/components/file-panel.tsx" 2>/dev/null; then
        echo -e "  ${GREEN}✅ 包含文件获取逻辑${NC}"
    fi

    # 检查是否有 projectId 支持
    if grep -q "projectId" "/Users/chenyubo/Project/harness-project/packages/mint/src/components/file-panel.tsx" 2>/dev/null; then
        echo -e "  ${GREEN}✅ 支持 projectId${NC}"
    fi
else
    echo -e "${RED}❌ 文件不存在${NC}"
    FAILED_TESTS+=("文件面板组件")
fi
echo ""

# 5. 环境变量检查
echo -e "${BLUE}5. 环境变量检查${NC}"
echo "-----------------------------------"

check_env() {
    local var="$1"
    local desc="$2"
    echo -n "检查 $var ... "
    if [ -n "${!var}" ]; then
        echo -e "${GREEN}✅ 已设置${NC}"
        echo "  值: ${!var}"
        PASSED_TESTS+=("$var")
    else
        echo -e "${YELLOW}⚠️  未设置${NC}"
        if [ -n "$desc" ]; then
            echo "  说明: $desc"
        fi
        echo "  设置方法: export $var=value"
    fi
}

check_env "ANTHROPIC_API_KEY" "Agent 功能需要此密钥"
check_env "MINT_CWD" "默认工作目录"
check_env "ANTHROPIC_BASE_URL" "API 基础 URL (可选)"
echo ""

# 6. Git 状态检查
echo -e "${BLUE}6. 代码变更检查${NC}"
echo "-----------------------------------"
echo "检查最近修改的文件..."
cd /Users/chenyubo/Project/harness-project
if git diff --name-only HEAD 2>/dev/null | grep -E "(api/agent|api/files|file-panel)" > /dev/null; then
    echo -e "${YELLOW}⚠️  以下相关文件已被修改:${NC}"
    git diff --name-only HEAD 2>/dev/null | grep -E "(api/agent|api/files|file-panel)" | while read file; do
        echo "  - $file"
    done
    echo ""
    echo "建议: 查看这些修改是否引入了问题"
else
    echo -e "${GREEN}✅ 无相关文件修改${NC}"
fi
echo ""

# 7. 生成测试报告
echo -e "${BLUE}7. 测试结果汇总${NC}"
echo "====================================="
echo ""

echo -e "${GREEN}✅ 通过测试: ${#PASSED_TESTS[@]}${NC}"
for test in "${PASSED_TESTS[@]}"; do
    echo "  ✓ $test"
done
echo ""

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
    echo -e "${RED}❌ 失败测试: ${#FAILED_TESTS[@]}${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo "  ✗ $test"
    done
    echo ""
else
    echo -e "${GREEN}🎉 所有测试通过！${NC}"
    echo ""
fi

# 8. 问题汇总
echo -e "${BLUE}8. 发现的问题${NC}"
echo "====================================="
echo ""

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    echo "未发现明显问题"
else
    echo "根据自动化测试，发现以下问题:"
    echo ""

    for test in "${FAILED_TESTS[@]}"; do
        case "$test" in
            *"process.execPath"*)
                echo "🔴 高优先级 - Agent 进程启动问题"
                echo "  问题: 可能导致 'spawn node ENOENT' 错误"
                echo "  位置: /api/agent"
                echo "  建议: 使用 process.execPath 而不是硬编码 'node' 路径"
                echo ""
                ;;
            *"文件 API"*)
                echo "🟡 中优先级 - 文件面板错误"
                echo "  问题: 文件 API 返回 500 错误"
                echo "  位置: /api/files 或 file-panel.tsx"
                echo "  建议: 检查 projectId 验证和错误处理"
                echo ""
                ;;
            *)
                echo "⚠️  $test"
                echo ""
                ;;
        esac
    done
fi

# 9. 手动测试建议
echo -e "${BLUE}9. 手动测试建议${NC}"
echo "====================================="
echo ""
echo "由于浏览器自动化工具不可用，请完成以下手动测试:"
echo ""
cat << 'EOF'
1. 基础访问
   ☐ 访问 http://localhost:3000
   ☐ 打开开发者工具 (F12)
   ☐ 检查 Console 是否有错误

2. 创建工程
   ☐ 点击"新建工程"
   ☐ 输入工程名称
   ☐ 提交并确认创建成功

3. Agent 对话
   ☐ 创建新会话
   ☐ 发送测试消息 "1+1=?"
   ☐ 观察是否正常响应（不是 spawn node ENOENT 错误）
   ☐ 检查 Console 错误

4. 文件面板
   ☐ 点击右侧文件面板
   ☐ 检查是否显示文件树
   ☐ 观察 Network 标签中的 /api/files 请求

5. 会话管理
   ☐ 发送消息后观察标题是否更新
   ☐ 测试删除会话功能（确认对话框）
EOF

echo ""
echo "====================================="
echo "测试完成"
echo "====================================="
echo ""
echo "详细响应已保存到: $TEMP_DIR"
echo "完整验证报告: /Users/chenyubo/Project/harness-project/docs/agent-mode-verification-report.md"
echo ""

# 返回值
if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
    exit 1
else
    exit 0
fi
