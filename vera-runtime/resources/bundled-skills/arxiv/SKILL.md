---
name: arxiv
description: '按关键词、作者、分类或 ID 搜索 arXiv 学术论文。'
category: '研究学习'
metadata:
  source: invt-ai-platform
---

# arXiv 学术搜索

通过 arXiv 免费 REST API 搜索并获取学术论文。无需 API 密钥，无需额外依赖——只需 curl。

## 快速参考

| 操作 | 命令 |
|--------|---------|
| 搜索论文 | `curl "https://export.arxiv.org/api/query?search_query=all:QUERY&max_results=5"` |
| 获取指定论文 | `curl "https://export.arxiv.org/api/query?id_list=2402.03300"` |
| 阅读摘要（网页） | `web_extract(urls=["https://arxiv.org/abs/2402.03300"])` |
| 阅读完整论文（PDF） | `web_extract(urls=["https://arxiv.org/pdf/2402.03300"])` |

## 搜索论文

API 返回 Atom XML 格式。使用 `grep`/`sed` 解析，或通过 `python3` 管道输出清洗后的结果。

### 基本搜索

```bash
curl -s "https://export.arxiv.org/api/query?search_query=all:GRPO+reinforcement+learning&max_results=5"
```

### 清洗输出（解析 XML 为可读格式）

```bash
curl -s "https://export.arxiv.org/api/query?search_query=all:GRPO+reinforcement+learning&max_results=5&sortBy=submittedDate&sortOrder=descending" | python3 -c "
import sys, xml.etree.ElementTree as ET
ns = {'a': 'http://www.w3.org/2005/Atom'}
root = ET.parse(sys.stdin).getroot()
for i, entry in enumerate(root.findall('a:entry', ns)):
    title = entry.find('a:title', ns).text.strip().replace('\n', ' ')
    arxiv_id = entry.find('a:id', ns).text.strip().split('/abs/')[-1]
    published = entry.find('a:published', ns).text[:10]
    authors = ', '.join(a.find('a:name', ns).text for a in entry.findall('a:author', ns))
    summary = entry.find('a:summary', ns).text.strip()[:200]
    cats = ', '.join(c.get('term') for c in entry.findall('a:category', ns))
    print(f'{i+1}. [{arxiv_id}] {title}')
    print(f'   Authors: {authors}')
    print(f'   Published: {published} | Categories: {cats}')
    print(f'   Abstract: {summary}...')
    print(f'   PDF: https://arxiv.org/pdf/{arxiv_id}')
    print()
"
```

## 搜索查询语法

| 前缀 | 搜索范围 | 示例 |
|--------|----------|---------|
| `all:` | 所有字段 | `all:transformer+attention` |
| `ti:` | 标题 | `ti:large+language+models` |
| `au:` | 作者 | `au:vaswani` |
| `abs:` | 摘要 | `abs:reinforcement+learning` |
| `cat:` | 分类 | `cat:cs.AI` |
| `co:` | 备注 | `co:accepted+NeurIPS` |

### 布尔运算符

```
# AND（使用 + 时默认逻辑）
search_query=all:transformer+attention

# OR
search_query=all:GPT+OR+all:BERT

# AND NOT
search_query=all:language+model+ANDNOT+all:vision

# 精确短语
search_query=ti:"chain+of+thought"

# 组合查询
search_query=au:hinton+AND+cat:cs.LG
```

## 排序与分页

| 参数 | 可选值 |
|-----------|---------|
| `sortBy` | `relevance`（相关性）, `lastUpdatedDate`（最后更新日期）, `submittedDate`（提交日期） |
| `sortOrder` | `ascending`（升序）, `descending`（降序） |
| `start` | 结果偏移量（从 0 开始） |
| `max_results` | 结果数量（默认 10，最大 30000） |

```bash
# cs.AI 分类下最新 10 篇论文
curl -s "https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=10"
```

## 获取指定论文

```bash
# 按 arXiv ID
curl -s "https://export.arxiv.org/api/query?id_list=2402.03300"

# 多篇论文
curl -s "https://export.arxiv.org/api/query?id_list=2402.03300,2401.12345,2403.00001"
```

