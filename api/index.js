const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 修改文件路径
const KEYS_FILE = path.join(process.cwd(), 'data', 'keys.json');
const USAGE_FILE = path.join(process.cwd(), 'data', 'usage.json');
const IP_RECORDS_FILE = path.join(process.cwd(), 'data', 'ip_records.json');

// 确保数据目录存在
async function ensureDataDir() {
    const dataDir = path.join(process.cwd(), 'data');
    try {
        await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            console.error('Error creating data directory:', error);
        }
    }
}

// 读取密钥
async function loadKeys() {
    try {
        await ensureDataDir();
        // 使用 Buffer 来处理可能的 BOM
        const buffer = await fs.readFile(KEYS_FILE);
        const content = buffer.toString('utf8').replace(/^\uFEFF/, '');
        return JSON.parse(content);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // 如果文件不存在，创建一个空数组
            const emptyArray = [];
            await fs.writeFile(KEYS_FILE, JSON.stringify(emptyArray, null, 2), { encoding: 'utf8' });
            return emptyArray;
        }
        console.error('Error loading keys:', error);
        return [];
    }
}

// 读取使用记录
async function loadUsage() {
    try {
        await ensureDataDir();
        // 使用 Buffer 来处理可能的 BOM
        const buffer = await fs.readFile(USAGE_FILE);
        const content = buffer.toString('utf8').replace(/^\uFEFF/, '');
        return JSON.parse(content);
    } catch (error) {
        const defaultUsage = {
            date: getTodayDate(),
            count: 0,
            verifyCount: 0
        };
        // 如果文件不存在，创建默认配置
        await fs.writeFile(USAGE_FILE, JSON.stringify(defaultUsage, null, 2), { encoding: 'utf8' });
        return defaultUsage;
    }
}

// 获取今天的日期
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// 更新使用记录
async function updateUsage() {
    const usage = await loadUsage();
    const today = getTodayDate();
    
    if (usage.date !== today) {
        usage.date = today;
        usage.count = 1;
    } else {
        usage.count++;
    }
    
    await fs.writeFile(USAGE_FILE, JSON.stringify(usage, null, 2));
    return usage.count;
}

// 修改初始化密钥函数
async function initializeKeys() {
    try {
        await ensureDataDir();
        // 先检查文件是否存在
        try {
            await fs.access(KEYS_FILE);
            console.log('Keys file already exists, skipping initialization');
            return;
        } catch (error) {
            // 文件不存在时才初始化
            if (error.code === 'ENOENT') {
                const keys = [
                    "sk-wcleesounbogvrokxjjzswtiicsltymtfjnrtzqlubzomhzz",
                    "sk-iygqluhnchvvmuoerbjsqymgswgjyitvdzhuekpstsnzgvvg",
                    // ... 其他密钥
                    "sk-ldelcljkrabcobvfcvfwyousiecfcugyncnymqkxxykfnoca"
                ];
                await fs.writeFile(
                    KEYS_FILE, 
                    JSON.stringify(keys, null, 2), 
                    { encoding: 'utf8' }
                );
                console.log('Keys initialized successfully');
            }
        }
    } catch (error) {
        console.error('Error initializing keys:', error);
    }
}

// 添加读取 IP 记录的函数
async function loadIpRecords() {
    try {
        await ensureDataDir();
        const buffer = await fs.readFile(IP_RECORDS_FILE);
        const content = buffer.toString('utf8').replace(/^\uFEFF/, '');
        return JSON.parse(content);
    } catch (error) {
        if (error.code === 'ENOENT') {
            const defaultRecords = { records: {} };
            await fs.writeFile(IP_RECORDS_FILE, JSON.stringify(defaultRecords, null, 2), { encoding: 'utf8' });
            return defaultRecords;
        }
        console.error('Error loading IP records:', error);
        return { records: {} };
    }
}

// 添加检查 IP 的函数
async function checkAndRecordIp(ip) {
    const ipRecords = await loadIpRecords();
    
    // 检查 IP 是否已经申请过
    if (ipRecords.records[ip]) {
        return {
            allowed: false,
            message: '您已经申请过密钥，每个 IP 只能申请一次'
        };
    }

    // 记录新的 IP
    ipRecords.records[ip] = {
        timestamp: Date.now(),
        date: new Date().toISOString()
    };

    // 保存记录
    await fs.writeFile(IP_RECORDS_FILE, JSON.stringify(ipRecords, null, 2), { encoding: 'utf8' });
    return { allowed: true };
}

