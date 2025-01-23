const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = 3000;

// 中间件
app.use(express.json());
app.use('/dist', express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

// 文件路径
const KEYS_FILE = path.join(__dirname, 'keys.json');
const USAGE_FILE = path.join(__dirname, 'usage.json');

// 读取密钥
async function loadKeys() {
    try {
        const data = await fs.readFile(KEYS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// 读取使用记录
async function loadUsage() {
    try {
        const data = await fs.readFile(USAGE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { 
            date: getTodayDate(), 
            count: 0,
            verifyCount: 0  // 添加验证次数字段
        };
    }
}

// 保存使用记录
async function saveUsage(usage) {
    await fs.writeFile(USAGE_FILE, JSON.stringify(usage, null, 2));
}

// 获取今天的日期（格式：YYYY-MM-DD）
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// 更新使用记录
async function updateUsage() {
    const usage = await loadUsage();
    const today = getTodayDate();
    
    if (usage.date !== today) {
        // 如果是新的一天，重置计数
        usage.date = today;
        usage.count = 1;
    } else {
        // 增加今日使用计数
        usage.count++;
    }
    
    await saveUsage(usage);
    return usage.count;
}

// 添加更新验证次数的函数
async function updateVerifyCount() {
    const usage = await loadUsage();
    const today = getTodayDate();
    
    if (usage.date !== today) {
        usage.date = today;
        usage.count = 0;
        usage.verifyCount = 1;
    } else {
        usage.verifyCount = (usage.verifyCount || 0) + 1;
    }
    
    await saveUsage(usage);
    return usage.verifyCount;
}

// 获取密钥的API
app.post('/get-key', async (req, res) => {
    try {
        const keys = await loadKeys();
        
        if (keys.length === 0) {
            return res.status(404).json({ error: '密钥已用完' });
        }

        // 随机选择一个密钥
        const randomIndex = Math.floor(Math.random() * keys.length);
        const selectedKey = keys[randomIndex];
        
        // 从数组中移除已分配的密钥
        keys.splice(randomIndex, 1);
        
        // 保存更新后的密钥列表
        await fs.writeFile(KEYS_FILE, JSON.stringify(keys, null, 2));

        // 更新使用记录
        const todayUsage = await updateUsage();

        res.json({ 
            key: selectedKey,
            todayUsage: todayUsage
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取使用统计的API
app.get('/usage-stats', async (req, res) => {
    try {
        const usage = await loadUsage();
        res.json({ 
            date: usage.date,
            count: usage.count,
            verifyCount: usage.verifyCount || 0
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 验证密钥的API
app.post('/verify-key', async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) {
            return res.status(400).json({ error: '请提供密钥' });
        }

        // 更新验证次数
        const verifyCount = await updateVerifyCount();

        const keys = await loadKeys();
        const isValid = keys.includes(key);
        
        if (isValid) {
            res.json({ 
                valid: true, 
                message: '密钥有效',
                verifyCount: verifyCount
            });
        } else {
            res.status(400).json({ 
                error: '无效的密钥',
                verifyCount: verifyCount
            });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 获取密钥数量的API
app.get('/key-count', async (req, res) => {
    try {
        const keys = await loadKeys();
        res.json({ count: keys.length });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
}); 