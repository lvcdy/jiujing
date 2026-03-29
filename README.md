# 酒精浓度计算器

基于 Excel 数据表，根据酒精计读数和当前温度，自动计算校正至 20℃ 标准状态下的**体积分数**与**质量分数**的桌面/网页工具。

> 适用于酿造、检测、销售等场景中对酒精浓度进行温度校正与单位换算的日常需求。

---

## 功能特性

- 📊 输入酒精计读数与当前温度，一键计算 20℃ 标准浓度
- 🔢 同时输出**体积分数**（% vol）与**质量分数**（% m）
- 🌐 支持**中英文**界面切换（i18next 国际化）
- ⌨️ 完整的**键盘快捷键**支持，操作高效流畅
- 🖥️ 支持打包为 **Electron** 或 **Tauri** 桌面应用（Windows）
- 🎯 全程使用 `big.js` 高精度计算，避免浮点误差

---

## 技术栈

| 类别 | 技术 |
|------|------|
| UI 框架 | React 19 + TypeScript |
| 构建工具 | Vite |
| 桌面封装 | Electron 41 / Tauri 2 |
| Excel 解析 | xlsx |
| 高精度计算 | big.js |
| 国际化 | i18next + react-i18next |
| 样式 | 纯 CSS |

---

## 环境要求

- **Node.js** 18 或 20（推荐使用 LTS 版本）
- **pnpm**（推荐）或 npm / yarn
- 打包 Tauri 版本时还需要安装 [Rust 工具链](https://www.rust-lang.org/tools/install)

---

## 安装与启动

```bash
# 安装依赖
pnpm install

# 启动网页开发服务器（浏览器预览）
pnpm dev

# 启动 Electron 桌面应用（开发模式）
pnpm electron:dev

# 构建网页产物
pnpm build

# 构建 Electron 桌面安装包（Windows zip）
pnpm electron:dist

# 构建 Tauri 桌面安装包（Windows NSIS）
pnpm tauri build

# 预览构建产物
pnpm preview
```

---

## 使用说明

1. 打开应用后，在**酒精计读数**输入框中输入酒精计示数（单位 %）
2. 在**当前温度**输入框中输入测量时的环境温度（单位 ℃）
3. 点击「**开始计算**」按钮或按 `Enter` 键
4. 结果区域将显示校正至 20℃ 的**标准体积分数**与**质量分数**

### 键盘快捷键

| 按键 | 说明 |
|------|------|
| `Enter` | 两个输入框均有值时直接计算；仅酒精计有值时跳转至温度输入框 |
| `Tab` | 在输入框之间切换焦点 |
| `Esc` | 清空当前输入框内容 |
| `Ctrl + A` | 全选当前输入框内容 |

---

## 国际化

应用支持**简体中文**与**英文**两种语言，可在界面右上角通过下拉菜单切换，语言设置会保存到 `localStorage`。

语言文件位于 `src/i18n/locales/`：

```
src/i18n/locales/
├── zh-CN.ts   # 简体中文
└── en-US.ts   # 英文
```

---

## 项目结构

```
jiujing/
├── src/
│   ├── assets/          # Excel 数据文件（jiujing.xlsx、wendu.xlsx）
│   ├── components/
│   │   ├── Calculator.tsx   # 主计算器组件
│   │   └── Calculator.css   # 组件样式
│   ├── i18n/
│   │   ├── index.ts         # i18next 初始化
│   │   └── locales/         # 语言包（zh-CN / en-US）
│   ├── utils/
│   │   └── excel.ts         # Excel 加载、缓存与插值计算
│   └── main.tsx             # 应用入口
├── electron/
│   └── main.js              # Electron 主进程
├── src-tauri/               # Tauri 配置与 Rust 代码
├── public/                  # 静态资源
├── index.html
├── vite.config.ts
└── package.json
```

---

## 算法与计算逻辑

### 1. 数据读取与结构化

- 通过 `fetch` 读取 `assets` 中的 Excel 文件，使用 `XLSX.read` 解析
- 将首行作为列坐标（温度），首列作为行坐标（酒精计读数）
- 工作表单元格通过 `XLSX.utils.encode_cell` 进行索引定位
- 解析结果缓存于内存 `Map` 中，避免重复加载

### 2. 坐标定位（二分查找）

- 目标输入为：酒精计读数与温度
- 对行坐标与列坐标分别做二分查找，找出目标值两侧的索引区间
- 支持坐标升序或降序的表格
- 若目标值超出边界，退化为最近边界值

### 3. 双线性插值（体积分数）

- 取四个角点：$v_{11}$、$v_{12}$、$v_{21}$、$v_{22}$
- 若行或列出现同值，退化为一维线性插值
- 双线性插值公式：

$$
f(x, y)=(1-t_x)(1-t_y)v_{11}+t_x(1-t_y)v_{12}+(1-t_x)t_y v_{21}+t_x t_y v_{22}
$$

其中：
- $t_x=(x-x_1)/(x_2-x_1)$，$t_y=(y-y_1)/(y_2-y_1)$

### 4. 一维线性插值（质量分数）

- 读取第二张表（体积分数 → 质量分数）
- 对体积分数进行一维线性插值：

$$
f(x)=y_1+(x-x_1)\cdot\frac{y_2-y_1}{x_2-x_1}
$$

### 5. 精度处理

- 全部插值计算使用 `big.js`，避免浮点误差
- 最终结果保留两位小数输出

---

## big.js 说明

`big.js` 是一个高精度小数计算库，用来避免 JavaScript 原生 `number` 的浮点误差（例如 `0.1 + 0.2 !== 0.3`）。它适合金额、浓度、比例等需要稳定舍入与可控精度的场景。

### 核心特点

- 十进制高精度：内部以十进制表示，避免二进制浮点误差
- API 简洁：提供加减乘除、比较、取整、格式化等常用操作
- 可配置精度与舍入方式：通过 `Big.DP` 与 `Big.RM` 控制结果

### 基础用法

```ts
import Big from "big.js";

const a = new Big("0.1");
const b = new Big("0.2");

const c = a.plus(b);        // 0.3
const d = a.times("3");     // 0.3

console.log(c.toString());  // "0.3"
```

### 精度与舍入

```ts
import Big from "big.js";

Big.DP = 10; // 小数位精度 (Decimal Places)
Big.RM = 1;  // 舍入模式 (0: RoundDown, 1: RoundHalfUp, 2: RoundHalfEven, 3: RoundUp)

const x = new Big("1").div("3");
console.log(x.toString());  // "0.3333333333"
```

### 比较

```ts
import Big from "big.js";

const a = new Big("2.50");
const b = new Big("2.5");

console.log(a.eq(b)); // true
console.log(a.gt(b)); // false
console.log(a.lt(b)); // false
```

### 在本项目中的使用

- 输入值与表格数值会先转换为 `Big` 实例，避免中间计算出现浮点误差
- 线性插值与双线性插值过程用 `Big` 的加减乘除完成，保证结果稳定
- 输出阶段再统一做精度处理（保留两位小数），避免早期舍入带来累积误差

---

## License

本项目仅供学习与个人使用。
