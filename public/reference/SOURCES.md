# 参考资源来源与许可

核验日期：2026-10-17。此说明仅覆盖本目录。根目录的 MIT 许可不替代字体、图标或第三方内容的独立许可。

## 字体

这些字体文件来自千星已现公开页面的字体请求；本项目没有修改字体二进制。`core` / `mark` 是来源站提供的子集，不能声称它们与上游完整字体逐字节相同。字体名称和版本由本地 WOFF2 的 name 表读取。

公开版本仅包含下列已附 OFL 许可的 JetBrains Mono 与 Swei Sugar。两个普惠体子集保留在本机参考目录，**不纳入 Git 提交、不由应用引用**；正文改用系统中文无衬线字体。以下普惠体行只记录本机核验结果。

| 文件 | 内嵌名称 / 版本 | 权利与分发状态 |
| --- | --- | --- |
| `JetBrainsMono-Regular.woff2` | JetBrains Mono Regular / 2.305 | Copyright 2020 The JetBrains Mono Project Authors；SIL OFL 1.1，见 `LICENSE-JetBrainsMono.txt`。 |
| `SweiSugar-400-core.woff2` | Swei Spring Sugar CJK SC Regular / 1.061 | 内嵌版权人：Chun Yu Yao。上游 max32002/swei-sugar 以 SIL OFL 1.1 发布，见 `LICENSE-SweiSugar.txt`。 |
| `SweiSugar-400-mark.woff2` | 同上 | 同上；当前应用未引用此子集。 |
| `PuHuiTi-400-core.woff2` | Alibaba PuHuiTi 3.0 55 Regular / 3.01 | Copyright © 2020–2023 Alibaba (China) Co., Ltd. All rights reserved。第三方子集的公开再分发授权尚未核实。 |
| `PuHuiTi-600-core.woff2` | Alibaba PuHuiTi 3.0 75 SemiBold / 3.01 | 同上。 |

字体下载来源：`https://qianxingyixian.com/fonts/` 加对应文件名。公开 URL 本身不是许可。OFL 字体的再分发应保留版权与完整 OFL 文本，字体本身及其衍生版本继续按 OFL 发布。

官方来源：

- JetBrains Mono：https://github.com/JetBrains/JetBrainsMono ，https://www.jetbrains.com/lp/mono/ 。
- 獅尾加糖宋體：https://github.com/max32002/swei-sugar （基于思源宋体；作者声明可按 OFL 修改与传播）。
- 阿里巴巴普惠体：https://www.alibabafonts.com/ 。官网当前脚本 `https://g.alicdn.com/uedmid/fonts-alibabagroup/0.10.4/js/index.js` 指向法律声明 https://www.yuque.com/yiguang-wkqc2/hgpff0/nus9wiinq4aeiegy 。本轮读取了官网与该声明页面元数据，但未获得可核验的完整官方正文，未附第三方转述作为授权。**在确认现有第三方 WOFF2 子集允许再分发之前，不应将这两个 PuHuiTi 文件纳入公开发布包。**

## 图标

- `moon.svg`：与 https://github.com/lucide-icons/lucide/blob/main/icons/moon.svg 的 SVG path 逐字核对一致。原文件通过参考站公开内联图标取得。本目录保留 Lucide 完整许可（ISC 以及其列明的 Feather 衍生图标 MIT 声明）；moon 在衍生名单中，见 `LICENSE-Lucide.txt`。
- `orbit.svg`：公开版本已重新用圆点、椭圆轨道和卫星圆点独立编写；沿用本项目 MIT 许可。此前对参考站图标的描绘仅用于本地视觉观察，未纳入本次公开版本。

## 许可文件快照

以下文件保持官方上游字节原样；固定到该许可文件的最近一次提交。

| 文件 | 固定来源 | SHA-256 |
| --- | --- | --- |
| `LICENSE-JetBrainsMono.txt` | https://raw.githubusercontent.com/JetBrains/JetBrainsMono/61cf0cedc2d9d29efcab968e97707d6899133e68/OFL.txt | `a76abf002c49097d146e86740a3105a5d00450b1592e820a1109a8c5680cd697` |
| `LICENSE-SweiSugar.txt` | https://raw.githubusercontent.com/max32002/swei-sugar/cc68045e975a5ded9e6649ff10b73879187ad6c1/SIL_Open_Font_License_1.1.txt | `e564f06d018e7b95bc3594c96a17f1d41865af4038c375e7aa974dd69df38602` |
| `LICENSE-Lucide.txt` | https://raw.githubusercontent.com/lucide-icons/lucide/e715245d62667c800e7f54c94b1b023692e900a3/LICENSE | `b495047bd93a9b06913511076f504daba17d5bbeb3e0650f3bb53a4220329c57` |

## 本地二进制校验

| 文件 | SHA-256 |
| --- | --- |
| `JetBrainsMono-Regular.woff2` | `b5f7d761a5e66768a394f4f2d28dd3e169edbe5574ee444cba46150c33456679` |
| `PuHuiTi-400-core.woff2` | `53b8b775491a10c0425abc88897d9de0692eab5573f960c31f624d344394cc8a` |
| `PuHuiTi-600-core.woff2` | `80e074785f8eddc2919e872a22086b73cb29ec6bcd49d4252873c08c7a0213e1` |
| `SweiSugar-400-core.woff2` | `bb943b44f98c1875d63b93e5482d8d54e0268ab3d67a6941e5d2bb113322087f` |
| `SweiSugar-400-mark.woff2` | `3a953f64748723ef7fc199b503372dd64bdaa2e43634a1387688a84406a27daa` |
