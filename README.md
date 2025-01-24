# 硅基 Key 管理系统

一个简单的密钥管理与验证系统。

![image-20250124175602321](https://cdn.jsdelivr.net/gh/zhenxix/blog_img@main/20250124175637107.png)

## 功能特点

- 获取密钥：随机获取一个可用密钥
- 验证密钥：支持批量验证多个密钥
- 复制功能：一键复制有效密钥
- 实时统计：显示剩余密钥数量、使用次数等
- IP 信息：显示访问者 IP 地址和地理位置信息

![image-20250124123903389](https://cdn.jsdelivr.net/gh/zhenxix/blog_img@main/20250124175740760.png)

![image-20250124123949724](https://cdn.jsdelivr.net/gh/zhenxix/blog_img@main/20250124175728060.png)

## 技术栈

- 前端：HTML + CSS + JavaScript
- 样式：Tailwind CSS
- 后端：Node.js + Express

## 配置安装

### 1.Fork仓库

### 2.修改配置文件

修改data/keys.json文件，将需要分享的硅基key填入：

![image-20250124173126413](https://cdn.jsdelivr.net/gh/zhenxix/blog_img@main/20250124175651826.png)

修改data/ip_records.json：设置IP屏蔽；可针对某个IP进行屏蔽：

![image-20250124173138649](https://cdn.jsdelivr.net/gh/zhenxix/blog_img@main/20250124175636006.png)

### 3 git拉取

```bash
git clone https://github.com/你的用户名/siliconflow_Free_KEY.git
```

### 4 npm启动

```bash
cd siliconflow_Free_KEY/
npm install
npm build
nohup npm run dev > dev.log 2>&1 &
```

服务器运行在：http://localhost:3001



### 5 反代

![image-20250124180108274](https://cdn.jsdelivr.net/gh/zhenxix/blog_img@main/20250124180108341.png)

![image-20250124180142922](https://cdn.jsdelivr.net/gh/zhenxix/blog_img@main/20250124180142974.png)

![image-20250124182658034](https://cdn.jsdelivr.net/gh/zhenxix/blog_img@main/20250124182658077.png)

![](https://cdn.jsdelivr.net/gh/zhenxix/blog_img@main/20250124180616175.png)

![image-20250124180452189](https://cdn.jsdelivr.net/gh/zhenxix/blog_img@main/20250124180452239.png)