// API 路由
const handleRequest = async (req, res) => {
    await ensureDataDir();

    // CORS 设置
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { pathname } = new URL(req.url, `http://${req.headers.host}`);

    switch (pathname) {
        case '/api/get-key':
            if (req.method === 'POST') {
                try {
                    // 从请求体获取 IP
                    const { ip } = req.body;
                    
                    if (!ip) {
                        return res.status(400).json({ error: '无法获取 IP 信息' });
                    }

                    // 检查 IP 是否允许申请
                    const ipCheck = await checkAndRecordIp(ip);
                    if (!ipCheck.allowed) {
                        return res.status(403).json({ error: ipCheck.message });
                    }

                    const keys = await loadKeys();
                    if (keys.length === 0) {
                        return res.status(404).json({ error: '密钥已用完' });
                    }

                    const randomIndex = Math.floor(Math.random() * keys.length);
                    const selectedKey = keys[randomIndex];
                    keys.splice(randomIndex, 1);
                    await fs.writeFile(KEYS_FILE, JSON.stringify(keys, null, 2));

                    const todayUsage = await updateUsage();
                    res.json({ key: selectedKey, todayUsage });
                } catch (error) {
                    console.error('Error:', error);
                    res.status(500).json({ error: '服务器错误' });
                }
            }
            break;

        case '/api/verify-key':
            if (req.method === 'POST') {
                try {
                    const { key } = req.body;
                    if (!key) {
                        return res.status(400).json({ error: '请提供密钥' });
                    }

                    // 更新验证次数
                    const usage = await loadUsage();
                    const today = getTodayDate();
                    
                    if (usage.date !== today) {
                        usage.date = today;
                        usage.verifyCount = 1;
                    } else {
                        usage.verifyCount++;
                    }
                    
                    await fs.writeFile(USAGE_FILE, JSON.stringify(usage, null, 2));

                    // 验证密钥格式
                    if (!key.startsWith('sk-') || key.length < 32) {
                        return res.json({ 
                            isValid: false, 
                            message: '无效的密钥格式',
                            verifyCount: usage.verifyCount 
                        });
                    }

                    try {
                        // 验证 API 的可用性
                        const apiResponse = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${key}`,
                                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) CherryStudio/0.8.7 Chrome/120.0.6099.291 Electron/28.3.3 Safari/537.36',
                                'Accept': 'application/json',
                                'Content-Type': 'application/json',
                                'x-api-key': key,
                                'Accept-Language': 'zh-CN'
                            },
                            body: JSON.stringify({
                                "model": "Qwen/Qwen2.5-14B-Instruct",
                                "messages": [{"role": "user", "content": "hi"}],
                                "max_tokens": 100,
                                "stream": false
                            })
                        });

                        if (apiResponse.ok) {
                            // 获取余额信息
                            const balanceResponse = await fetch('https://api.siliconflow.cn/v1/user/info', {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${key}`
                                }
                            });
                            
                            if (balanceResponse.ok) {
                                const balanceData = await balanceResponse.json();
                                const balance = balanceData.data.totalBalance;
                                return res.json({ 
                                    isValid: true,
                                    balance,
                                    verifyCount: usage.verifyCount 
                                });
                            } else {
                                const errorData = await balanceResponse.json();
                                return res.json({ 
                                    isValid: false, 
                                    message: errorData.message || '获取余额失败',
                                    verifyCount: usage.verifyCount 
                                });
                            }
                        } else {
                            const errorData = await apiResponse.json();
                            return res.json({ 
                                isValid: false, 
                                message: errorData.message || 'API 调用失败',
                                verifyCount: usage.verifyCount 
                            });
                        }
                    } catch (error) {
                        console.error('API Error:', error);
                        return res.json({ 
                            isValid: false, 
                            message: `请求失败: ${error.message}`,
                            verifyCount: usage.verifyCount 
                        });
                    }
                } catch (error) {
                    console.error('Error:', error);
                    res.status(500).json({ error: '服务器错误' });
                }
            }
            break;

        case '/api/key-count':
            if (req.method === 'GET') {
                try {
                    const keys = await loadKeys();
                    res.json({ count: keys.length });
                } catch (error) {
                    console.error('Error:', error);
                    res.status(500).json({ error: '服务器错误' });
                }
            }
            break;

        case '/api/usage-stats':
            if (req.method === 'GET') {
                try {
                    const usage = await loadUsage();
                    res.json(usage);
                } catch (error) {
                    console.error('Error:', error);
                    res.status(500).json({ error: '服务器错误' });
                }
            }
            break;

        default:
            res.status(404).json({ error: 'Not found' });
    }
};

// 在服务器启动时调用
if (!process.env.VERCEL) {
    initializeKeys().then(() => {
        // API 路由
        app.post('/api/get-key', handleRequest);
        app.post('/api/verify-key', handleRequest);
        app.get('/api/key-count', handleRequest);
        app.get('/api/usage-stats', handleRequest);

        // 启动服务器
        const server = app.listen(PORT, () => {
            console.log(`服务器运行在 http://localhost:${PORT}`);
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`端口 ${PORT} 已被占用，尝试使用其他端口...`);
                server.listen(PORT + 1);
            } else {
                console.error('服务器启动错误:', err);
            }
        });
    });
}

// Vercel Serverless Function 导出
module.exports = handleRequest;