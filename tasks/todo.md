# 全页面原型一致性任务清单

## Task 1：全局骨架
- [x] 桌面侧栏从视口顶部贯穿底部，顶栏只占工作区。
- [x] 移动顶栏、抽屉和底部导航行为不变。
- 验证：`app-shell` / `header` focused 测试与浏览器尺寸检查。

## Task 2：侧栏视觉
- [x] 对齐品牌位置、导航高度、橙色选中指示、账户分隔线与间距。
- [x] 保留折叠、tooltip、真实用户名和键盘行为。
- 验证：`sidebar` focused 测试与展开/折叠对照。

## Checkpoint：全局框架
- [x] 相关测试通过，桌面与移动无横向溢出。

## Task 3：文件页头部
- [x] 对齐面包屑、标题、项目计数、操作按钮尺寸与纵向位置。
- [x] 保留新建、上传和目录导航行为。
- 验证：`pages-files` focused 测试与 computed styles。

## Task 4：文件工具栏
- [x] 对齐搜索尺寸/填充、排序控件和视图选中态。
- [x] 保留搜索、排序和视图切换行为。
- 验证：`sort-controls` / `pages-files` focused 测试与浏览器对照。

## Task 5：文件列表
- [x] 对齐行高、内边距、图标和文字层级。
- [x] 使用可推导的友好类型，不伪造缺失元数据，并随界面语言切换。
- 验证：`file-row` / `format` focused 测试与列表截图。

## Task 6：文件网格与状态
- [x] 对齐网格卡片、加载骨架、空态和错误态。
- [x] 保留选择、打开、重试和空态操作。
- 验证：`file-card` / `pages-files` focused 测试与状态截图。

## Checkpoint：文件页
- [x] 文件相关测试通过，列表/网格、桌面/移动对照完成。

## Task 7：回收站
- [x] 对齐标题、说明区、记录行、操作按钮和空/错状态。
- [x] 保留恢复冲突与永久删除保护。
- 验证：`pages-trash` focused 测试与页面截图。

## Task 8：设置
- [x] 对齐面板、分区和主题/语言选择控件。
- [x] 保留主题持久化、系统主题和语言切换。
- 验证：`pages-settings` focused 测试与浅色/暗色截图。

## Task 9：预览
- [x] 对齐标题栏、预览主体、尺寸与元信息布局。
- [x] 保留 Escape 关闭和焦点返回。
- 验证：`preview-dialog` focused 测试与可用类型截图。

## Task 10：上传与辅助弹层
- [x] 对齐上传队列、文本抽屉及新建/重命名/冲突弹层，包含移动端。
- [x] 保留重名、未保存和冲突保护。
- 验证：相关 focused 测试与弹层截图。

## Checkpoint：完整验证
- [x] `npm test`、`npm run typecheck`、`npm run lint`、`npm run build` 通过。
- [x] 桌面、390px、暗色、折叠和键盘路径完成浏览器验收。
- [x] 五轴代码审查无未解决的 Critical/Required 问题。