## 生成 BibTeX

获取论文元数据后，生成 BibTeX 条目：

{% raw %}
```bash
curl -s "https://export.arxiv.org/api/query?id_list=1706.03762" | python3 -c "
import sys, xml.etree.ElementTree as ET
ns = {'a': 'http://www.w3.org/2005/Atom', 'arxiv': 'http://arxiv.org/schemas/atom'}
root = ET.parse(sys.stdin).getroot()
entry = root.find('a:entry', ns)
if entry is None: sys.exit('Paper not found')
title = entry.find('a:title', ns).text.strip().replace('\n', ' ')
authors = ' and '.join(a.find('a:name', ns).text for a in entry.findall('a:author', ns))
year = entry.find('a:published', ns).text[:4]
raw_id = entry.find('a:id', ns).text.strip().split('/abs/')[-1]
cat = entry.find('arxiv:primary_category', ns)
primary = cat.get('term') if cat is not None else 'cs.LG'
last_name = entry.find('a:author', ns).find('a:name', ns).text.split()[-1]
print(f'@article{{{last_name}{year}_{raw_id.replace(\".\", \"\")},')
print(f'  title     = {{{title}}},')
print(f'  author    = {{{authors}}},')
print(f'  year      = {{{year}}},')
print(f'  eprint    = {{{raw_id}}},')
print(f'  archivePrefix = {{arXiv}},')
print(f'  primaryClass  = {{{primary}}},')
print(f'  url       = {{https://arxiv.org/abs/{raw_id}}}')
print('}')
"
```
{% endraw %}

## 阅读论文内容

找到论文后，按以下方式阅读：

```
# 摘要页（快速获取，含元数据与摘要）
web_extract(urls=["https://arxiv.org/abs/2402.03300"])

# 完整论文（PDF → 通过 Firecrawl 转为 markdown）
web_extract(urls=["https://arxiv.org/pdf/2402.03300"])
```

本地 PDF 处理请参阅 `ocr-and-documents` 技能。

## 常见分类

| 分类 | 领域 |
|----------|-------|
| `cs.AI` | 人工智能 |
| `cs.CL` | 计算与语言（NLP） |
| `cs.CV` | 计算机视觉 |
| `cs.LG` | 机器学习 |
| `cs.CR` | 密码学与安全 |
| `stat.ML` | 机器学习（统计学） |
| `math.OC` | 优化与控制 |
| `physics.comp-ph` | 计算物理学 |

完整列表：https://arxiv.org/category_taxonomy

## 辅助脚本

`scripts/search_arxiv.py` 脚本负责 XML 解析并提供清洗后的输出：

```bash
python scripts/search_arxiv.py "GRPO reinforcement learning"
python scripts/search_arxiv.py "transformer attention" --max 10 --sort date
python scripts/search_arxiv.py --author "Yann LeCun" --max 5
python scripts/search_arxiv.py --category cs.AI --sort date
python scripts/search_arxiv.py --id 2402.03300
python scripts/search_arxiv.py --id 2402.03300,2401.12345
```

零依赖——仅使用 Python 标准库。

---

## Semantic Scholar（引用、相关论文、作者主页）

arXiv 不提供引用数据或推荐功能。使用 **Semantic Scholar API** 来获取这些——免费，基础使用无需密钥（1 请求/秒），返回 JSON 格式。

### 获取论文详情 + 引用数据

```bash
# 按 arXiv ID
curl -s "https://api.semanticscholar.org/graph/v1/paper/arXiv:2402.03300?fields=title,authors,citationCount,referenceCount,influentialCitationCount,year,abstract" | python3 -m json.tool

# 按 Semantic Scholar 论文 ID 或 DOI
curl -s "https://api.semanticscholar.org/graph/v1/paper/DOI:10.1234/example?fields=title,citationCount"
```

### 获取某篇论文的引用（谁引用了它）

