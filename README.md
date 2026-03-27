# 酒精浓度计算器

基于 Excel 数据表进行酒精浓度校正与换算的前端项目。

## 技术栈

- Vue 3 + `<script setup>`：组件化 UI 与响应式状态管理
- TypeScript：类型约束与开发期提示
- Vite：本地开发与生产构建
- xlsx：在浏览器中读取 Excel 文件、解析工作表与单元格数据
- big.js：高精度小数计算与格式化（避免浮点误差）
- 纯 CSS：界面布局与风格化展示

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

## 开发与构建

首选包管理器为 pnpm。

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
```

## 算法与计算逻辑

### 1. 数据读取与结构化

- 通过 `fetch` 读取 `assets` 中的 Excel 文件，使用 `XLSX.read` 解析
- 将首行作为列坐标（温度），首列作为行坐标（酒精计读数）
- 工作表单元格通过 `XLSX.utils.encode_cell` 进行索引定位

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

- 读取第二张表（体积分数 -> 质量分数）
- 对体积分数进行一维线性插值：

$$
f(x)=y_1+(x-x_1)\cdot\frac{y_2-y_1}{x_2-x_1}
$$

### 5. 精度处理

- 全部插值计算使用 `big.js`，避免浮点误差
- 最终结果保留两位小数输出