```bash
curl -s "https://api.semanticscholar.org/graph/v1/paper/arXiv:2402.03300/citations?fields=title,authors,year,citationCount&limit=10" | python3 -m json.tool
```

### 获取某篇论文的参考文献（它引用了什么）

```bash
curl -s "https://api.semanticscholar.org/graph/v1/paper/arXiv:2402.03300/references?fields=title,authors,year,citationCount&limit=10" | python3 -m json.tool
```

### 搜索论文（arXiv 搜索的替代方案，返回 JSON）

```bash
curl -s "https://api.semanticscholar.org/graph/v1/paper/search?query=GRPO+reinforcement+learning&limit=5&fields=title,authors,year,citationCount,externalIds" | python3 -m json.tool
```

### 获取论文推荐

```bash
curl -s -X POST "https://api.semanticscholar.org/recommendations/v1/papers/" \
  -H "Content-Type: application/json" \
  -d '{"positivePaperIds": ["arXiv:2402.03300"], "negativePaperIds": []}' | python3 -m json.tool
```

### 作者主页

```bash
curl -s "https://api.semanticscholar.org/graph/v1/author/search?query=Yann+LeCun&fields=name,hIndex,citationCount,paperCount" | python3 -m json.tool
```

### Semantic Scholar 常用字段

`title`（标题）、`authors`（作者）、`year`（年份）、`abstract`（摘要）、`citationCount`（引用数）、`referenceCount`（参考文献数）、`influentialCitationCount`（有影响力的引用数）、`isOpenAccess`（是否开放获取）、`openAccessPdf`（开放获取 PDF）、`fieldsOfStudy`（研究领域）、`publicationVenue`（发表渠道）、`externalIds`（包含 arXiv ID、DOI 等）

---

## 完整研究流程

1. **发现论文**：`python scripts/search_arxiv.py "你的主题" --sort date --max 10`
2. **评估影响力**：`curl -s "https://api.semanticscholar.org/graph/v1/paper/arXiv:ID?fields=citationCount,influentialCitationCount"`
3. **阅读摘要**：`web_extract(urls=["https://arxiv.org/abs/ID"])`
4. **阅读全文**：`web_extract(urls=["https://arxiv.org/pdf/ID"])`
5. **查找相关工作**：`curl -s "https://api.semanticscholar.org/graph/v1/paper/arXiv:ID/references?fields=title,citationCount&limit=20"`
6. **获取推荐**：POST 到 Semantic Scholar 推荐接口
7. **追踪作者**：`curl -s "https://api.semanticscholar.org/graph/v1/author/search?query=姓名"`

## 速率限制

| API | 速率 | 认证 |
|-----|------|------|
| arXiv | 约 1 请求 / 3 秒 | 无需 |
| Semantic Scholar | 1 请求 / 秒 | 无需（使用 API 密钥可达 100/秒） |

## 注意事项

- arXiv 返回 Atom XML 格式——使用辅助脚本或解析代码片段获得清洗后的输出
- Semantic Scholar 返回 JSON——通过 `python3 -m json.tool` 管道输出以提高可读性
- arXiv ID：旧格式（`hep-th/0601001`）vs 新格式（`2402.03300`）
- PDF：`https://arxiv.org/pdf/{id}` — 摘要：`https://arxiv.org/abs/{id}`
- HTML（如有）：`https://arxiv.org/html/{id}`
- 本地 PDF 处理请参阅 `ocr-and-documents` 技能

## ID 版本说明

- `arxiv.org/abs/1706.03762` 始终解析到**最新**版本
- `arxiv.org/abs/1706.03762v1` 指向某个**特定**的不可变版本
- 生成引用时，请保留你实际阅读的版本后缀，以防止引用漂移（后续版本可能大幅修改内容）
- API 中的 `<id>` 字段返回带版本号的 URL（如 `http://arxiv.org/abs/1706.03762v7`）

## 撤回论文

论文提交后可能会被撤回。此时：
- `<summary>` 字段中包含撤回通知（查找 "withdrawn" 或 "retracted"）
- 元数据字段可能不完整
- 在将结果视为有效论文之前，务必先检查摘要
